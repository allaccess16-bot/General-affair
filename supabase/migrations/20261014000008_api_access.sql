-- =====================================================================
-- 0008 화면(REST API) 연결용 권한 · 보조 함수
--   권한·RLS 정책은 현재 범위 제외 → 화면에서 쓰는 anon/authenticated 역할에 읽기·쓰기 허용
--   (운영 전 RLS 마이그레이션으로 대체 예정)
-- =====================================================================

-- 예약코드로 내 예약 찾기 (코드 해시는 화면에 노출하지 않음)
create or replace function meeting.find_reservations_by_code(p_manage_code text)
returns setof uuid language sql stable as $$
  select id from meeting.reservations where manage_code_hash = meeting.hash_code(p_manage_code);
$$;

-- 회의실 관리자: 강제취소 / 반복 전체취소 / 운영중지
create or replace function meeting.admin_cancel_reservation(p_reservation_id uuid)
returns void language sql as $$
  update meeting.reservations set status = 'cancelled', cancelled_at = now(), cancel_reason = 'admin_cancelled'
   where id = p_reservation_id and status in ('reserved','checked_in');
$$;

create or replace function meeting.admin_cancel_series(p_series_id uuid)
returns int language plpgsql as $$
declare n int;
begin
  update meeting.reservations set status = 'cancelled', cancelled_at = now(), cancel_reason = 'admin_series_cancelled'
   where series_id = p_series_id and status in ('reserved','checked_in') and end_at > now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 차량 예약 수정 (신청 상태만, 겹침은 EXCLUDE 제약이 차단)
create or replace function vehicle.update_reservation(
  p_id uuid, p_password text, p_vehicle_number text, p_start_at timestamptz, p_end_at timestamptz,
  p_purpose text, p_destination text, p_driver text, p_contact text
) returns void language plpgsql as $$
declare r vehicle.reservations;
begin
  select * into r from vehicle.reservations where id = p_id for update;
  if not found or r.status <> '신청' then raise exception 'NOT_EDITABLE: 이미 승인 또는 처리된 예약은 수정할 수 없습니다.' using errcode = 'P0001'; end if;
  if coalesce(r.reservation_password, '') <> coalesce(p_password, '') then raise exception 'INVALID_PASSWORD: 비밀번호가 일치하지 않습니다.' using errcode = 'P0001'; end if;
  update vehicle.reservations
     set vehicle_number = p_vehicle_number, start_at = p_start_at, end_at = p_end_at,
         purpose = p_purpose, destination = p_destination, driver = p_driver, contact = p_contact
   where id = p_id;
exception
  when exclusion_violation then
    raise exception 'VEHICLE_CONFLICT: 선택한 차량의 기존 예약 시간과 겹칩니다.' using errcode = 'P0001';
end;
$$;

-- 운행 완료 기록 (승인 상태, 예약 비밀번호 확인)
create or replace function vehicle.complete_reservation(
  p_id uuid, p_password text, p_complete_department text, p_complete_name text,
  p_odometer_before int, p_odometer_after int, p_fuel_cost int, p_parking_cost int, p_etc_cost int, p_memo text
) returns void language plpgsql as $$
declare r vehicle.reservations;
begin
  select * into r from vehicle.reservations where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: 예약 정보를 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  if r.reservation_password is not null and r.reservation_password <> coalesce(p_password, '') then
    raise exception 'INVALID_PASSWORD: 비밀번호가 일치하지 않습니다.' using errcode = 'P0001';
  end if;
  update vehicle.reservations
     set status = '사용완료', complete_department = core.normalize_department(p_complete_department), complete_name = p_complete_name,
         odometer_before = p_odometer_before, odometer_after = p_odometer_after,
         fuel_cost = coalesce(p_fuel_cost, 0), parking_cost = coalesce(p_parking_cost, 0), etc_cost = coalesce(p_etc_cost, 0),
         complete_memo = p_memo, completed_at = now()
   where id = p_id;
end;
$$;

-- 총무 요청 수정 (수정 비밀번호 확인 후 제목·상세·위치만)
create or replace function ga.edit_request(p_id uuid, p_password text, p_title text, p_description text, p_location text)
returns void language plpgsql as $$
declare r ga.requests;
begin
  select * into r from ga.requests where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: 요청 정보를 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  if coalesce(r.edit_password, '') <> coalesce(p_password, '') then raise exception 'INVALID_PASSWORD: 비밀번호가 일치하지 않습니다.' using errcode = 'P0001'; end if;
  update ga.requests set title = p_title, description = p_description, location = p_location where id = p_id;
end;
$$;

-- 신청 시 부서명 통일 (총무)
create or replace function ga.normalize_row()
returns trigger language plpgsql as $$
begin
  new.department := core.normalize_department(new.department);
  return new;
end;
$$;
create trigger ga_requests_normalize before insert or update of department on ga.requests
  for each row execute function ga.normalize_row();

-- ---------- API 역할 권한 ----------
-- extensions 스키마(digest·btree_gist) 사용 권한 — Supabase에는 기본 부여되어 있으나 명시
grant usage on schema extensions to anon, authenticated, service_role;
do $$
declare s text;
begin
  foreach s in array array['core','ga','vehicle','meeting','seal'] loop
    execute format('grant usage on schema %I to anon, authenticated, service_role', s);
    execute format('grant select, insert, update, delete on all tables in schema %I to anon, authenticated, service_role', s);
    execute format('grant usage, select on all sequences in schema %I to anon, authenticated, service_role', s);
    execute format('grant execute on all functions in schema %I to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant usage, select on sequences to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant execute on functions to anon, authenticated, service_role', s);
  end loop;
end;
$$;

-- 감사 로그·처리 이력은 추가만 (화면에서 수정·삭제 권한 회수)
revoke update, delete on core.audit_logs from anon, authenticated;
revoke update, delete on seal.request_history from anon, authenticated;

-- PostgREST 스키마 캐시 갱신
notify pgrst, 'reload schema';
