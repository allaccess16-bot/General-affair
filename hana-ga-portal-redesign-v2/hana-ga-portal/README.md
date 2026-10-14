# HANA WORKS · 하나생명 경영지원 통합 포털 (디자인 시안 v0.2)

Next.js App Router + React + Tailwind CSS + Framer Motion + Recharts 기반의 **디자인 검토용 프로토타입**입니다.

## 개선 내용
- 프리미엄 히어로 비주얼 (로컬 SVG 에셋), 그린 브랜드 스타일
- 빠른 업무 실행 바: 업무 선택 / 희망 일자 / 상태 / 부서
- 4개 업무 모듈별 이미지형 카드, 애니메이션, 호버 효과
- 월별 추이 Recharts, KPI 및 업무 활용도 시각화
- 운영 안내 영역, FAQ 아코디언, 공지사항
- 기존 업무 메뉴, 상태 검색, 샘플 신청 모달 유지
- 모바일 사이드바 및 반응형 그리드

## 로컬 실행
```bash
npm install
npm run dev
```
브라우저에서 http://localhost:3000 접속.

## GitHub 업로드 / Vercel 배포
1. ZIP 압축 해제 후 `hana-ga-portal` 폴더 안의 소스 파일들을 GitHub에 업로드합니다.
2. 현재 GitHub 저장소가 `General-affair/hana-ga-portal/package.json` 구조라면 **Root Directory = `hana-ga-portal`** 입니다.
3. Vercel Application Preset은 **Next.js**를 선택합니다.
4. Build and Output Settings 기본값, 환경 변수 없음 (디자인 시안 기준) 후 Deploy 합니다.
5. GitHub의 기본 브랜치(main)에 파일이 반영되어야 Vercel 운영 사이트가 갱신됩니다.

## 주의
- 표시된 KPI, 신청 내역 및 공지는 전부 **가상 샘플 데이터**입니다.
- 새 신청은 메모리 상태에만 저장되어 새로고침 시 없어집니다.
- 권한 검증, 로그인, 실제 회의실/차량 예약, 인장 승인은 구현되어 있지 않습니다.
- 날짜·부서 UI 필드는 디자인 시연용이며 실제 DB 조회 조건에 반영되지 않습니다.
- 인장 원본 이미지 또는 실제 사내 데이터는 포함되지 않았습니다.
- 로컬 SVG는 기존 공개 이미지에 의존하지 않아 네트워크와 무관하게 표시됩니다.

## 배포 전 체크
`npm run build`로 빌드 후 배포하세요. Vercel 설치·빌드 환경에서 오류가 나면 Build Logs를 확인하세요.
