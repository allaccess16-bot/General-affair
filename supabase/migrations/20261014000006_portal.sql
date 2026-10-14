-- =====================================================================
-- 0006 통합 대시보드 뷰 — 4개 모듈 신청·예약을 공통 형식으로
-- =====================================================================
create view core.v_work_items as
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
from (select distinct on (coalesce(series_id, id)) * from meeting.reservations order by coalesce(series_id, id), start_at) m
union all
select 'seal', id::text, seal_kind || ' · ' || document_name, requester_name, department, requested_at, status, needed_date <= requested_at
from seal.requests;
