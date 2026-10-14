# 새 통합 DB (Supabase / PostgreSQL)

| 파일 | 내용 |
|---|---|
| `migrations/20261014000001_core.sql` | 확장(btree_gist, pgcrypto), 스키마, 부서(정보보호지원부 통일 + 별칭), 감사 로그(수정·삭제 불가) |
| `migrations/20261014000002_ga.sql` | 총무 업무요청 `ga.requests` (기존 `requests` 구조) |
| `migrations/20261014000003_vehicle.sql` | 법인차량 `vehicle.vehicles`, `vehicle.reservations` + **중복 배차 DB 차단**, 기존 화면 호환 뷰 |
| `migrations/20261014000004_meeting.sql` | 회의실 `meeting.rooms`, `meeting.reservations` + **중복 예약 DB 차단**, 예약·반복예약·입실확인·취소·자동취소 함수 |
| `migrations/20261014000005_seal.sql` | 인장 날인 `seal.requests` (법인인감/직인, 사전 승인 증빙, 증명서 발급 희망), 신청번호 자동 발급, 상태 전이 함수, 이력(추가만), 출력용 뷰 |
| `migrations/20261014000006_portal.sql` | 통합 대시보드 뷰 `core.v_work_items` |
| `migrations/20261014000007_meeting_cron.sql` | 회의실 자동취소·자동완료 1분 스케줄 (pg_cron) |
| `migrations/20261014000008_api_access.sql` | 화면(REST API) 접근 권한, 예약코드 조회·관리자 취소·차량 수정/운행완료·총무 수정 함수 |
| `migrations/20261014000009_ga_desired_date.sql` | 총무 요청 희망 처리일(desired_date) 컬럼 — 기존 데이터 보존용 |
| `migrations/20261014000010_auth_rbac.sql` | 직원 로그인·관리자 권한: core.profiles(가입 승인), 모듈별 관리자, 전 테이블 RLS, 비밀번호 컬럼 읽기 차단, 비로그인 차단 |
| `db-tests/local_api_roles.sql` | 로컬 PostgreSQL에서 Supabase API 역할을 흉내내는 테스트 준비 (Supabase에서는 실행 금지) |
| `import/legacy_import.sql` | 기존 3개 시스템 CSV → 새 DB 이관 (멱등, 제외 건 사유 기록, 건수 검증 뷰) |
| `db-tests/run_tests.sql` | 제약·함수 검증 36개 |
| `db-tests/concurrency_test.sh` | 동시 20건 예약 경합 → 1건만 저장되는지 확인 |
| `db-tests/import_test.sql` | 이관 스크립트 검증 (겹치는 기존 예약 분리, 재실행 중복 없음) |

## 중복예약 차단 방식

```sql
constraint meeting_no_overlap exclude using gist (
  room_id with =,
  tstzrange(start_at, end_at, '[)') with &&
) where (status in ('reserved', 'checked_in'))
```

- 같은 회의실(차량)에서 **활성 상태** 예약의 시간 구간이 겹치면 INSERT·UPDATE가 DB에서 거부됩니다.
- 화면 검사와 무관하게 동작하므로 **여러 사람이 동시에 신청해도 1건만 저장**됩니다(트랜잭션·격리수준과 무관).
- `[)` 반열린 구간이라 10:00–11:00 다음 11:00–12:00 예약은 허용됩니다.
- 취소·자동취소·사용완료(차량은 반려·사용완료)는 점유하지 않으므로 같은 시간을 다시 예약할 수 있습니다.
- 반복예약은 전체 회차를 한 트랜잭션에서 INSERT → 1건이라도 겹치면 전체 롤백(all-or-nothing). 충돌 목록은 사전 조회로 반환합니다.
- 회의실은 추가로 30분 단위·운영시간(08–20시)·정원·운영중지를 DB에서 검사합니다.

## GitHub 연동으로 적용 (권장)

1. Supabase New project → **Connect GitHub** → 저장소 `allaccess16-bot/General-affair` 선택
2. Supabase directory: `supabase` (기본값) · Production branch: `main`
3. Project Settings → Integrations → GitHub에서 **Deploy to production**을 켜고 Production branch를 `main`으로 지정
4. 그 다음부터 `main`에 반영되면 `supabase/migrations/` 파일이 이름(타임스탬프) 순서대로 자동 적용됩니다. 이미 적용된 파일은 다시 실행되지 않습니다.
5. 생성 후 Dashboard → Settings → API → **Exposed schemas**에 `core, ga, vehicle, meeting, seal` 추가
6. 회의실 자동취소 스케줄(pg_cron)은 `…_meeting_cron.sql`이 자동으로 켜고 등록합니다. 확인: `select jobname, schedule from cron.job;`

> 새 마이그레이션은 기존 파일을 고치지 말고 **새 파일**(`YYYYMMDDHHMMSS_설명.sql`)로 추가합니다. 이미 적용된 파일을 수정해도 원격 DB에는 다시 적용되지 않습니다.

## 수동 적용 방법

```bash
# Supabase CLI
supabase db push            # migrations/ 순서대로 적용

# 또는 psql
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
psql "$TEST_DATABASE_URL" -f supabase/db-tests/run_tests.sql   # 빈 테스트 DB에서만 실행 (운영 DB 금지)
```

회의실 자동취소/자동완료는 pg_cron으로 1분마다 실행합니다.

```sql
select cron.schedule('meeting-sweep', '* * * * *', 'select meeting.sweep_statuses()');
```

> 권한·RLS 정책은 현재 범위에서 제외했습니다. 운영 전 별도 마이그레이션으로 추가합니다.
> Supabase에서 `core`·`ga`·`vehicle`·`meeting`·`seal` 스키마를 API로 노출하려면 Settings → API → Exposed schemas에 추가합니다.
