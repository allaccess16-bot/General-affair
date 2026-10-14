# HANA WORKS — 총무 통합 업무 지원 시스템 (디자인 프로토타입)

하나생명 경영지원부의 **총무 업무 지원 / 법인차량 이용 / 회의실 예약 / 인장 날인 관리**를 한 공간에서 제공하는 반응형 UI 시안입니다.
브랜드 랜딩페이지와 업무 대시보드를 결합한 기업형 포털 스타일로 리디자인했습니다.

## 화면 구성

| 경로 | 내용 |
|---|---|
| `/` | 히어로(타이틀·CTA·메인 비주얼), 빠른 실행/검색 바, KPI 인포그래픽, 업무 모듈 카드 4종, 최근 신청 내역 + 진행 상태·월별 추이 차트, 표준 업무 흐름, 관리자 정보 카드, 운영 통계, 공지사항·자주 찾는 메뉴·가이드·FAQ |
| `/ga` `/vehicle` `/meeting` `/seal` | 모듈 배너, 좌측 서브 메뉴, 요약 통계, 모듈별 하이라이트(유형별 통계 / 차량 현황 / 회의실 타임라인 / 날인 진행 단계·사용대장), 검색·필터 신청 내역 |
| `/admin` | 모듈별 대기·진행·완료, 기간별 통계, 전체 신청 현황(필터 + 엑셀 CSV 다운로드), 사용자·권한 요약, 감사 로그 |

공통: 상단 내비게이션(스크롤 시 글래스 효과), 통합 검색 팝오버, 알림 팝오버, 모바일 메뉴·하단 탭 바, 신청 모달(데모용, 브라우저 메모리에만 반영).

> **주의**: 디자인 검토용입니다. KPI·신청·통계는 모두 `lib/data.ts`의 샘플 데이터이며, 실제 사용자 인증·DB·승인·예약 충돌 검증은 구현되어 있지 않습니다. 코드를 그대로 업무 운영에 사용하지 마세요.

## 기술 스택

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Lucide React · Pretendard(CDN)

## 폴더 구조

```
app/                 # 라우트 (layout, page, ga, vehicle, meeting, seal, admin)
components/
  ui/                # Button, Card, Badge/StatusBadge, Reveal/Stagger, CountUp, SelectField
  layout/            # 헤더, 푸터, 모바일 탭 바, 로고
  home/              # 메인 화면 섹션
  charts/            # Recharts 차트, 미터, 툴팁
  modules/           # 모듈 공통 페이지, 하이라이트, 신청 테이블, 신청 모달
  admin/             # 관리자 센터
  art/               # SVG 일러스트 (외부 이미지 없음)
  providers/         # 데모용 신청 상태 저장소
lib/                 # 모듈 정의, 샘플 데이터, 유틸
docs/                # 1단계 분석·설계 문서
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

1. Vercel에서 **Add New → Project → Import Git Repository** 로 이 저장소를 선택합니다.
2. Framework Preset은 **Next.js** 로 자동 인식됩니다. **Deploy** 를 누릅니다.
3. 현재 디자인 프로토타입에는 별도 환경변수가 필요하지 않습니다.

## 향후 작업

1. 기존 세 앱의 소스/DB 구조 분석 및 스키마 매핑 (`docs/` 참고)
2. 공통 로그인과 역할별 권한(RBAC/RLS) 및 직원 정보 연결
3. 기존 기능을 모듈로 통합하고 데이터 마이그레이션 검증
4. 인장 신청/승인/날인 완료와 사용대장 데이터 모델 및 감사 로그 구현
5. 실제 KPI/통계 집계, 알림, 파일 관리 및 기능 테스트

## 참고

디자인은 하나생명의 녹색 계열을 활용한 **컨셉 시안**이며 공식 로고 파일을 포함하지 않습니다. HANA WORKS 로고 심벌은 임시 그래픽입니다.
