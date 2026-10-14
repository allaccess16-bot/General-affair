-- =====================================================================
-- 0011 회의실 장기(반복)예약 원장 — 장기예약 1건 = meeting.series 1행
--   · 회차별 일정(meeting.reservations)은 날짜별 중복예약 차단(EXCLUDE)을 위해 내부에 유지
--   · 화면·통계·관리는 원장(series) 1건 기준으로 표시
--   · 기존(이관 포함) 반복예약은 원장으로 자동 정리
-- =====================================================================
create table if not exists meeting.series (
  id                uuid primary key,
  room_id           text not null references meeting.rooms(id),
  title             text not null,
  organizer_name    text not null,
  department        text not null,
  attendee_count    smallint not null,
  start_date        date not null,
  end_date          date not null,
  weekdays          smallint[] not null default '{}',   -- ISO 요일 1(월)~7(일)
  start_time        time not null,
  end_time          time not null,
  occurrence_count  int not null default 0,
  recurrence_label  text,
  created_by        uuid references auth.users(id) on delete set null,
  legacy_source     text,
  created_at        timestamptz not null default now()
);
create index if not exists meeting_series_room_idx on meeting.series (room_id, start_date);

-- 회차 데이터로부터 원장 만들기/맞추기 (여러 번 실행해도 안전)
create or replace function meeting.sync_series()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into meeting.series (id, room_id, title, organizer_name, department, attendee_count, start_date, end_date, weekdays,
                              start_time, end_time, occurrence_count, recurrence_label, created_by, legacy_source, created_at)
  select r.series_id,
         (array_agg(r.room_id order by r.start_at))[1],
         (array_agg(r.title order by r.start_at))[1],
         (array_agg(r.organizer_name order by r.start_at))[1],
         (array_agg(r.department order by r.start_at))[1],
         (array_agg(r.attendee_count order by r.start_at))[1],
         min((r.start_at at time zone 'Asia/Seoul')::date),
         max((r.start_at at time zone 'Asia/Seoul')::date),
         array(select distinct extract(isodow from (x.start_at at time zone 'Asia/Seoul'))::smallint
                 from meeting.reservations x where x.series_id = r.series_id order by 1),
         (array_agg((r.start_at at time zone 'Asia/Seoul')::time order by r.start_at))[1],
         (array_agg((r.end_at at time zone 'Asia/Seoul')::time order by r.start_at))[1],
         count(*),
         (array_agg(r.recurrence_label order by r.start_at))[1],
         (array_agg(r.created_by order by r.start_at))[1],
         (array_agg(r.legacy_source order by r.start_at))[1],
         min(r.created_at)
    from meeting.reservations r
   where r.series_id is not null
   group by r.series_id
  on conflict (id) do update
     set occurrence_count = excluded.occurrence_count,
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         weekdays = excluded.weekdays;
  get diagnostics n = row_count;
  return n;
end;
$$;
select meeting.sync_series();

-- 회차 → 원장 연결 (원장이 먼저 지워지지 않도록; 같은 트랜잭션 안에서 회차 먼저 생성 가능)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meeting_res_series_fk') then
    alter table meeting.reservations
      add constraint meeting_res_series_fk foreign key (series_id) references meeting.series(id) deferrable initially deferred;
  end if;
end $$;

-- 장기예약 생성: 회차 일괄 생성 + 원장 1건 기록 (권한 확인은 0010 래퍼와 동일)
create or replace function meeting.create_recurring_reservations(
  p_room_id text, p_title text, p_organizer_name text, p_department text, p_attendee_count int,
  p_start_date date, p_end_date date, p_weekdays int[], p_start_time time, p_end_time time, p_manage_code text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare res jsonb; v_series uuid;
begin
  perform core.require_active();
  res := meeting.create_recurring_reservations_core(p_room_id, p_title, p_organizer_name, p_department, p_attendee_count,
                                                    p_start_date, p_end_date, p_weekdays, p_start_time, p_end_time, p_manage_code);
  if res->>'status' = 'created' then
    v_series := (res->>'series_id')::uuid;
    update meeting.reservations set created_by = auth.uid() where series_id = v_series;
    insert into meeting.series (id, room_id, title, organizer_name, department, attendee_count, start_date, end_date, weekdays,
                                start_time, end_time, occurrence_count, recurrence_label, created_by)
    values (v_series, p_room_id, p_title, p_organizer_name, core.normalize_department(p_department), p_attendee_count,
            p_start_date, p_end_date, array(select distinct unnest(p_weekdays)::smallint order by 1), p_start_time, p_end_time,
            (res->>'created_count')::int, p_start_date || ' ~ ' || p_end_date, auth.uid());
  end if;
  return res;
end;
$$;

-- 원장 + 회차 진행 현황 (화면·통계용)
create or replace view meeting.series_public with (security_invoker = true) as
select s.id, s.room_id, rm.name as room_name, s.title, s.organizer_name, s.department, s.attendee_count,
       s.start_date, s.end_date, s.weekdays, s.start_time, s.end_time, s.occurrence_count, s.recurrence_label, s.created_at,
       count(r.*) filter (where r.status in ('reserved','checked_in') and r.end_at > now()) as upcoming_count,
       count(r.*) filter (where r.status = 'completed')                                   as completed_count,
       count(r.*) filter (where r.status in ('cancelled','no_show'))                       as cancelled_count,
       min(r.start_at) filter (where r.status in ('reserved','checked_in') and r.end_at > now()) as next_start_at,
       case when count(r.*) filter (where r.status in ('reserved','checked_in') and r.end_at > now()) > 0 then '진행중'
            when count(r.*) filter (where r.status = 'completed') > 0 then '종료'
            else '취소' end as status
  from meeting.series s
  join meeting.rooms rm on rm.id = s.room_id
  left join meeting.reservations r on r.series_id = s.id
 group by s.id, rm.name;

-- 권한: 직원 조회만, 생성·변경은 함수로
alter table meeting.series enable row level security;
drop policy if exists series_read on meeting.series;
create policy series_read on meeting.series for select to authenticated using (core.is_active());
revoke all on meeting.series from anon;
revoke insert, update, delete on meeting.series from authenticated;
grant select on meeting.series, meeting.series_public to authenticated;
revoke all on meeting.series_public from anon;
revoke execute on function meeting.sync_series() from public, anon, authenticated;

notify pgrst, 'reload schema';
