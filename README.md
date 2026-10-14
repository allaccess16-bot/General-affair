# HANA WORKS — 총무 통합 업무 지원 시스템 (디자인 프로토타입)

하나생명 경영지원부의 **총무 업무 지원 / 법인차량 이용 / 회의실 예약 / 인장 날인 관리**를 한 공간에서 제공하는 반응형 UI 시안입니다.
브랜드 랜딩페이지와 업무 대시보드를 결합한 기업형 포털 스타일로 리디자인했습니다.

## 화면 구성

| 경로 | 내용 |
|---|---|
| `/` | 히어로(타이틀·CTA·메인 비주얼), 빠른 실행/검색 바, KPI 인포그래픽, 업무 모듈 카드 4종, 최근 신청 내역 + 진행 상태·월별 추이 차트, 표준 업무 흐름, 관리자 정보 카드, 운영 통계, 공지사항·자주 찾는 메뉴·가이드·FAQ |
| `/ga` | **기존 총무 업무요청 기능 이식** — 요청 등록·조회·상세·비밀번호 수정, 관리자 처리(상태·담당자·완료일·메모·삭제), 상세 리포트(.xls), 통계 |
| `/vehicle` | **기존 법인차량 배차 기능 이식** — K5 3대, 3단계 신청·실시간 중복 검사, 7일 예약 현황, 신청 수정, 운행 완료 기록, 관리자 승인·반려, 운행기록부(.xls) |
| `/meeting` | **기존 회의실 예약 V2.10 기능 이식 + UI 개편** — 한눈에 보기(지금 상태판·빠른 찾기·하루 예약 현황표), 월간 달력, 회의실별 7일, 단일/반복 예약(충돌 차단), 예약코드·입실확인·자동취소, 관리자 콘솔 |
| `/seal` | **신규 인장 날인** — 법인인감/직인, 사전 승인 증빙, 인감증명서·사용인감계 발급 희망, 검토·승인·반려·날인완료(승인과 분리), 처리 이력, 날인 요청 목록·날인 완료 대장 인장별 출력(인쇄/Excel) |
| `/admin` | 모듈별 대기·진행·완료, 기간별 통계, 전체 신청 현황(필터 + 엑셀 CSV 다운로드), 사용자·권한 요약, 감사 로그 |

공통: 상단 내비게이션(스크롤 시 글래스 효과), 통합 검색 팝오버, 알림 팝오버, 모바일 메뉴·하단 탭 바, 신청 모달(데모용, 브라우저 메모리에만 반영).

## 동작 모드

| 모드 | 조건 | 데이터 |
|---|---|---|
| **실DB 모드** | 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 | 새 통합 DB(Supabase)에 저장 · 모든 사용자가 공유 · 20초마다 갱신 · 중복예약/상태전이/신청번호는 DB가 검증 |
| 데모 모드 | 환경변수 없음 | 이 브라우저(localStorage)에만 저장 · 샘플 데이터(비밀번호 `1234`) · 푸터 ‘데모 데이터 초기화’ |

헤더의 배지(`DB 연결` / `데모`)로 현재 모드를 확인할 수 있습니다. ‘일반 직원/관리자’ 버튼은 권한 체험용이며, 로그인·권한 정책은 다음 단계에서 적용합니다. 기존 소스 분석과 보안 점검 결과는 `docs/04-기존시스템-소스분석-결과.md`를 참고하세요.

## 기술 스택

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Lucide React · Pretendard(CDN)

## 폴더 구조

```
app/                 # 라우트 (layout, page, ga, vehicle, meeting, seal, admin)
components/
  ui/                # Button, Card, Badge, Modal, Form(Field·Tabs·Notice), Reveal/Stagger, CountUp
  ga/ vehicle/ meeting/  # 기존 3개 시스템 기능을 이식한 모듈 화면
  layout/            # 헤더, 푸터, 모바일 탭 바, 로고
  home/              # 메인 화면 섹션
  charts/            # Recharts 차트, 미터, 툴팁
  modules/           # 모듈 공통 페이지, 하이라이트, 신청 테이블, 신청 모달
  admin/             # 관리자 센터
  art/               # SVG 일러스트 (외부 이미지 없음)
  providers/         # 업무 데이터 저장소 (실DB/데모 모드), 통합 신청 목록
lib/                 # 모듈 정의, 유틸
  ga/ vehicle/ meeting/  # 기존 테이블 구조(타입)·업무 규칙·엑셀 서식
  seed.ts            # 데모 초기 데이터 (기존 구조와 동일한 필드)
  portal.ts          # 모듈 데이터 → 통합 대시보드 공통 항목 변환
  db/live.ts         # 새 통합 DB(Supabase) 조회·저장 계층
docs/                # 분석·설계 문서
supabase/            # 새 통합 DB 마이그레이션 SQL · 이관 스크립트 · DB 테스트 (supabase/README.md)
```

색상 토큰은 `app/globals.css`의 `@theme`에 있습니다. 브랜드 그린(`--color-brand-*`)은 임시 값이므로 공식 브랜드 가이드 HEX를 받으면 이 값만 바꾸면 됩니다.

## 로컬 실행

Node.js 20 이상 권장.

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

## GitHub 및 Vercel 배포

1. Vercel에서 **Add New → Project → Import Git Repository** 로 이 저장소를 선택합니다. (Root Directory: `./`)
2. Framework Preset은 **Next.js** 로 자동 인식됩니다.
3. **Settings → Environment Variables**에 아래 두 값을 추가하고 다시 배포(Redeploy)하면 실DB 모드로 동작합니다 (`.env.example` 참고).
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase → Project Settings → API Keys의 anon(publishable) 키
   > `service_role`(secret) 키는 절대 넣지 마세요.

## 향후 작업

1. 기존 세 앱의 소스/DB 구조 분석 및 스키마 매핑 (`docs/` 참고)
2. 공통 로그인과 역할별 권한(RBAC/RLS) 및 직원 정보 연결
3. 기존 기능을 모듈로 통합하고 데이터 마이그레이션 검증
4. 인장 신청/승인/날인 완료와 사용대장 데이터 모델 및 감사 로그 구현
5. 실제 KPI/통계 집계, 알림, 파일 관리 및 기능 테스트

## 참고

디자인은 하나생명의 녹색 계열을 활용한 **컨셉 시안**이며 공식 로고 파일을 포함하지 않습니다. HANA WORKS 로고 심벌은 임시 그래픽입니다.
