-- =====================================================================
-- 0010 직원 로그인 · 관리자 권한 · 행 보안(RLS)
--
-- 구조
--   · 로그인: Supabase Auth (이메일 + 비밀번호)
--   · 가입 → core.profiles 자동 생성(승인대기) → 관리자가 승인해야 이용 가능
--     (가입한 첫 사용자는 최고관리자로 자동 승인 — 초기 설정용)
--   · 권한: role = 'user' | 'admin'
--           admin_modules = '{}'  → 전 모듈 관리자(최고관리자: 사용자 관리 가능)
--           admin_modules = '{seal}' 등 → 해당 모듈만 관리
--   · 모든 업무 표에 RLS: 비로그인(anon) 차단, 승인된 직원만 조회·신청,
--     처리(승인·상태변경·삭제)는 해당 모듈 관리자만
--   · 비밀번호·예약코드 해시 컬럼은 화면에서 읽을 수 없게 컬럼 권한 제한
--   · 기존 비밀번호/예약코드 방식은 이관 데이터 호환을 위해 유지 (본인 건은 비밀번호 없이 처리)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 직원 프로필 · 운영 설정
-- ---------------------------------------------------------------------
create table if not exists core.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  name           text not null,
  department     text not null,
  contact        text not null default '',
  role           text not null default 'user' check (role in ('user','admin')),
  admin_modules  text[] not null default '{}' check (admin_modules <@ array['ga','vehicle','meeting','seal']::text[]),
  status         text not null default 'pending' check (status in ('pending','active','disabled')),
  approved_by    uuid references core.profiles(id) on delete set null,
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists profiles_touch on core.profiles;
create trigger profiles_touch before update on core.profiles for each row execute function core.touch_updated_at();

create table if not exists core.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into core.settings (key, value) values
  ('auto_approve', 'false'::jsonb),            -- true: 가입 즉시 이용 (승인 절차 생략)
  ('allowed_email_domains', '[]'::jsonb)       -- 예: ["hanafn.com"] — 비어 있으면 모든 메일 가입 허용(관리자 승인으로 통제)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2. 권한 판정 함수 (RLS 정책·RPC 공통)
-- ---------------------------------------------------------------------
create or replace function core.is_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.profiles p where p.id = auth.uid() and p.status = 'active');
$$;

-- p_module 이 null 이면 '전 모듈 관리자(최고관리자)'인지 확인
create or replace function core.is_admin(p_module text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from core.profiles p
     where p.id = auth.uid() and p.status = 'active' and p.role = 'admin'
       and (cardinality(p.admin_modules) = 0 or (p_module is not null and p_module = any (p.admin_modules)))
  );
$$;

create or replace function core.my_name()
returns text language sql stable security definer set search_path = '' as $$
  select p.name from core.profiles p where p.id = auth.uid();
$$;

create or replace function core.require_active()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not core.is_active() then
    raise exception 'NOT_AUTHORIZED: 로그인 후 관리자 승인을 받은 직원만 이용할 수 있습니다.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function core.require_admin(p_module text default null)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not core.is_admin(p_module) then
    raise exception 'NOT_ADMIN: 관리자 권한이 필요합니다.' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. 가입 시 프로필 자동 생성
-- ---------------------------------------------------------------------
create or replace function core.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  domains jsonb := coalesce((select s.value from core.settings s where s.key = 'allowed_email_domains'), '[]'::jsonb);
  auto boolean := coalesce((select (s.value)::text::boolean from core.settings s where s.key = 'auto_approve'), false);
  first_user boolean := not exists (select 1 from core.profiles p where p.role = 'admin' and p.status = 'active');
  dom text := lower(split_part(coalesce(new.email, ''), '@', 2));
begin
  if jsonb_array_length(domains) > 0 and not exists (select 1 from jsonb_array_elements_text(domains) d where lower(d) = dom) then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED: 회사 메일로만 가입할 수 있습니다.' using errcode = 'P0001';
  end if;
  insert into core.profiles (id, email, name, department, contact, role, status, approved_at)
  values (
    new.id, lower(new.email),
    coalesce(nullif(btrim(meta->>'name'), ''), split_part(new.email, '@', 1)),
    core.normalize_department(coalesce(nullif(btrim(meta->>'department'), ''), '미지정')),
    coalesce(btrim(meta->>'contact'), ''),
    case when first_user then 'admin' else 'user' end,
    case when first_user or auto then 'active' else 'pending' end,
    case when first_user or auto then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function core.handle_new_user();

-- 내 정보 수정 (이름·부서·연락처)
create or replace function core.update_my_profile(p_name text, p_department text, p_contact text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHORIZED' using errcode = 'P0001'; end if;
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_department), '') = '' then
    raise exception 'PROFILE_REQUIRED: 이름과 부서를 입력해주세요.' using errcode = 'P0001';
  end if;
  update core.profiles set name = btrim(p_name), department = core.normalize_department(p_department), contact = btrim(coalesce(p_contact, ''))
   where id = auth.uid();
end;
$$;

-- 최고관리자: 직원 승인 · 권한 변경 · 이용 중지
create or replace function core.admin_update_profile(p_id uuid, p_status text, p_role text, p_admin_modules text[])
returns void language plpgsql security definer set search_path = '' as $$
declare r core.profiles;
begin
  perform core.require_admin(null);
  select * into r from core.profiles where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: 직원 정보를 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  -- 마지막 최고관리자는 강등·중지 불가
  if r.role = 'admin' and cardinality(r.admin_modules) = 0 and r.status = 'active'
     and (p_status <> 'active' or p_role <> 'admin' or cardinality(coalesce(p_admin_modules, '{}')) > 0)
     and not exists (select 1 from core.profiles x where x.id <> p_id and x.role = 'admin' and x.status = 'active' and cardinality(x.admin_modules) = 0) then
    raise exception 'LAST_ADMIN: 최고관리자가 최소 1명은 있어야 합니다.' using errcode = 'P0001';
  end if;
  update core.profiles
     set status = p_status, role = p_role,
         admin_modules = case when p_role = 'admin' then coalesce(p_admin_modules, '{}') else '{}' end,
         approved_by = case when r.status <> 'active' and p_status = 'active' then auth.uid() else approved_by end,
         approved_at = case when r.status <> 'active' and p_status = 'active' then now() else approved_at end
   where id = p_id;
  insert into core.audit_logs (module_key, entity, entity_id, action, actor, before_data, after_data)
  values ('core', 'profile', p_id::text, 'profile_update', core.my_name(),
          jsonb_build_object('status', r.status, 'role', r.role, 'admin_modules', r.admin_modules),
          jsonb_build_object('email', r.email, 'status', p_status, 'role', p_role, 'admin_modules', p_admin_modules));
end;
$$;

create or replace function core.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform core.require_admin(null);
  if p_key not in ('auto_approve', 'allowed_email_domains') then raise exception 'INVALID_SETTING' using errcode = 'P0001'; end if;
  insert into core.settings (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- 4. 작성자(본인) 컬럼 — 새로 만드는 건은 로그인한 직원으로 자동 기록
-- ---------------------------------------------------------------------
alter table ga.requests          add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table vehicle.reservations add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table meeting.reservations add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table seal.requests        add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------
-- 5. RPC 보강 — 권한 확인 후 실행 (security definer)
-- ---------------------------------------------------------------------
-- 총무: 본인·관리자는 비밀번호 없이, 이관 데이터는 기존 수정 비밀번호로
create or replace function ga.edit_request(p_id uuid, p_password text, p_title text, p_description text, p_location text)
returns void language plpgsql security definer set search_path = '' as $$
declare r ga.requests;
begin
  perform core.require_active();
  select * into r from ga.requests where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: 요청 정보를 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  if not (coalesce(r.created_by = auth.uid(), false) or core.is_admin('ga')) and coalesce(r.edit_password, '') <> coalesce(p_password, '') then
    raise exception 'INVALID_PASSWORD: 비밀번호가 일치하지 않습니다.' using errcode = 'P0001';
  end if;
  update ga.requests set title = p_title, description = p_description, location = p_location where id = p_id;
end;
$$;

-- 차량
create or replace function vehicle.create_reservation(
  p_vehicle_number text, p_start_at timestamptz, p_end_at timestamptz,
  p_applicant text, p_department text, p_contact text, p_driver text,
  p_password text, p_purpose text, p_destination text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform core.require_active();
  insert into vehicle.reservations (vehicle_number, start_at, end_at, applicant, department, contact, driver, reservation_password, purpose, destination, created_by)
  values (p_vehicle_number, p_start_at, p_end_at, p_applicant, core.normalize_department(p_department), p_contact, p_driver, nullif(p_password, ''), p_purpose, p_destination, auth.uid())
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then
    raise exception 'VEHICLE_CONFLICT: 선택한 차량의 기존 예약 시간과 겹칩니다.' using errcode = 'P0001';
end;
$$;

create or replace function vehicle.can_manage(r vehicle.reservations, p_password text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(r.created_by = auth.uid(), false) or core.is_admin('vehicle')
      or (r.reservation_password is not null and r.reservation_password = coalesce(p_password, ''))
      -- 이관 데이터 중 비밀번호 없이 등록된 건(작성자 정보 없음)은 기존 방식대로 허용
      or (r.created_by is null and r.reservation_password is null);
$$;

create or replace function vehicle.update_reservation(
  p_id uuid, p_password text, p_vehicle_number text, p_start_at timestamptz, p_end_at timestamptz,
  p_purpose text, p_destination text, p_driver text, p_contact text
) returns void language plpgsql security definer set search_path = '' as $$
declare r vehicle.reservations;
begin
  perform core.require_active();
  select * into r from vehicle.reservations where id = p_id for update;
  if not found or r.status <> '신청' then raise exception 'NOT_EDITABLE: 이미 승인 또는 처리된 예약은 수정할 수 없습니다.' using errcode = 'P0001'; end if;
  if not vehicle.can_manage(r, p_password) then raise exception 'INVALID_PASSWORD: 비밀번호가 일치하지 않습니다.' using errcode = 'P0001'; end if;
  update vehicle.reservations
     set vehicle_number = p_vehicle_number, start_at = p_start_at, end_at = p_end_at,
         purpose = p_purpose, destination = p_destination, driver = p_driver, contact = p_contact
   where id = p_id;
exception
  when exclusion_violation then
    raise exception 'VEHICLE_CONFLICT: 선택한 차량의 기존 예약 시간과 겹칩니다.' using errcode = 'P0001';
end;
$$;

create or replace function vehicle.complete_reservation(
  p_id uuid, p_password text, p_complete_department text, p_complete_name text,
  p_odometer_before int, p_odometer_after int, p_fuel_cost int, p_parking_cost int, p_etc_cost int, p_memo text
) returns void language plpgsql security definer set search_path = '' as $$
declare r vehicle.reservations;
begin
  perform core.require_active();
  select * into r from vehicle.reservations where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: 예약 정보를 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  if not vehicle.can_manage(r, p_password) then
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

-- 회의실
create or replace function meeting.create_reservation(
  p_room_id text, p_title text, p_organizer_name text, p_department text,
  p_attendee_count int, p_start_at timestamptz, p_end_at timestamptz, p_manage_code text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform core.require_active();
  insert into meeting.reservations (room_id, title, organizer_name, department, attendee_count, start_at, end_at, manage_code_hash, created_by)
  values (p_room_id, p_title, p_organizer_name, core.normalize_department(p_department), p_attendee_count, p_start_at, p_end_at, meeting.hash_code(p_manage_code), auth.uid())
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then
    raise exception 'RESERVATION_CONFLICT: 이미 예약된 시간입니다.' using errcode = 'P0001';
end;
$$;

-- 반복예약: 기존 함수 본문을 그대로 쓰되 권한 확인 + 작성자 기록 (래퍼)
do $$
begin
  if to_regprocedure('meeting.create_recurring_reservations_core(text, text, text, text, int, date, date, int[], time, time, text)') is null then
    alter function meeting.create_recurring_reservations(text, text, text, text, int, date, date, int[], time, time, text)
      rename to create_recurring_reservations_core;
  end if;
end $$;
revoke all on function meeting.create_recurring_reservations_core(text, text, text, text, int, date, date, int[], time, time, text) from public, anon, authenticated;

create or replace function meeting.create_recurring_reservations(
  p_room_id text, p_title text, p_organizer_name text, p_department text, p_attendee_count int,
  p_start_date date, p_end_date date, p_weekdays int[], p_start_time time, p_end_time time, p_manage_code text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  perform core.require_active();
  res := meeting.create_recurring_reservations_core(p_room_id, p_title, p_organizer_name, p_department, p_attendee_count,
                                                    p_start_date, p_end_date, p_weekdays, p_start_time, p_end_time, p_manage_code);
  if res->>'status' = 'created' then
    update meeting.reservations set created_by = auth.uid()
     where id in (select (jsonb_array_elements_text(res->'created_ids'))::uuid);
  end if;
  return res;
end;
$$;

create or replace function meeting.can_manage(r meeting.reservations, p_manage_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(r.created_by = auth.uid(), false) or core.is_admin('meeting')
      or (coalesce(p_manage_code, '') <> '' and r.manage_code_hash = meeting.hash_code(p_manage_code));
$$;

create or replace function meeting.manage_reservation(p_reservation_id uuid, p_manage_code text, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare r meeting.reservations;
begin
  perform core.require_active();
  select * into r from meeting.reservations where id = p_reservation_id for update;
  if not found or not meeting.can_manage(r, p_manage_code) then raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;
  if r.status not in ('reserved','checked_in') then raise exception 'NOT_ACTIVE' using errcode = 'P0001'; end if;
  if p_action = 'checkin' then
    if r.status <> 'reserved' then raise exception 'ALREADY_CHECKED_IN' using errcode = 'P0001'; end if;
    if now() < r.start_at then raise exception 'CHECKIN_TOO_EARLY' using errcode = 'P0001'; end if;
    if now() > r.start_at + interval '10 minutes' then raise exception 'CHECKIN_EXPIRED' using errcode = 'P0001'; end if;
    update meeting.reservations set status = 'checked_in', checked_in_at = now() where id = r.id;
  elsif p_action = 'cancel' then
    update meeting.reservations set status = 'cancelled', cancelled_at = now(), cancel_reason = 'user_cancelled' where id = r.id;
  else
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function meeting.manage_reservation_series(p_series_id uuid, p_manage_code text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform core.require_active();
  update meeting.reservations r
     set status = 'cancelled', cancelled_at = now(), cancel_reason = 'series_cancelled'
   where r.series_id = p_series_id and meeting.can_manage(r, p_manage_code)
     and r.status in ('reserved','checked_in') and r.end_at > now();
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function meeting.find_reservations_by_code(p_manage_code text)
returns setof uuid language plpgsql stable security definer set search_path = '' as $$
begin
  perform core.require_active();
  return query select r.id from meeting.reservations r where r.manage_code_hash = meeting.hash_code(p_manage_code);
end;
$$;

-- 로그인 직원 본인 예약 (예약코드 없이 '내 예약'에 표시)
create or replace function meeting.my_reservation_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select r.id from meeting.reservations r where r.created_by = auth.uid() and core.is_active();
$$;

create or replace function meeting.admin_cancel_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform core.require_admin('meeting');
  update meeting.reservations set status = 'cancelled', cancelled_at = now(), cancel_reason = 'admin_cancelled'
   where id = p_reservation_id and status in ('reserved','checked_in');
end;
$$;

create or replace function meeting.admin_cancel_series(p_series_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform core.require_admin('meeting');
  update meeting.reservations set status = 'cancelled', cancelled_at = now(), cancel_reason = 'admin_series_cancelled'
   where series_id = p_series_id and status in ('reserved','checked_in') and end_at > now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 인장: 검토·승인·반려·날인은 인장 관리자, 취소는 본인 또는 관리자. 처리자 이름은 로그인 정보로 기록
do $$
begin
  if to_regprocedure('seal.transition_core(uuid, text, text, text, date, text, boolean)') is null then
    alter function seal.transition(uuid, text, text, text, date, text, boolean) rename to transition_core;
  end if;
end $$;
revoke all on function seal.transition_core(uuid, text, text, text, date, text, boolean) from public, anon, authenticated;

create or replace function seal.transition(
  p_id uuid, p_action text, p_actor text,
  p_reason text default null, p_sealed_date date default null, p_sealed_by text default null, p_certificates_issued boolean default false
) returns text language plpgsql security definer set search_path = '' as $$
declare r seal.requests;
begin
  perform core.require_active();
  select * into r from seal.requests where id = p_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if p_action = 'cancel' then
    if not (coalesce(r.created_by = auth.uid(), false) or core.is_admin('seal')) then
      raise exception 'NOT_OWNER: 본인이 신청한 건만 취소할 수 있습니다.' using errcode = 'P0001';
    end if;
  else
    perform core.require_admin('seal');
  end if;
  return seal.transition_core(p_id, p_action, coalesce(core.my_name(), p_actor), p_reason, p_sealed_date,
                              coalesce(nullif(btrim(p_sealed_by), ''), core.my_name()), p_certificates_issued);
end;
$$;

-- 신청번호 채번·첫 이력 기록은 시스템 권한으로 (RLS 영향 없이)
alter function seal.next_request_no(date) security definer set search_path = '';
alter function seal.log_created() security definer set search_path = '';

-- ---------------------------------------------------------------------
-- 6. 비밀번호 없는 조회용 뷰로 교체 + 모든 뷰를 '조회하는 사람 권한'으로
-- ---------------------------------------------------------------------
drop view if exists vehicle.reservations_legacy;
create view vehicle.reservations_legacy with (security_invoker = true) as
select r.id, r.vehicle_number, r.start_at, r.end_at, r.applicant, r.department, r.contact, r.driver, r.purpose, r.destination, r.status,
       r.complete_department, r.complete_name, r.odometer_before, r.odometer_after, r.total_distance, r.fuel_cost, r.parking_cost, r.etc_cost,
       r.complete_memo, r.completed_at, r.created_by, r.legacy_source, r.legacy_id, r.created_at, r.updated_at,
       v.name as vehicle_name,
       (r.start_at at time zone 'Asia/Seoul')::date             as use_date,
       (r.start_at at time zone 'Asia/Seoul')::date             as start_date,
       to_char(r.start_at at time zone 'Asia/Seoul', 'HH24:MI') as start_time,
       (r.end_at   at time zone 'Asia/Seoul')::date             as end_date,
       to_char(r.end_at   at time zone 'Asia/Seoul', 'HH24:MI') as end_time
from vehicle.reservations r
join vehicle.vehicles v on v.number = r.vehicle_number;

create or replace view meeting.reservations_public with (security_invoker = true) as
select r.id, r.room_id, rm.name as room_name, rm.floor, rm.capacity, rm.location,
       r.title, r.organizer_name, r.department, r.attendee_count, r.start_at, r.end_at,
       r.status, r.series_id, r.recurrence_label, r.checked_in_at, r.cancelled_at, r.cancel_reason,
       r.created_at, r.updated_at
from meeting.reservations r join meeting.rooms rm on rm.id = r.room_id;

-- 통합 대시보드 뷰: 예약코드 해시 컬럼을 읽지 않도록 명시 컬럼으로 재정의
create or replace view core.v_work_items as
select 'ga'::text as module_key, id::text as item_id, title, requester_name as requester, department,
       request_date as requested_on, status, (urgency = '긴급') as urgent
from ga.requests
union all
select 'vehicle', id::text, vehicle_number || ' · ' || purpose, applicant, department,
       (created_at at time zone 'Asia/Seoul')::date, status, false
from vehicle.reservations
union all
select 'meeting', coalesce(series_id, id)::text, title, organizer_name, department,
       (created_at at time zone 'Asia/Seoul')::date, status, false
from (select distinct on (coalesce(series_id, id)) id, series_id, title, organizer_name, department, created_at, status, start_at
        from meeting.reservations order by coalesce(series_id, id), start_at) m
union all
select 'seal', id::text, seal_kind || ' · ' || document_name, requester_name, department, requested_at, status, needed_date <= requested_at
from seal.requests;

do $$
declare v record;
begin
  for v in select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where c.relkind = 'v' and n.nspname in ('core','ga','vehicle','meeting','seal') loop
    execute format('alter view %I.%I set (security_invoker = true)', v.nspname, v.relname);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. 권한(GRANT) 재정비 — 비로그인 차단, 로그인 직원은 RLS로 통제
-- ---------------------------------------------------------------------
do $$
declare s text;
begin
  foreach s in array array['core','ga','vehicle','meeting','seal'] loop
    execute format('revoke all on all tables in schema %I from anon', s);
    execute format('revoke all on all sequences in schema %I from anon', s);
    execute format('revoke execute on all functions in schema %I from public, anon', s);
    execute format('alter default privileges in schema %I revoke all on tables from anon', s);
    execute format('alter default privileges in schema %I revoke all on sequences from anon', s);
    execute format('alter default privileges in schema %I revoke execute on functions from public, anon', s);
    execute format('grant usage on schema %I to authenticated, service_role', s);
    execute format('grant select, insert, update, delete on all tables in schema %I to authenticated, service_role', s);
    execute format('grant usage, select on all sequences in schema %I to authenticated, service_role', s);
    execute format('grant execute on all functions in schema %I to authenticated, service_role', s);
  end loop;
end;
$$;
-- 가입 화면의 부서 목록은 로그인 전에도 조회
grant usage on schema core to anon;
grant select on core.departments to anon;
grant execute on function core.normalize_department(text) to anon;

-- 내부 함수는 화면에서 직접 호출 불가
revoke execute on function meeting.create_recurring_reservations_core(text, text, text, text, int, date, date, int[], time, time, text) from authenticated;
revoke execute on function seal.transition_core(uuid, text, text, text, date, text, boolean) from authenticated;
revoke execute on function meeting.sweep_statuses() from authenticated;
revoke execute on function core.handle_new_user() from authenticated;

-- 비밀번호·예약코드 해시 컬럼은 화면에서 읽기 불가 (컬럼 단위 권한)
do $$
declare t record; cols text;
begin
  for t in select * from (values ('ga','requests','edit_password'), ('vehicle','reservations','reservation_password'), ('meeting','reservations','manage_code_hash')) x(s, tb, secret) loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
      from information_schema.columns where table_schema = t.s and table_name = t.tb and column_name <> t.secret;
    execute format('revoke select on %I.%I from authenticated', t.s, t.tb);
    execute format('grant select (%s) on %I.%I to authenticated', cols, t.s, t.tb);
  end loop;
end;
$$;

-- 감사 로그·처리 이력은 추가만
revoke update, delete on core.audit_logs, seal.request_history from authenticated;
-- 프로필·설정은 RPC로만 변경
revoke insert, update, delete on core.profiles, core.settings from authenticated;

-- ---------------------------------------------------------------------
-- 8. 행 보안(RLS) 정책
-- ---------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where c.relkind = 'r' and n.nspname in ('core','ga','vehicle','meeting','seal') loop
    execute format('alter table %I.%I enable row level security', t.nspname, t.relname);
  end loop;
end;
$$;

-- 정책 이름 충돌 없이 다시 실행 가능하도록 기존 정책 정리
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname in ('core','ga','vehicle','meeting','seal') loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$$;

-- core
create policy departments_read on core.departments for select to anon, authenticated using (true);
create policy aliases_read on core.department_aliases for select to authenticated using (true);
create policy profiles_read on core.profiles for select to authenticated using (id = auth.uid() or core.is_admin(null));
create policy settings_read on core.settings for select to authenticated using (core.is_active());
create policy audit_read on core.audit_logs for select to authenticated using (core.is_admin(null));
create policy audit_insert on core.audit_logs for insert to authenticated with check (core.is_active());

-- 총무: 직원 조회·신청, 관리자 처리·삭제
create policy ga_read   on ga.requests for select to authenticated using (core.is_active());
create policy ga_insert on ga.requests for insert to authenticated with check (core.is_active() and created_by = auth.uid());
create policy ga_update on ga.requests for update to authenticated using (core.is_admin('ga')) with check (core.is_admin('ga'));
create policy ga_delete on ga.requests for delete to authenticated using (core.is_admin('ga'));

-- 차량: 신청은 RPC, 승인·반려·삭제는 차량 관리자
create policy vehicles_read on vehicle.vehicles for select to authenticated using (core.is_active());
create policy vehicles_admin on vehicle.vehicles for all to authenticated using (core.is_admin('vehicle')) with check (core.is_admin('vehicle'));
create policy vres_read   on vehicle.reservations for select to authenticated using (core.is_active());
create policy vres_update on vehicle.reservations for update to authenticated using (core.is_admin('vehicle')) with check (core.is_admin('vehicle'));
create policy vres_delete on vehicle.reservations for delete to authenticated using (core.is_admin('vehicle'));

-- 회의실: 예약은 RPC, 운영상태 변경은 회의실 관리자
create policy rooms_read  on meeting.rooms for select to authenticated using (core.is_active());
create policy rooms_admin on meeting.rooms for update to authenticated using (core.is_admin('meeting')) with check (core.is_admin('meeting'));
create policy mres_read   on meeting.reservations for select to authenticated using (core.is_active());
create policy mres_admin  on meeting.reservations for delete to authenticated using (core.is_admin('meeting'));

-- 인장: 직원 신청, 상태 변경은 seal.transition 으로만
create policy seal_kinds_read on seal.kinds for select to authenticated using (core.is_active());
create policy seal_read   on seal.requests for select to authenticated using (core.is_active());
create policy seal_insert on seal.requests for insert to authenticated with check (core.is_active() and created_by = auth.uid() and status = '접수');
create policy seal_delete on seal.requests for delete to authenticated using (core.is_admin('seal'));
create policy seal_hist_read on seal.request_history for select to authenticated using (core.is_active());
create policy seal_att_read  on seal.attachments for select to authenticated using (core.is_active());
create policy seal_att_insert on seal.attachments for insert to authenticated with check (core.is_active());
create policy seal_att_delete on seal.attachments for delete to authenticated using (core.is_admin('seal'));
-- seal.request_counters: 정책 없음(채번 함수만 접근)

notify pgrst, 'reload schema';
