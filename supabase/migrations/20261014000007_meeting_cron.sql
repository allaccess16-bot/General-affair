-- =====================================================================
-- 0007 회의실 자동취소·자동완료 스케줄 (pg_cron, 1분마다)
--   - 단일 예약 10분 미입실 → no_show
--   - 종료 시각 경과 → completed
-- pg_cron이 없는 환경(로컬 PostgreSQL 등)에서는 건너뜁니다.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- 같은 이름이면 기존 작업을 갱신
    perform cron.schedule('meeting-sweep', '* * * * *', 'select meeting.sweep_statuses()');
  else
    raise notice 'pg_cron 확장이 없어 회의실 자동취소 스케줄을 건너뜁니다.';
  end if;
end;
$$;
