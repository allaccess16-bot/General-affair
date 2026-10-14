-- =====================================================================
-- 기존 3개 시스템 → 새 통합 DB 데이터 이관 (멱등: 여러 번 실행해도 중복 없음)
--
-- 절차
--   1) 기존 Supabase에서 테이블을 CSV로 내보내기
--        총무·차량 DB : public.requests, public.vehicle_reservations
--        회의실 DB    : public.reservations, public.rooms
--      ※ Table Editor 내보내기는 화면에 보이는 100건만 저장될 수 있으므로
--        SQL Editor에서 행 제한을 'No limit'으로 두고 select * 후 CSV로 내려받기
--   2) 이 파일 실행 → legacy_import 스키마(임시 적재 테이블)·이관 함수 생성
--   3) CSV를 적재 테이블에 넣기 (\copy 또는 CSV→INSERT 변환 SQL)
--   4) select * from legacy_import.run();   → 이관 결과 요약
--   5) select * from legacy_import.verify;  → 원본 = 이관 + 제외 건수 검증
--   6) select * from legacy_import.rejected; → 이관 제외 건과 사유 확인
--
-- 변환 규칙
--   · 부서명은 core.normalize_department 로 통일 (정보보호지원팀 등 → 정보보호지원부)
--   · 이름·연락처·운전자 앞뒤 공백 제거
--   · 차량: 운행 완료 기록(completed_at)이 있는 '승인' 건은 '사용완료'로 이관
--           (기존 앱은 완료 후에도 상태를 '승인'으로 두었음 → 새 DB에서는 중복배차 판정에서 제외)
--           종료시각이 시작보다 빠른 입력 오류는 다음 날 반납으로 보정하고 운행 메모에 표시
--   · 회의실: 기존 예약코드 해시를 그대로 보존, 운영중지 회의실의 예약도 이관 후
--             회의실 운영상태·정원·위치는 기존 rooms 값으로 맞춤
-- =====================================================================
create schema if not exists legacy_import;

create table if not exists legacy_import.requests (
  id text, request_date text, title text, description text, requester_name text, department text, contact text,
  edit_password text, location text, category text, urgency text, status text, assignee text, admin_memo text,
  completed_at text, created_at text, updated_at text
);
alter table legacy_import.requests add column if not exists desired_date text;
alter table legacy_import.requests add column if not exists reject_reason text;

create table if not exists legacy_import.vehicle_reservations (
  id text, vehicle_name text, vehicle_number text, use_date text, start_date text, start_time text, end_date text, end_time text,
  applicant text, department text, contact text, driver text, reservation_password text, purpose text, destination text, status text,
  complete_department text, complete_name text, odometer_before text, odometer_after text, total_distance text,
  fuel_cost text, parking_cost text, etc_cost text, complete_memo text, completed_at text, created_at text, updated_at text
);
create table if not exists legacy_import.meeting_reservations (
  id text, room_id text, title text, organizer_name text, department text, attendee_count text, start_at text, end_at text,
  status text, series_id text, recurrence_label text, manage_code_hash text, checked_in_at text, cancelled_at text, cancel_reason text,
  created_at text, updated_at text
);
create table if not exists legacy_import.meeting_rooms (
  id text, floor text, name text, capacity text, location text, sort_order text, active text, created_at text
);
create table if not exists legacy_import.rejected (
  source text, legacy_id text, reason text, row_data jsonb, logged_at timestamptz default now()
);

-- 예시 (psql):
-- \copy legacy_import.requests (id,title,...) from 'requests_rows.csv' csv header

create or replace function legacy_import.run()
returns table (source text, imported int, skipped_existing int, rejected int)
language plpgsql as $$
declare r record; ok int; ex int; rj int; v_status text; v_start timestamptz; v_end timestamptz; v_memo text;
begin
  -- 제외 목록은 마지막 실행 기준으로 다시 작성 (원본을 고친 뒤 재실행하면 다시 시도)
  delete from legacy_import.rejected;

  -- 1) 총무 업무요청
  ok := 0; ex := 0; rj := 0;
  for r in select * from legacy_import.requests order by created_at loop
    if exists (select 1 from ga.requests g where g.legacy_source = 'ga_v1' and g.legacy_id = r.id) then ex := ex + 1; continue; end if;
    begin
      insert into ga.requests (request_date, title, description, requester_name, department, contact, edit_password, location, category, urgency,
                               status, assignee, admin_memo, completed_at, desired_date, created_at, updated_at, legacy_source, legacy_id)
      values (coalesce(nullif(btrim(r.request_date),'')::date, (r.created_at::timestamptz at time zone 'Asia/Seoul')::date),
              btrim(r.title), coalesce(r.description,''), btrim(r.requester_name),
              core.normalize_department(btrim(r.department)), btrim(coalesce(r.contact,'')), nullif(r.edit_password,''), btrim(coalesce(r.location,'')),
              coalesce(nullif(btrim(r.category),''),'시설/비품'), coalesce(nullif(btrim(r.urgency),''),'보통'), coalesce(nullif(btrim(r.status),''),'접수'),
              nullif(btrim(r.assignee),''), nullif(r.admin_memo,''), nullif(r.completed_at,'')::timestamptz, nullif(btrim(r.desired_date),'')::date,
              r.created_at::timestamptz, coalesce(nullif(r.updated_at,''), r.created_at)::timestamptz, 'ga_v1', r.id);
      ok := ok + 1;
    exception when others then
      insert into legacy_import.rejected (source, legacy_id, reason, row_data) values ('ga.requests', r.id, sqlerrm, to_jsonb(r));
      rj := rj + 1;
    end;
  end loop;
  source := 'ga.requests'; imported := ok; skipped_existing := ex; rejected := rj; return next;

  -- 2) 법인차량 (먼저 접수된 건 우선 — 겹치는 활성 예약은 rejected로 분리)
  ok := 0; ex := 0; rj := 0;
  for r in select * from legacy_import.vehicle_reservations order by created_at loop
    if exists (select 1 from vehicle.reservations v where v.legacy_source = 'vehicle_v1' and v.legacy_id = r.id) then ex := ex + 1; continue; end if;
    v_status := coalesce(nullif(btrim(r.status),''),'신청');
    if v_status = '승인' and nullif(r.completed_at,'') is not null then v_status := '사용완료'; end if;
    v_start := (coalesce(nullif(r.start_date,''), r.use_date)::date + coalesce(nullif(r.start_time,''),'00:00')::time) at time zone 'Asia/Seoul';
    v_end   := (coalesce(nullif(r.end_date,''), r.use_date)::date + coalesce(nullif(r.end_time,''),'23:59')::time) at time zone 'Asia/Seoul';
    v_memo  := nullif(r.complete_memo,'');
    -- 종료시각이 시작보다 빠른 입력 오류(종료일 미변경)는 다음 날 반납으로 보정하고 메모에 남김
    if v_end <= v_start then
      v_end  := v_end + interval '1 day' * (1 + floor(extract(epoch from (v_start - v_end)) / 86400));
      v_memo := concat_ws(' / ', v_memo, '[이관] 종료시각이 시작보다 빨라 다음 날 반납으로 보정');
    end if;
    begin
      insert into vehicle.reservations (vehicle_number, start_at, end_at, applicant, department, contact, driver, reservation_password, purpose, destination,
                                        status, complete_department, complete_name, odometer_before, odometer_after, fuel_cost, parking_cost, etc_cost,
                                        complete_memo, completed_at, created_at, updated_at, legacy_source, legacy_id)
      values (coalesce(nullif(btrim(r.vehicle_number),''), '191호8366'),
              v_start, v_end,
              btrim(r.applicant), core.normalize_department(btrim(r.department)), btrim(coalesce(r.contact,'')),
              coalesce(nullif(btrim(r.driver),''), btrim(r.applicant)), nullif(r.reservation_password,''),
              coalesce(r.purpose,''), coalesce(r.destination,''), v_status,
              core.normalize_department(nullif(btrim(r.complete_department),'')), nullif(btrim(r.complete_name),''),
              nullif(r.odometer_before,'')::int, nullif(r.odometer_after,'')::int,
              coalesce(nullif(r.fuel_cost,'')::int,0), coalesce(nullif(r.parking_cost,'')::int,0), coalesce(nullif(r.etc_cost,'')::int,0),
              v_memo, nullif(r.completed_at,'')::timestamptz, r.created_at::timestamptz,
              coalesce(nullif(r.updated_at,''), r.created_at)::timestamptz, 'vehicle_v1', r.id);
      ok := ok + 1;
    exception when others then
      insert into legacy_import.rejected (source, legacy_id, reason, row_data) values ('vehicle.reservations', r.id, sqlerrm, to_jsonb(r));
      rj := rj + 1;
    end;
  end loop;
  source := 'vehicle.reservations'; imported := ok; skipped_existing := ex; rejected := rj; return next;

  -- 3) 회의실 — 운영중지 회의실의 기존 예약도 넣을 수 있게 잠시 모두 운영 상태로 두고 이관
  create temp table if not exists _room_active on commit drop as select id, active from meeting.rooms;
  update meeting.rooms set active = true where not active;

  ok := 0; ex := 0; rj := 0;
  for r in select * from legacy_import.meeting_reservations order by created_at loop
    if exists (select 1 from meeting.reservations m where m.legacy_source = 'meeting_v2' and m.legacy_id = r.id) then ex := ex + 1; continue; end if;
    begin
      insert into meeting.reservations (room_id, title, organizer_name, department, attendee_count, start_at, end_at, status, series_id, recurrence_label,
                                        manage_code_hash, checked_in_at, cancelled_at, cancel_reason, created_at, updated_at, legacy_source, legacy_id)
      values (btrim(r.room_id), btrim(r.title), btrim(r.organizer_name), core.normalize_department(btrim(r.department)),
              coalesce(nullif(r.attendee_count,'')::int, 1),
              r.start_at::timestamptz, r.end_at::timestamptz, coalesce(nullif(btrim(r.status),''),'reserved'), nullif(r.series_id,'')::uuid,
              nullif(r.recurrence_label,''), coalesce(nullif(r.manage_code_hash,''), 'LEGACY-NOCODE'), nullif(r.checked_in_at,'')::timestamptz,
              nullif(r.cancelled_at,'')::timestamptz, nullif(r.cancel_reason,''), r.created_at::timestamptz,
              coalesce(nullif(r.updated_at,''), r.created_at)::timestamptz, 'meeting_v2', r.id);
      ok := ok + 1;
    exception when others then
      insert into legacy_import.rejected (source, legacy_id, reason, row_data) values ('meeting.reservations', r.id, sqlerrm, to_jsonb(r));
      rj := rj + 1;
    end;
  end loop;

  -- 회의실 운영상태 복원: 기존 rooms CSV가 있으면 그 값, 없으면 이관 전 값
  update meeting.rooms m set active = a.active from _room_active a where a.id = m.id;
  update meeting.rooms m
     set active = lr.active::boolean,
         name = coalesce(nullif(btrim(lr.name),''), m.name),
         capacity = coalesce(nullif(lr.capacity,'')::smallint, m.capacity),
         location = coalesce(nullif(btrim(lr.location),''), m.location),
         sort_order = coalesce(nullif(lr.sort_order,'')::smallint, m.sort_order)
    from legacy_import.meeting_rooms lr
   where lr.id = m.id;
  drop table if exists _room_active;
  source := 'meeting.reservations'; imported := ok; skipped_existing := ex; rejected := rj; return next;
end;
$$;

-- 이관 검증: 원본 건수 = 이관 건수 + 제외 건수
create or replace view legacy_import.verify as
select 'ga.requests' as source, (select count(*) from legacy_import.requests) as source_rows,
       (select count(*) from ga.requests where legacy_source='ga_v1') as imported_rows,
       (select count(*) from legacy_import.rejected where source='ga.requests') as rejected_rows
union all
select 'vehicle.reservations', (select count(*) from legacy_import.vehicle_reservations),
       (select count(*) from vehicle.reservations where legacy_source='vehicle_v1'),
       (select count(*) from legacy_import.rejected where source='vehicle.reservations')
union all
select 'meeting.reservations', (select count(*) from legacy_import.meeting_reservations),
       (select count(*) from meeting.reservations where legacy_source='meeting_v2'),
       (select count(*) from legacy_import.rejected where source='meeting.reservations');
