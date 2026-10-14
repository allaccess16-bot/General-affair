\set QUIET on
\i /tmp/hw_import/legacy_import.sql
truncate legacy_import.requests, legacy_import.vehicle_reservations, legacy_import.meeting_reservations, legacy_import.rejected;
insert into legacy_import.requests values
 ('L1','2026-10-01','정수기 점검','물샘','장민준','경영지원부','1105','1234','5층','시설/비품','긴급','완료','장민준','완료','2026-10-02T00:00:00Z','2026-10-01T01:00:00Z',null),
 ('L2','2026-10-02','출입증','분실','윤채원','정보보호지원팀','1882','1234','1층','출입증/보안','보통','접수',null,null,null,'2026-10-02T01:00:00Z',null);
insert into legacy_import.vehicle_reservations (id, vehicle_name, vehicle_number, use_date, start_date, start_time, end_date, end_time, applicant, department, contact, driver, purpose, destination, status, created_at) values
 ('V1','K5','191호8366','2026-10-05','2026-10-05','09:00','2026-10-05','12:00','최하준','상품부','2412','최하준','방문','판교','승인','2026-10-01T00:00:00Z'),
 ('V2','K5','191호8366','2026-10-05','2026-10-05','11:00','2026-10-05','13:00','임서준','GA사업부','3105','임서준','방문','강남','신청','2026-10-02T00:00:00Z'),
 ('V3','K5','191호8366','2026-10-05','2026-10-05','11:00','2026-10-05','13:00','조아인','영업기획부','3021','조아인','수령','마포','반려','2026-10-03T00:00:00Z');
insert into legacy_import.meeting_reservations (id, room_id, title, organizer_name, department, attendee_count, start_at, end_at, status, manage_code_hash, created_at) values
 ('M1','12-3','주간회의','박지민','정보보호지원','6','2026-10-06T10:00:00+09:00','2026-10-06T11:00:00+09:00','completed','h1','2026-10-01T00:00:00Z');
select * from legacy_import.run();
select * from legacy_import.run();  -- 재실행: 모두 skipped_existing
select * from legacy_import.verify;
select source, legacy_id, left(reason, 60) as reason from legacy_import.rejected;
select department from ga.requests where legacy_id='L2';
