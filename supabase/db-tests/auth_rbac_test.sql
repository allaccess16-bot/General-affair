-- =====================================================================
-- 직원 로그인·권한(RLS) 검증 — 로컬 전용 (local_auth_stub.sql + 0001~0010 적용 DB)
--   psql -d <db> -f supabase/db-tests/auth_rbac_test.sql
-- =====================================================================
\set QUIET on
\pset format unaligned
\pset tuples_only on
set client_min_messages = warning;

create table if not exists public.t_results (n serial, label text, ok boolean, detail text);
truncate public.t_results;
grant all on public.t_results to anon, authenticated;
grant usage, select on sequence public.t_results_n_seq to anon, authenticated;

-- 현재 역할로 SQL 실행 → 오류 메시지(없으면 'OK')
create or replace function public.t_try(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return 'OK';
exception when others then return sqlerrm; end $$;
create or replace function public.t_val(p_sql text) returns text language plpgsql as $$
declare v text;
begin execute p_sql into v; return v;
exception when others then return 'ERR: ' || sqlerrm; end $$;
create or replace function public.t(p_label text, p_ok boolean, p_detail text default null) returns void language sql as $$
  insert into public.t_results (label, ok, detail) values (p_label, coalesce(p_ok, false), p_detail);
$$;
grant execute on function public.t_try(text), public.t_val(text), public.t(text, boolean, text) to anon, authenticated;

create or replace function public.t_login(p_email text) returns void language plpgsql security definer as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = p_email), 'role', 'authenticated')::text, false);
end $$;
grant execute on function public.t_login(text) to authenticated;

-- 초기화: 테스트 계정 제거 후 가입
delete from core.profiles where email like '%@test.local' or email like '%@gmail.test';
delete from auth.users where email like '%@test.local' or email like '%@gmail.test';
delete from core.profiles;  -- 첫 가입자 = 최고관리자 규칙 검증을 위해 비움
update core.settings set value = 'false' where key = 'auto_approve';
update core.settings set value = '[]' where key = 'allowed_email_domains';

insert into auth.users (email, raw_user_meta_data) values ('boss@test.local', '{"name":"김관리","department":"경영지원부","contact":"7320"}');
insert into auth.users (email, raw_user_meta_data) values ('emp@test.local',  '{"name":"이직원","department":"정보보호지원팀","contact":"7333"}');
insert into auth.users (email, raw_user_meta_data) values ('seal@test.local', '{"name":"박인장","department":"경영지원부","contact":"7111"}');
insert into auth.users (email, raw_user_meta_data) values ('other@test.local','{"name":"최타인","department":"감사부","contact":"7444"}');

select public.t('첫 가입자는 최고관리자로 자동 승인', (select role = 'admin' and status = 'active' from core.profiles where email = 'boss@test.local'));
select public.t('이후 가입자는 승인대기', (select role = 'user' and status = 'pending' from core.profiles where email = 'emp@test.local'));
select public.t('가입 시 부서명 통일(정보보호지원팀→정보보호지원부)', (select department = '정보보호지원부' from core.profiles where email = 'emp@test.local'));

-- ---------- 비로그인 ----------
set role anon;
select set_config('request.jwt.claims', '', false);
select public.t('비로그인: 총무 요청 조회 차단', public.t_try('select count(*) from ga.requests') like 'permission denied%');
select public.t('비로그인: 회의실 예약 조회 차단', public.t_try('select count(*) from meeting.reservations_public') like 'permission denied%');
select public.t('비로그인: 예약 생성 함수 차단', public.t_try($q$select meeting.create_reservation('13-L','x','x','감사부',2,'2031-01-06 10:00+09','2031-01-06 11:00+09','X')$q$) like 'permission denied%');
select public.t('비로그인: 가입용 부서 목록은 조회 가능', public.t_val('select count(*) from core.departments')::int > 0);
reset role;

-- ---------- 승인대기 직원 ----------
set role authenticated;
select public.t_login('emp@test.local');
select public.t('승인대기: 업무 데이터 0건으로 보임', public.t_val('select count(*) from ga.requests') = '0');
select public.t('승인대기: 총무 신청 차단', public.t_try($q$insert into ga.requests (request_date,title,description,requester_name,department,contact,location,category) values (current_date,'t','t','이직원','감사부','1','x','시설/비품')$q$) like '%row-level security%');
select public.t('승인대기: 회의실 예약 차단', public.t_try($q$select meeting.create_reservation('13-L','x','이직원','감사부',2,'2031-01-06 10:00+09','2031-01-06 11:00+09','X')$q$) like 'NOT_AUTHORIZED%');
select public.t('승인대기: 본인 프로필은 조회 가능', public.t_val('select status from core.profiles') = 'pending');
select public.t('승인대기: 스스로 승인 불가', public.t_try($q$select core.admin_update_profile(auth.uid(),'active','admin','{}')$q$) like 'NOT_ADMIN%');
select public.t('프로필 직접 수정 차단', public.t_try($q$update core.profiles set status='active'$q$) like 'permission denied%');
reset role;

-- ---------- 최고관리자: 승인·권한 부여 ----------
set role authenticated;
select public.t_login('boss@test.local');
select public.t('관리자: 전 직원 프로필 조회', public.t_val('select count(*) from core.profiles') = '4');
select public.t('관리자: 직원 승인', public.t_try($q$select core.admin_update_profile((select id from core.profiles where email='emp@test.local'),'active','user','{}')$q$) = 'OK');
select public.t('관리자: 인장 전용 관리자 지정', public.t_try($q$select core.admin_update_profile((select id from core.profiles where email='seal@test.local'),'active','admin','{seal}')$q$) = 'OK');
select public.t('관리자: 잘못된 모듈 지정 거부', public.t_try($q$select core.admin_update_profile((select id from core.profiles where email='other@test.local'),'active','admin','{hr}')$q$) <> 'OK');
select public.t('마지막 최고관리자 강등 차단', public.t_try($q$select core.admin_update_profile(auth.uid(),'active','user','{}')$q$) like 'LAST_ADMIN%');
select public.t('승인 이력이 감사 로그에 기록', public.t_val($q$select count(*) from core.audit_logs where action='profile_update'$q$)::int >= 2);
reset role;

-- ---------- 승인된 일반 직원 ----------
select set_config('test.boss_id', (select id::text from auth.users where email = 'boss@test.local'), false);
set role authenticated;
select public.t_login('emp@test.local');
select public.t('직원: 이관 데이터 조회(총무 61건)', public.t_val($q$select count(*) from ga.requests where legacy_source='ga_v1'$q$) = '61');
select public.t('직원: 회의실 예약 1,643건 조회', public.t_val($q$select count(*) from meeting.reservations_public$q$)::int >= 1643);
select public.t('직원: 총무 수정 비밀번호 컬럼 읽기 차단', public.t_try('select edit_password from ga.requests limit 1') like 'permission denied%');
select public.t('직원: 차량 예약 비밀번호 컬럼 읽기 차단', public.t_try('select reservation_password from vehicle.reservations limit 1') like 'permission denied%');
select public.t('직원: 예약코드 해시 읽기 차단', public.t_try('select manage_code_hash from meeting.reservations limit 1') like 'permission denied%');
select public.t('직원: 다른 직원 프로필 안 보임', public.t_val('select count(*) from core.profiles') = '1');
select public.t('직원: 총무 신청', public.t_try($q$insert into ga.requests (request_date,title,description,requester_name,department,contact,location,category,created_by) values (current_date,'권한테스트','t','이직원','감사부','1','x','시설/비품',auth.uid())$q$) = 'OK');
select public.t('직원: 남의 이름으로 신청(작성자 위조) 차단', public.t_try($q$insert into ga.requests (request_date,title,description,requester_name,department,contact,location,category,created_by) values (current_date,'위조','t','x','감사부','1','x','시설/비품',current_setting('test.boss_id')::uuid)$q$) like '%row-level security%');
select public.t('직원: 총무 상태 직접 변경 불가(0건 반영)', public.t_val($q$with u as (update ga.requests set status='완료' where title='권한테스트' returning 1) select count(*) from u$q$) = '0');
select public.t('직원: 본인 총무 요청은 비밀번호 없이 수정', public.t_try($q$select ga.edit_request((select id from ga.requests where title='권한테스트'),'', '권한테스트','수정됨','y')$q$) = 'OK');
select public.t('직원: 남의 이관 요청은 비밀번호 필요', public.t_try($q$select ga.edit_request((select id from ga.requests where legacy_id='00594087-6bb4-4495-8437-d2bab3b76c0e'),'wrong','a','b','c')$q$) like 'INVALID_PASSWORD%');
select public.t('직원: 이관 요청도 기존 비밀번호로 수정 가능', public.t_try($q$select ga.edit_request((select id from ga.requests where legacy_id='00594087-6bb4-4495-8437-d2bab3b76c0e'),'2528','에어컨 고장','대전 방카사무실 에어컨 고장','대전')$q$) = 'OK');
select public.t('직원: 총무 요청 삭제 불가(0건)', public.t_val($q$with d as (delete from ga.requests where title='권한테스트' returning 1) select count(*) from d$q$) = '0');

select public.t('직원: 회의실 예약', public.t_try($q$select meeting.create_reservation('13-L','권한테스트','이직원','감사부',2,'2031-01-06 10:00+09','2031-01-06 11:00+09','')$q$) = 'OK');
select public.t('직원: 본인 예약은 예약코드 없이 취소', public.t_try($q$select meeting.manage_reservation((select id from meeting.reservations_public where title='권한테스트'),'','cancel')$q$) = 'OK');
select public.t('직원: 내 예약 목록', public.t_val('select count(*) from meeting.my_reservation_ids()') = '1');
select public.t('직원: 남의 예약은 코드 없이 취소 불가', public.t_try($q$select meeting.manage_reservation((select id from meeting.reservations_public where status='reserved' and start_at > now() limit 1),'','cancel')$q$) = 'INVALID_CODE');
select public.t('직원: 관리자 강제취소 불가', public.t_try($q$select meeting.admin_cancel_reservation((select id from meeting.reservations_public where status='reserved' limit 1))$q$) like 'NOT_ADMIN%');
select public.t('직원: 회의실 운영중지 변경 불가(0건)', public.t_val($q$with u as (update meeting.rooms set active=false where id='13-L' returning 1) select count(*) from u$q$) = '0');
select public.t('직원: 반복예약(권한 래퍼)', public.t_val($q$select meeting.create_recurring_reservations('13-L','권한반복','이직원','감사부',2,'2031-02-03','2031-02-14','{1,3}','10:00','11:00','')->>'status'$q$) = 'created');
select public.t('직원: 반복예약 작성자 기록', public.t_val($q$select count(*) from meeting.my_reservation_ids()$q$) = '5');
select public.t('직원: 내부 함수 직접 호출 차단', public.t_try($q$select meeting.create_recurring_reservations_core('13-L','x','x','감사부',2,'2031-03-03','2031-03-03','{1}','10:00','11:00','')$q$) like 'permission denied%');

select public.t('직원: 차량 신청', public.t_try($q$select vehicle.create_reservation('191호8367','2031-01-06 09:00+09','2031-01-06 12:00+09','이직원','감사부','7333','이직원','','권한테스트','본사')$q$) = 'OK');
select public.t('직원: 차량 승인(상태 변경) 불가(0건)', public.t_val($q$with u as (update vehicle.reservations set status='승인' where purpose='권한테스트' returning 1) select count(*) from u$q$) = '0');
select public.t('직원: 본인 차량 신청은 비밀번호 없이 수정', public.t_try($q$select vehicle.update_reservation((select id from vehicle.reservations_legacy where purpose='권한테스트'),'','191호8367','2031-01-06 09:00+09','2031-01-06 13:00+09','권한테스트','본사','이직원','7333')$q$) = 'OK');

select public.t('직원: 인장 신청', public.t_try($q$insert into seal.requests (requester_name,department,contact,seal_kind,purpose,document_name,submit_to,needed_date,quantity,approval_method,approval_doc_no,approver_name,approval_date,created_by) values ('이직원','감사부','7333','법인인감','권한테스트','계약서','은행',current_date+3,1,'전자결재','D-1','부장',current_date,auth.uid())$q$) = 'OK');
select public.t('직원: 인장 승인 불가', public.t_try($q$select seal.transition((select id from seal.requests where purpose='권한테스트'),'approve','이직원')$q$) like 'NOT_ADMIN%');
select public.t('직원: 인장 상태 직접 변경 불가(0건)', public.t_val($q$with u as (update seal.requests set status='승인' where purpose='권한테스트' returning 1) select count(*) from u$q$) = '0');
select public.t('직원: 처음부터 승인 상태로 신청 불가', public.t_try($q$insert into seal.requests (requester_name,department,contact,seal_kind,purpose,document_name,submit_to,needed_date,quantity,approval_method,approval_doc_no,approver_name,approval_date,created_by,status,approved_at) values ('이직원','감사부','7333','직인','위조','x','x',current_date+3,1,'전자결재','D-2','부장',current_date,auth.uid(),'승인',now())$q$) like '%row-level security%');
select public.t('직원: 처리 이력 수정 불가', public.t_try($q$update seal.request_history set actor='x'$q$) like 'permission denied%');
reset role;

-- ---------- 인장 전용 관리자 ----------
set role authenticated;
select public.t_login('seal@test.local');
select public.t('인장관리자: 승인 가능', public.t_val($q$select seal.transition((select id from seal.requests where purpose='권한테스트'),'approve','아무개')$q$) = '승인');
select public.t('인장관리자: 처리자는 로그인 이름으로 기록', public.t_val($q$select actor from seal.request_history where action='승인' order by at desc limit 1$q$) = '박인장');
select public.t('인장관리자: 날인 완료', public.t_val($q$select seal.transition((select id from seal.requests where purpose='권한테스트'),'seal','x',null,current_date,null,true)$q$) = '날인완료');
select public.t('인장관리자: 회의실 관리 권한 없음', public.t_try($q$select meeting.admin_cancel_reservation((select id from meeting.reservations_public where status='reserved' limit 1))$q$) like 'NOT_ADMIN%');
select public.t('인장관리자: 직원 승인(최고관리자 기능) 불가', public.t_try($q$select core.admin_update_profile((select id from core.profiles limit 1),'active','user','{}')$q$) like 'NOT_ADMIN%');
reset role;

-- ---------- 최고관리자: 모듈 처리 ----------
set role authenticated;
select public.t_login('boss@test.local');
select public.t('관리자: 총무 상태 변경', public.t_val($q$with u as (update ga.requests set status='완료' where title='권한테스트' returning 1) select count(*) from u$q$) = '1');
select public.t('관리자: 차량 승인', public.t_val($q$with u as (update vehicle.reservations set status='승인' where purpose='권한테스트' returning 1) select count(*) from u$q$) = '1');
select public.t('관리자: 반복예약 전체취소', public.t_val($q$select meeting.admin_cancel_series((select series_id from meeting.reservations_public where title='권한반복' limit 1))$q$) = '4');
select public.t('관리자: 직원 이용중지', public.t_try($q$select core.admin_update_profile((select id from core.profiles where email='other@test.local'),'disabled','user','{}')$q$) = 'OK');
reset role;

-- ---------- 이용중지 직원 ----------
set role authenticated;
select public.t_login('other@test.local');
select public.t('이용중지: 데이터 안 보임', public.t_val('select count(*) from meeting.reservations_public') = '0');
reset role;

-- ---------- 가입 도메인 제한 ----------
update core.settings set value = '["test.local"]' where key = 'allowed_email_domains';
select public.t('허용 도메인 외 가입 차단', public.t_try($q$insert into auth.users (email) values ('x@gmail.test')$q$) like 'EMAIL_DOMAIN_NOT_ALLOWED%');
update core.settings set value = '[]' where key = 'allowed_email_domains';

-- 결과
\pset tuples_only off
\pset format aligned
select n, case when ok then 'PASS' else 'FAIL' end as result, label from public.t_results order by n;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail from public.t_results;

-- 정리
delete from meeting.reservations where title in ('권한테스트','권한반복');
delete from vehicle.reservations where purpose = '권한테스트';
delete from ga.requests where title = '권한테스트';
