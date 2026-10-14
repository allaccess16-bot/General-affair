-- =====================================================================
-- 통합 DB 마이그레이션 검증 테스트 (psql -v ON_ERROR_STOP=1 -f tests/run_tests.sql)
-- 각 테스트는 기대한 오류가 나면 PASS를 출력합니다.
-- =====================================================================
\set QUIET on
create or replace function pg_temp.expect_error(p_sql text, p_like text, p_name text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: % (오류가 발생하지 않음)', p_name;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm not like p_like then raise exception 'FAIL: % — 예상과 다른 오류: %', p_name, sqlerrm; end if;
  raise notice 'PASS: %', p_name;
end; $$;
create or replace function pg_temp.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin if not p_cond then raise exception 'FAIL: %', p_name; end if; raise notice 'PASS: %', p_name; end; $$;

-- 0010(로그인·권한) 적용 DB: 승인된 직원(인장 담당 관리자)으로 로그인한 상태에서 실행
do $$
declare v uuid;
begin
  if to_regclass('core.profiles') is not null then
    insert into auth.users (email, raw_user_meta_data) values ('dbtest@test.local', '{"name":"DB테스트","department":"경영지원부"}')
    on conflict (email) do nothing;
    select id into v from auth.users where email = 'dbtest@test.local';
    update core.profiles set status = 'active', role = 'admin', admin_modules = '{seal}' where id = v;
    perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, false);
  end if;
end $$;

-- ---------- 공통 ----------
select pg_temp.ok(core.normalize_department('정보보호지원팀') = '정보보호지원부', '부서명 정규화: 정보보호지원팀 → 정보보호지원부');
select pg_temp.ok(core.normalize_department('정보보호지원') = '정보보호지원부', '부서명 정규화: 정보보호지원 → 정보보호지원부');

-- ---------- 회의실 ----------
select meeting.create_reservation('12-3','주간회의','김테스트','정보보호지원팀',4,'2030-03-04 10:00+09','2030-03-04 11:00+09','CODE0001');
select pg_temp.ok((select department from meeting.reservations where title='주간회의') = '정보보호지원부', '회의실 예약 시 부서명 자동 통일');
select pg_temp.expect_error($$select meeting.create_reservation('12-3','겹침','이테스트','감사부',2,'2030-03-04 10:30+09','2030-03-04 11:30+09','CODE0002')$$, 'RESERVATION_CONFLICT%', '회의실: 겹치는 시간 예약 차단');
select pg_temp.ok(meeting.create_reservation('12-3','연속','박테스트','감사부',2,'2030-03-04 11:00+09','2030-03-04 12:00+09','CODE0003') is not null, '회의실: 종료 시각에 바로 이어지는 예약은 허용 [시작,종료)');
select pg_temp.ok(meeting.create_reservation('12-4','다른 방','최테스트','감사부',2,'2030-03-04 10:00+09','2030-03-04 11:00+09','CODE0004') is not null, '회의실: 다른 회의실 같은 시간은 허용');
select pg_temp.expect_error($$select meeting.create_reservation('12-3','15분','정테스트','감사부',2,'2030-03-04 13:15+09','2030-03-04 14:00+09','C')$$, '%meeting_slot_unit%', '회의실: 30분 단위가 아니면 차단');
select pg_temp.expect_error($$select meeting.create_reservation('12-3','야간','정테스트','감사부',2,'2030-03-04 19:30+09','2030-03-04 20:30+09','C')$$, '%meeting_business_hours%', '회의실: 운영시간(08–20시) 밖 차단');
select pg_temp.expect_error($$select meeting.create_reservation('12-2','인원초과','정테스트','감사부',9,'2030-03-04 13:00+09','2030-03-04 14:00+09','C')$$, 'CAPACITY_EXCEEDED%', '회의실: 정원 초과 차단');
select pg_temp.expect_error($$update meeting.reservations set start_at='2030-03-04 10:30+09', end_at='2030-03-04 11:30+09' where title='다른 방' and false or (title='연속')$$, '%meeting_no_overlap%', '회의실: 수정(UPDATE)으로 겹치게 만드는 것도 차단');

-- 취소하면 같은 시간 재예약 가능
select meeting.manage_reservation((select id from meeting.reservations where title='주간회의'), 'code0001', 'cancel');
select pg_temp.ok(meeting.create_reservation('12-3','취소 후 재예약','김테스트','감사부',2,'2030-03-04 10:00+09','2030-03-04 11:00+09','CODE0005') is not null, '회의실: 취소된 시간은 다시 예약 가능');
-- 다른 사람이 만든 예약으로 가정 (본인 예약은 코드 없이 관리 가능)
update meeting.reservations set created_by = null where title = '연속';
select pg_temp.expect_error($$select meeting.manage_reservation((select id from meeting.reservations where title='연속'), 'WRONG', 'cancel')$$, 'INVALID_CODE%', '회의실: 예약코드 불일치 시 취소 차단');

-- 반복예약 all-or-nothing
select pg_temp.ok((meeting.create_recurring_reservations('13-4','스크럼','한테스트','계리부',5,'2030-03-04','2030-03-31',array[1,3],'09:00','09:30','SERIES01')->>'created_count')::int = 8, '반복예약: 4주 × 월·수 = 8회 생성');
select meeting.create_reservation('13-1','단건','오테스트','계리부',3,'2030-03-13 14:00+09','2030-03-13 15:00+09','CODE0006');
select pg_temp.ok((select (r->>'status') = 'conflict' and (r->>'conflict_count')::int = 1 from (select meeting.create_recurring_reservations('13-1','반복','한테스트','계리부',3,'2030-03-04','2030-03-31',array[3],'14:00','15:00','SERIES02') r) x), '반복예약: 1건 충돌 시 충돌 정보 반환');
select pg_temp.ok((select count(*) from meeting.reservations where room_id='13-1') = 1, '반복예약: 충돌 시 한 건도 생성되지 않음 (all-or-nothing)');
select pg_temp.ok(meeting.manage_reservation_series((select series_id from meeting.reservations where title='스크럼' limit 1), 'SERIES01') = 8, '반복예약: 남은 회차 일괄 취소');

-- ---------- 법인차량 ----------
select vehicle.create_reservation('191호8366','2030-03-04 09:00+09','2030-03-04 13:00+09','김신청','감사부','내선1','김신청','pw','외근','서울');
select pg_temp.expect_error($$select vehicle.create_reservation('191호8366','2030-03-04 12:00+09','2030-03-04 15:00+09','이신청','감사부','내선2','이신청','pw','외근','서울')$$, 'VEHICLE_CONFLICT%', '차량: 같은 차량 겹치는 시간 차단');
select pg_temp.ok(vehicle.create_reservation('191호8366','2030-03-04 13:00+09','2030-03-04 15:00+09','박신청','감사부','내선3','박신청','pw','외근','서울') is not null, '차량: 반납 시각 이후 신청은 허용');
select pg_temp.ok(vehicle.create_reservation('146호9979','2030-03-04 09:00+09','2030-03-04 13:00+09','최신청','감사부','내선4','최신청','pw','외근','서울') is not null, '차량: 다른 차량 같은 시간 허용');
update vehicle.reservations set status='반려' where applicant='김신청';
select pg_temp.ok(vehicle.create_reservation('191호8366','2030-03-04 10:00+09','2030-03-04 12:00+09','정신청','감사부','내선5','정신청','pw','외근','서울') is not null, '차량: 반려된 시간은 재신청 가능');
select pg_temp.expect_error($$select vehicle.create_reservation('191호8367','2030-03-05 15:00+09','2030-03-05 14:00+09','a','감사부','1','a','p','x','y')$$, '%vehicle_time_order%', '차량: 반납이 시작보다 빠르면 차단');
update vehicle.reservations set odometer_before=1000, odometer_after=1042, status='사용완료' where applicant='박신청';
select pg_temp.ok((select total_distance from vehicle.reservations where applicant='박신청') = 42, '차량: 주행거리 자동 계산');
select pg_temp.ok((select start_time from vehicle.reservations_legacy where applicant='박신청') = '13:00', '차량: 기존 화면 호환 뷰(start_time) 제공');

-- ---------- 인장 날인 ----------
insert into seal.requests (requester_name, department, contact, seal_kind, purpose, document_name, submit_to, needed_date, quantity, approval_method, approval_doc_no, approver_name, approval_date, need_seal_certificate, seal_certificate_count)
values ('김인장','정보보호지원팀','내선9','법인인감','계약 체결','계약서','A사','2030-03-10',2,'전자결재','경영-001','김부장','2030-03-03',true,1);
select pg_temp.ok((select request_no like 'SEAL-______-0001' and department = '정보보호지원부' from seal.requests where requester_name='김인장'), '인장: 신청번호 자동 발급(SEAL-YYYYMM-0001) · 부서명 통일');
insert into seal.requests (requester_name, department, contact, seal_kind, purpose, document_name, submit_to, needed_date, quantity, approval_method, approval_note, approver_name, approval_date, need_usage_seal_form, usage_seal_form_count)
values ('이인장','감사부','내선8','직인','공문','공문','B기관','2030-03-11',1,'이메일 승인','3/3 이메일로 부서장 승인','이부장','2030-03-03',true,1);
select pg_temp.ok((select request_no like 'SEAL-______-0002' from seal.requests where requester_name='이인장'), '인장: 신청번호 일련번호 증가');
select pg_temp.expect_error($$insert into seal.requests (requester_name, department, contact, seal_kind, purpose, document_name, submit_to, needed_date, quantity, approval_method, approver_name, approval_date) values ('x','감사부','1','직인','a','b','c','2030-03-11',1,'기타','y','2030-03-03')$$, '%seal_approval_evidence%', '인장: 사전 승인 증빙(문서번호 또는 내용) 없으면 차단');
select pg_temp.expect_error($$insert into seal.requests (requester_name, department, contact, seal_kind, purpose, document_name, submit_to, needed_date, quantity, approval_method, approval_doc_no, approver_name, approval_date) values ('x','감사부','1','사용인감','a','b','c','2030-03-11',1,'기타','1','y','2030-03-03')$$, '%foreign key%', '인장: 등록되지 않은 인장 종류 차단 (법인인감·직인만)');
select pg_temp.expect_error($$select seal.transition((select id from seal.requests where requester_name='김인장'), 'seal', '관리자', null, '2030-03-05', '송현우')$$, 'NOT_APPROVED%', '인장: 승인 전 날인완료 차단 (승인 ≠ 날인)');
select seal.transition((select id from seal.requests where requester_name='김인장'), 'review', '송현우');
select seal.transition((select id from seal.requests where requester_name='김인장'), 'approve', '김경영');
select pg_temp.ok(seal.transition((select id from seal.requests where requester_name='김인장'), 'seal', '송현우', null, '2030-03-05', '송현우', true) = '날인완료', '인장: 승인 후 날인완료 등록');
select pg_temp.expect_error($$select seal.transition((select id from seal.requests where requester_name='이인장'), 'reject', '김경영', null)$$, '%seal_reject_reason%', '인장: 반려 사유 없으면 차단');
select pg_temp.ok((select count(*) from seal.request_history where request_id=(select id from seal.requests where requester_name='김인장')) = 4, '인장: 처리 이력 기록 (접수·검토·승인·날인)');
select pg_temp.expect_error($$update seal.request_history set note='조작' where id=(select min(id) from seal.request_history)$$, '%수정하거나 삭제할 수 없습니다%', '인장: 이력 수정 불가');
select pg_temp.expect_error($$delete from seal.request_history$$, '%수정하거나 삭제할 수 없습니다%', '인장: 이력 삭제 불가');
select pg_temp.ok((select count(*) from seal.v_ledger where seal_kind='법인인감') = 1 and (select count(*) from seal.v_ledger where seal_kind='직인') = 0, '인장: 인장 종류별 날인 완료 대장 뷰');
select pg_temp.ok((select certificates from seal.v_request_list where requester_name='이인장') = '사용인감계 1부', '인장: 증명서 발급 희망 표시');

-- ---------- 통합 뷰 ----------
select pg_temp.ok((select count(distinct module_key) from core.v_work_items) = 3, '통합 뷰: 모듈별 항목 집계 (ga 데이터 없음)');
\echo '=== 모든 테스트 통과 ==='
