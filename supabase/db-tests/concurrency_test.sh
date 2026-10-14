#!/usr/bin/env bash
# 동시 예약 경합 테스트: 같은 회의실·시간에 20개 세션이 동시에 예약 → 정확히 1건만 성공해야 함
set -u
DB=${1:-hanaworks_test}
# 0010(로그인·권한) 적용 DB에서는 승인된 직원으로 로그인한 상태로 요청
LOGIN=$(psql -tA -d "$DB" -c "select case when to_regclass('core.profiles') is null then '' else (select format('select set_config(''request.jwt.claims'', %L, false);', json_build_object('sub', id, 'role', 'authenticated')) from core.profiles where status='active' limit 1) end")
for i in $(seq 1 20); do
  psql -q -d "$DB" -c "$LOGIN select meeting.create_reservation('13-L','동시$i','경합$i','감사부',2,'2030-04-01 10:00+09','2030-04-01 11:00+09','RACE$i')" >/dev/null 2>&1 &
done
wait
n=$(psql -tA -d "$DB" -c "select count(*) from meeting.reservations where room_id='13-L' and start_at='2030-04-01 10:00+09' and status='reserved'")
echo "동시 20건 요청 → 저장된 예약: $n건"
[ "$n" = "1" ] && echo "PASS: 동시 요청에서도 1건만 저장" || { echo "FAIL"; exit 1; }
