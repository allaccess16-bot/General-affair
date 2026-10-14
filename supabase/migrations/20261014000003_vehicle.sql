-- =====================================================================
-- 0003 법인차량 배차 — 기존 public.vehicle_reservations 구조 + DB 수준 중복 차단
--
-- 중복 차단 방식
--   기존: 브라우저에서 겹침 검사 → 동시에 두 명이 신청하면 둘 다 저장될 수 있음
--   변경: start_at/end_at(timestamptz) + EXCLUDE 제약
--         같은 차량에서 '신청'·'승인' 상태 예약의 [시작, 반납) 구간이 겹치면 INSERT/UPDATE 자체가 실패
--         (반려·사용완료는 점유하지 않으므로 같은 시간 재신청 가능 — 기존 규칙과 동일)
-- =====================================================================
create table vehicle.vehicles (
  number      text primary key,               -- 자동차등록번호
  name        text not null,                  -- 차종
  label       text not null,
  is_active   boolean not null default true,
  sort_order  smallint not null default 0
);
insert into vehicle.vehicles (number, name, label, sort_order) values
  ('191호8366', 'K5', 'K5 191호8366', 1),
  ('191호8367', 'K5', 'K5 191호8367 청라', 2),
  ('146호9979', 'K5', 'K5 146호9979', 3);

create table vehicle.reservations (
  id                    uuid primary key default gen_random_uuid(),
  vehicle_number        text not null references vehicle.vehicles(number),
  start_at              timestamptz not null,
  end_at                timestamptz not null,
  applicant             text not null,
  department            text not null,
  contact               text not null,
  driver                text not null,
  reservation_password  text,                 -- 기존 호환
  purpose               text not null,
  destination           text not null,
  status                text not null default '신청' check (status in ('신청','승인','반려','사용완료')),
  complete_department   text,
  complete_name         text,
  odometer_before       integer,
  odometer_after        integer,
  total_distance        integer generated always as (greatest(coalesce(odometer_after,0) - coalesce(odometer_before,0), 0)) stored,
  fuel_cost             integer not null default 0,
  parking_cost          integer not null default 0,
  etc_cost              integer not null default 0,
  complete_memo         text,
  completed_at          timestamptz,
  legacy_source         text,
  legacy_id             text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (legacy_source, legacy_id),
  constraint vehicle_time_order check (end_at > start_at),
  constraint vehicle_odometer_order check (odometer_after is null or odometer_before is null or odometer_after >= odometer_before),
  -- ★ 중복 배차 차단
  constraint vehicle_no_overlap exclude using gist (
    vehicle_number with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('신청', '승인'))
);
create index vehicle_res_start_idx on vehicle.reservations (start_at);

create trigger vehicle_res_touch before update on vehicle.reservations
  for each row execute function core.touch_updated_at();

-- 기존 화면 호환 뷰 (use_date / start_date / start_time ... 형식)
create view vehicle.reservations_legacy as
select r.*,
       v.name as vehicle_name,
       (r.start_at at time zone 'Asia/Seoul')::date                  as use_date,
       (r.start_at at time zone 'Asia/Seoul')::date                  as start_date,
       to_char(r.start_at at time zone 'Asia/Seoul', 'HH24:MI')      as start_time,
       (r.end_at   at time zone 'Asia/Seoul')::date                  as end_date,
       to_char(r.end_at   at time zone 'Asia/Seoul', 'HH24:MI')      as end_time
from vehicle.reservations r
join vehicle.vehicles v on v.number = r.vehicle_number;

-- 배차 신청 (겹침 시 사용자 메시지로 변환)
create or replace function vehicle.create_reservation(
  p_vehicle_number text, p_start_at timestamptz, p_end_at timestamptz,
  p_applicant text, p_department text, p_contact text, p_driver text,
  p_password text, p_purpose text, p_destination text
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into vehicle.reservations (vehicle_number, start_at, end_at, applicant, department, contact, driver, reservation_password, purpose, destination)
  values (p_vehicle_number, p_start_at, p_end_at, p_applicant, core.normalize_department(p_department), p_contact, p_driver, p_password, p_purpose, p_destination)
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then
    raise exception 'VEHICLE_CONFLICT: 선택한 차량의 기존 예약 시간과 겹칩니다.' using errcode = 'P0001';
end;
$$;
