-- =====================================================================
-- 0004 회의실 예약 — 기존 rooms / reservations 구조 + DB 수준 중복 차단
--
-- 중복 차단 방식 (3중)
--   1) EXCLUDE 제약: 같은 회의실에서 'reserved'·'checked_in' 예약의 [시작, 종료) 구간 겹침 금지
--      → 동시 요청이 와도 DB가 한 건만 허용 (트랜잭션 격리와 무관하게 보장)
--   2) CHECK 제약: 30분 단위 · 08:00–20:00 · 같은 날 안에서만
--   3) 반복예약 RPC: 전체 회차를 한 트랜잭션에서 INSERT — 1건이라도 겹치면 전체 롤백(all-or-nothing)
--      충돌 목록은 사전 조회로 반환해 화면에 일시·부서·예약자·제목을 안내
-- =====================================================================
create table meeting.rooms (
  id          text primary key,
  floor       smallint not null check (floor in (12, 13)),
  name        text not null,
  capacity    smallint not null check (capacity > 0),
  location    text not null,
  color       text not null,
  sort_order  smallint not null default 0,
  active      boolean not null default true
);
insert into meeting.rooms (id, floor, name, capacity, location, color, sort_order) values
  ('12-1',12,'회의실 12-1',5,'최정국 본부장 옆','#00A979',1),
  ('12-2',12,'회의실 12-2',4,'곽상현 본부장 옆','#0097B8',2),
  ('12-3',12,'회의실 12-3',8,'계리부 옆 구석','#3577E5',3),
  ('12-4',12,'회의실 12-4',4,'변액 앞','#6257D9',4),
  ('12-5',12,'회의실 12-5',4,'노조사무실 앞','#8E4FD1',5),
  ('12-6',12,'회의실 12-6',5,'여직원휴게실 앞','#C53AA9',6),
  ('13-1',13,'회의실 13-1',5,'민원상담실','#6FAE19',1),
  ('13-2',13,'회의실 13-2',5,'고충처리실','#C88A00',2),
  ('13-3',13,'회의실 13-3',5,'QA실','#E77A10',3),
  ('13-4',13,'회의실 13-4',12,'중앙회의실','#E65336',4),
  ('13-5',13,'회의실 13-5',4,'휴게공간','#E53F6D',5),
  ('13-L',13,'대회의실',30,'13층 대회의실','#CB2F36',6);

create table meeting.reservations (
  id                uuid primary key default gen_random_uuid(),
  room_id           text not null references meeting.rooms(id),
  title             text not null check (char_length(title) between 1 and 60),
  organizer_name    text not null check (char_length(organizer_name) between 1 and 30),
  department        text not null,
  attendee_count    smallint not null check (attendee_count >= 1),
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  status            text not null default 'reserved' check (status in ('reserved','checked_in','completed','cancelled','no_show')),
  series_id         uuid,
  recurrence_label  text,
  manage_code_hash  text not null,            -- 예약코드는 해시로만 보관
  checked_in_at     timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  legacy_source     text,
  legacy_id         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (legacy_source, legacy_id),
  constraint meeting_time_order check (end_at > start_at),
  -- 30분 단위 · 운영시간 08–20시 · 하루 안 (서울 시간 기준)
  constraint meeting_slot_unit check (
        extract(second from start_at) = 0 and extract(second from end_at) = 0
    and extract(minute from (start_at at time zone 'Asia/Seoul'))::int % 30 = 0
    and extract(minute from (end_at   at time zone 'Asia/Seoul'))::int % 30 = 0
  ),
  constraint meeting_business_hours check (
        (start_at at time zone 'Asia/Seoul')::time >= time '08:00'
    and (end_at   at time zone 'Asia/Seoul')::time <= time '20:00'
    and (start_at at time zone 'Asia/Seoul')::date = ((end_at - interval '1 second') at time zone 'Asia/Seoul')::date
  ),
  -- ★ 중복 예약 차단
  constraint meeting_no_overlap exclude using gist (
    room_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('reserved', 'checked_in'))
);
create index meeting_res_series_idx on meeting.reservations (series_id) where series_id is not null;
create index meeting_res_start_idx on meeting.reservations (start_at);

create trigger meeting_res_touch before update on meeting.reservations
  for each row execute function core.touch_updated_at();

-- 정원·운영중지 검사 (다른 테이블 참조라 CHECK 대신 트리거)
create or replace function meeting.check_room_rules()
returns trigger language plpgsql as $$
declare r meeting.rooms;
begin
  select * into r from meeting.rooms where id = new.room_id;
  if tg_op = 'INSERT' and not r.active then
    raise exception 'ROOM_INACTIVE: 운영 중지된 회의실입니다.' using errcode = 'P0001';
  end if;
  if new.attendee_count > r.capacity then
    raise exception 'CAPACITY_EXCEEDED: 이 회의실은 최대 %명까지 이용 가능합니다.', r.capacity using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger meeting_res_room_rules before insert or update of room_id, attendee_count on meeting.reservations
  for each row execute function meeting.check_room_rules();

-- 공개 조회 뷰 (예약코드 해시 제외)
create view meeting.reservations_public as
select r.id, r.room_id, rm.name as room_name, rm.floor, rm.capacity, rm.location,
       r.title, r.organizer_name, r.department, r.attendee_count, r.start_at, r.end_at,
       r.status, r.series_id, r.recurrence_label, r.checked_in_at, r.cancelled_at, r.cancel_reason,
       r.created_at, r.updated_at
from meeting.reservations r join meeting.rooms rm on rm.id = r.room_id;

create or replace function meeting.hash_code(p_code text)
returns text language sql immutable as $$ select encode(extensions.digest(upper(btrim(p_code)), 'sha256'), 'hex') $$;

-- 단일 예약
create or replace function meeting.create_reservation(
  p_room_id text, p_title text, p_organizer_name text, p_department text,
  p_attendee_count int, p_start_at timestamptz, p_end_at timestamptz, p_manage_code text
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into meeting.reservations (room_id, title, organizer_name, department, attendee_count, start_at, end_at, manage_code_hash)
  values (p_room_id, p_title, p_organizer_name, core.normalize_department(p_department), p_attendee_count, p_start_at, p_end_at, meeting.hash_code(p_manage_code))
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then
    raise exception 'RESERVATION_CONFLICT: 이미 예약된 시간입니다.' using errcode = 'P0001';
end;
$$;

-- 반복·장기 예약 (all-or-nothing)
--   p_weekdays: ISO 요일 1(월)~7(일)
--   반환: {status:'created', created_count, created_ids, series_id} 또는 {status:'conflict', conflict_count, conflicts:[...]}
create or replace function meeting.create_recurring_reservations(
  p_room_id text, p_title text, p_organizer_name text, p_department text, p_attendee_count int,
  p_start_date date, p_end_date date, p_weekdays int[], p_start_time time, p_end_time time, p_manage_code text
) returns jsonb language plpgsql as $$
declare
  v_series uuid := gen_random_uuid();
  v_occ tstzrange[];
  v_conflicts jsonb;
  v_ids uuid[];
begin
  if p_end_date < p_start_date then raise exception 'INVALID_DATE_RANGE' using errcode = 'P0001'; end if;
  if coalesce(array_length(p_weekdays, 1), 0) = 0 then raise exception 'RECURRING_REQUIRED' using errcode = 'P0001'; end if;

  v_occ := array(
    select tstzrange((d::date + p_start_time) at time zone 'Asia/Seoul', (d::date + p_end_time) at time zone 'Asia/Seoul', '[)')
    from generate_series(p_start_date, p_end_date, interval '1 day') d
    where extract(isodow from d)::int = any (p_weekdays)
    order by d
  );

  if coalesce(array_length(v_occ, 1), 0) = 0 then raise exception 'NO_OCCURRENCES' using errcode = 'P0001'; end if;

  -- 사전 충돌 조회 (화면 안내용)
  select jsonb_agg(jsonb_build_object('start_at', r.start_at, 'end_at', r.end_at, 'department', r.department,
                                      'organizer_name', r.organizer_name, 'title', r.title) order by r.start_at)
    into v_conflicts
  from meeting.reservations r join unnest(v_occ) o(rng) on tstzrange(r.start_at, r.end_at, '[)') && o.rng
  where r.room_id = p_room_id and r.status in ('reserved','checked_in');

  if v_conflicts is not null then
    return jsonb_build_object('status', 'conflict', 'conflict_count', jsonb_array_length(v_conflicts), 'conflicts', v_conflicts);
  end if;

  -- 전체 회차 일괄 INSERT — 사전 조회 이후 다른 요청이 끼어들어도 EXCLUDE 제약이 전체를 롤백
  with ins as (
    insert into meeting.reservations (room_id, title, organizer_name, department, attendee_count, start_at, end_at, series_id, recurrence_label, manage_code_hash)
    select p_room_id, p_title, p_organizer_name, core.normalize_department(p_department), p_attendee_count, lower(o.rng), upper(o.rng), v_series,
           p_start_date || ' ~ ' || p_end_date, meeting.hash_code(p_manage_code)
    from unnest(v_occ) o(rng)
    returning id
  )
  select array_agg(id) into v_ids from ins;

  return jsonb_build_object('status', 'created', 'series_id', v_series, 'created_count', array_length(v_ids, 1), 'created_ids', to_jsonb(v_ids));
exception
  when exclusion_violation then
    raise exception 'RECURRING_CONFLICT: 기간 중 다른 예약이 먼저 등록되어 전체 장기예약이 취소되었습니다.' using errcode = 'P0001';
end;
$$;

-- 입실확인 / 취소 (예약코드 확인)
create or replace function meeting.manage_reservation(p_reservation_id uuid, p_manage_code text, p_action text)
returns void language plpgsql as $$
declare r meeting.reservations;
begin
  select * into r from meeting.reservations where id = p_reservation_id for update;
  if not found or r.manage_code_hash <> meeting.hash_code(p_manage_code) then raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;
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

-- 반복예약 남은 회차 일괄 취소
create or replace function meeting.manage_reservation_series(p_series_id uuid, p_manage_code text)
returns int language plpgsql as $$
declare n int;
begin
  update meeting.reservations
     set status = 'cancelled', cancelled_at = now(), cancel_reason = 'series_cancelled'
   where series_id = p_series_id and manage_code_hash = meeting.hash_code(p_manage_code)
     and status in ('reserved','checked_in') and end_at > now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 자동 상태 전환: 단일 예약 10분 미입실 → no_show, 종료 시각 경과 → completed
-- Supabase에서는 pg_cron으로 1분마다 실행:  select cron.schedule('meeting-sweep', '* * * * *', 'select meeting.sweep_statuses()');
create or replace function meeting.sweep_statuses()
returns int language plpgsql as $$
declare a int; b int;
begin
  update meeting.reservations set status = 'no_show', cancel_reason = 'no_show'
   where series_id is null and status = 'reserved' and now() > start_at + interval '10 minutes';
  get diagnostics a = row_count;
  update meeting.reservations set status = 'completed'
   where status in ('reserved','checked_in') and now() >= end_at;
  get diagnostics b = row_count;
  return a + b;
end;
$$;
