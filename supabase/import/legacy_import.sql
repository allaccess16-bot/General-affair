-- =====================================================================
-- 기존 3개 시스템 → 새 통합 DB 데이터 이관 (멱등: 여러 번 실행해도 중복 없음)
--
-- 절차
--   1) 기존 Supabase에서 테이블을 CSV로 내보내기 (Table Editor → Export 또는 \copy)
--        총무·차량 DB : public.requests, public.vehicle_reservations
--        회의실 DB    : public.reservations (또는 reservations_public + manage code hash 컬럼)
--   2) 이 파일 실행 → legacy_import 스키마(임시 적재 테이블) 생성
--   3) \copy 로 CSV 적재 (아래 예시)
--   4) select * from legacy_import.run();   → 이관 결과 요약
--   5) select * from legacy_import.rejected; → 이관 제외 건(겹치는 예약 등)과 사유 확인
-- =====================================================================
create schema if not exists legacy_import;

create table if not exists legacy_import.requests (
  id text, request_date text, title text, description text, requester_name text, department text, contact text,
  edit_password text, location text, category text, urgency text, status text, assignee text, admin_memo text,
  completed_at text, created_at text, updated_at text
);
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
create table if not exists legacy_import.rejected (
  source text, legacy_id text, reason text, row_data jsonb, logged_at timestamptz default now()
);

-- 예시:
-- \copy legacy_import.requests from 'requests.csv' csv header
-- \copy legacy_import.vehicle_reservations from 'vehicle_reservations.csv' csv header
-- \copy legacy_import.meeting_reservations from 'meeting_reservations.csv' csv header

create or replace function legacy_import.run()
returns table (source text, imported int, skipped_existing int, rejected int)
language plpgsql as $$
declare r record; ok int; ex int; rj int;
begin
  -- 제외 목록은 마지막 실행 기준으로 다시 작성 (원본을 고친 뒤 재실행하면 다시 시도)
  delete from legacy_import.rejected;
  -- 1) 총무 업무요청
  ok := 0; ex := 0; rj := 0;
  for r in select * from legacy_import.requests order by created_at loop
    if exists (select 1 from ga.requests g where g.legacy_source = 'ga_v1' and g.legacy_id = r.id) then ex := ex + 1; continue; end if;
    begin
      insert into ga.requests (request_date, title, description, requester_name, department, contact, edit_password, location, category, urgency,
                               status, assignee, admin_memo, completed_at, created_at, updated_at, legacy_source, legacy_id)
      values (coalesce(nullif(r.request_date,'')::date, r.created_at::timestamptz::date), r.title, coalesce(r.description,''), r.requester_name,
              core.normalize_department(r.department), coalesce(r.contact,''), r.edit_password, coalesce(r.location,''),
              coalesce(nullif(r.category,''),'시설/비품'), coalesce(nullif(r.urgency,''),'보통'), coalesce(nullif(r.status,''),'접수'),
              r.assignee, r.admin_memo, nullif(r.completed_at,'')::timestamptz, r.created_at::timestamptz,
              coalesce(nullif(r.updated_at,''), r.created_at)::timestamptz, 'ga_v1', r.id);
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
    begin
      insert into vehicle.reservations (vehicle_number, start_at, end_at, applicant, department, contact, driver, reservation_password, purpose, destination,
                                        status, complete_department, complete_name, odometer_before, odometer_after, fuel_cost, parking_cost, etc_cost,
                                        complete_memo, completed_at, created_at, updated_at, legacy_source, legacy_id)
      values (coalesce(nullif(r.vehicle_number,''), '191호8366'),
              (coalesce(nullif(r.start_date,''), r.use_date)::date + coalesce(nullif(r.start_time,''),'00:00')::time) at time zone 'Asia/Seoul',
              (coalesce(nullif(r.end_date,''), r.use_date)::date + coalesce(nullif(r.end_time,''),'23:59')::time) at time zone 'Asia/Seoul',
              r.applicant, core.normalize_department(r.department), coalesce(r.contact,''), coalesce(r.driver, r.applicant), r.reservation_password,
              coalesce(r.purpose,''), coalesce(r.destination,''), coalesce(nullif(r.status,''),'신청'),
              core.normalize_department(r.complete_department), r.complete_name, nullif(r.odometer_before,'')::int, nullif(r.odometer_after,'')::int,
              coalesce(nullif(r.fuel_cost,'')::int,0), coalesce(nullif(r.parking_cost,'')::int,0), coalesce(nullif(r.etc_cost,'')::int,0),
              r.complete_memo, nullif(r.completed_at,'')::timestamptz, r.created_at::timestamptz, coalesce(nullif(r.updated_at,''), r.created_at)::timestamptz,
              'vehicle_v1', r.id);
      ok := ok + 1;
    exception when others then
      insert into legacy_import.rejected (source, legacy_id, reason, row_data) values ('vehicle.reservations', r.id, sqlerrm, to_jsonb(r));
      rj := rj + 1;
    end;
  end loop;
  source := 'vehicle.reservations'; imported := ok; skipped_existing := ex; rejected := rj; return next;

  -- 3) 회의실
  ok := 0; ex := 0; rj := 0;
  for r in select * from legacy_import.meeting_reservations order by created_at loop
    if exists (select 1 from meeting.reservations m where m.legacy_source = 'meeting_v2' and m.legacy_id = r.id) then ex := ex + 1; continue; end if;
    begin
      insert into meeting.reservations (room_id, title, organizer_name, department, attendee_count, start_at, end_at, status, series_id, recurrence_label,
                                        manage_code_hash, checked_in_at, cancelled_at, cancel_reason, created_at, updated_at, legacy_source, legacy_id)
      values (r.room_id, r.title, r.organizer_name, core.normalize_department(r.department), coalesce(nullif(r.attendee_count,'')::int, 1),
              r.start_at::timestamptz, r.end_at::timestamptz, coalesce(nullif(r.status,''),'reserved'), nullif(r.series_id,'')::uuid, r.recurrence_label,
              coalesce(nullif(r.manage_code_hash,''), 'LEGACY-NOCODE'), nullif(r.checked_in_at,'')::timestamptz, nullif(r.cancelled_at,'')::timestamptz,
              r.cancel_reason, r.created_at::timestamptz, coalesce(nullif(r.updated_at,''), r.created_at)::timestamptz, 'meeting_v2', r.id);
      ok := ok + 1;
    exception when others then
      insert into legacy_import.rejected (source, legacy_id, reason, row_data) values ('meeting.reservations', r.id, sqlerrm, to_jsonb(r));
      rj := rj + 1;
    end;
  end loop;
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
