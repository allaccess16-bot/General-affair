/**
 * 디자인 검토용 샘플 데이터입니다. 실제 운영 데이터가 아니며,
 * 실데이터 연결 시 이 파일의 내보내기를 API/DB 조회로 교체합니다.
 */
import type { ModuleKey } from "./modules";

export type RequestStatus = "접수" | "진행중" | "승인대기" | "승인완료" | "완료" | "반려" | "취소";

export type WorkRequest = {
  id: string;
  no: string;
  module: ModuleKey;
  title: string;
  requester: string;
  dept: string;
  requestedAt: string; // YYYY-MM-DD
  scheduledAt: string; // 표시용 일정
  status: RequestStatus;
  urgent?: boolean;
};

export const DEPARTMENTS = [
  "경영지원부",
  "인사부",
  "재무회계부",
  "상품개발부",
  "고객지원부",
  "영업기획부",
  "리스크관리부",
  "디지털혁신부",
];

export const STATUSES: RequestStatus[] = ["접수", "진행중", "승인대기", "승인완료", "완료", "반려", "취소"];

export const TODAY = "2026-10-14";

export const SAMPLE_REQUESTS: WorkRequest[] = [
  { id: "r1", no: "GA-202610-0142", module: "ga", title: "3층 회의실 프로젝터 램프 교체", requester: "김서윤", dept: "디지털혁신부", requestedAt: "2026-10-14", scheduledAt: "10.15 (목) 오전", status: "접수", urgent: true },
  { id: "r2", no: "MR-202610-0388", module: "meeting", title: "대회의실 A · 분기 실적 보고", requester: "이도현", dept: "영업기획부", requestedAt: "2026-10-14", scheduledAt: "10.16 (금) 14:00–16:00", status: "승인완료" },
  { id: "r3", no: "SEAL-202610-0021", module: "seal", title: "법인인감 · 임대차 계약서", requester: "박지민", dept: "재무회계부", requestedAt: "2026-10-14", scheduledAt: "10.17 (토) 필요", status: "승인대기", urgent: true },
  { id: "r4", no: "VH-202610-0097", module: "vehicle", title: "카니발 · 판교 협력사 방문", requester: "최하준", dept: "상품개발부", requestedAt: "2026-10-13", scheduledAt: "10.15 (목) 09:00–13:00", status: "승인완료" },
  { id: "r5", no: "GA-202610-0141", module: "ga", title: "신규 입사자 사무용품 세트 지급 (5명)", requester: "정유나", dept: "인사부", requestedAt: "2026-10-13", scheduledAt: "10.14 (수)", status: "진행중" },
  { id: "r6", no: "SEAL-202610-0020", module: "seal", title: "사용인감 · 보험금 지급 확인서", requester: "한지우", dept: "고객지원부", requestedAt: "2026-10-13", scheduledAt: "10.14 (수) 필요", status: "완료" },
  { id: "r7", no: "MR-202610-0386", module: "meeting", title: "소회의실 3 · 주간 스크럼 (매주 반복)", requester: "오시우", dept: "디지털혁신부", requestedAt: "2026-10-12", scheduledAt: "매주 월 10:00–10:30", status: "승인완료" },
  { id: "r8", no: "VH-202610-0096", module: "vehicle", title: "아이오닉5 · 금융감독원 서류 제출", requester: "윤채원", dept: "리스크관리부", requestedAt: "2026-10-12", scheduledAt: "10.14 (수) 13:30–15:30", status: "진행중" },
  { id: "r9", no: "GA-202610-0139", module: "ga", title: "5층 탕비실 정수기 점검", requester: "장민준", dept: "경영지원부", requestedAt: "2026-10-12", scheduledAt: "10.13 (화)", status: "완료" },
  { id: "r10", no: "SEAL-202610-0019", module: "seal", title: "대표이사 직인 · 업무협약서", requester: "임서준", dept: "영업기획부", requestedAt: "2026-10-11", scheduledAt: "10.13 (화) 필요", status: "반려" },
  { id: "r11", no: "MR-202610-0381", module: "meeting", title: "중회의실 B · 리스크 위원회", requester: "강예린", dept: "리스크관리부", requestedAt: "2026-10-10", scheduledAt: "10.20 (화) 15:00–17:00", status: "접수" },
  { id: "r12", no: "VH-202610-0094", module: "vehicle", title: "그랜저 · 임원 외부 일정 수행", requester: "송현우", dept: "경영지원부", requestedAt: "2026-10-10", scheduledAt: "10.13 (화) 종일", status: "완료" },
  { id: "r13", no: "GA-202610-0137", module: "ga", title: "명함 제작 요청 (200매)", requester: "조아인", dept: "상품개발부", requestedAt: "2026-10-09", scheduledAt: "10.16 (금)", status: "진행중" },
  { id: "r14", no: "SEAL-202610-0018", module: "seal", title: "법인인감 · 은행 여신 약정서", requester: "백승호", dept: "재무회계부", requestedAt: "2026-10-09", scheduledAt: "10.15 (목) 필요", status: "승인완료" },
  { id: "r15", no: "MR-202610-0377", module: "meeting", title: "대회의실 B · 신상품 런칭 리허설", requester: "서지아", dept: "상품개발부", requestedAt: "2026-10-08", scheduledAt: "10.19 (월) 13:00–18:00", status: "취소" },
  { id: "r16", no: "GA-202610-0135", module: "ga", title: "사무실 좌석 재배치 지원", requester: "문태오", dept: "고객지원부", requestedAt: "2026-10-08", scheduledAt: "10.24 (토)", status: "승인대기" },
];

/** 대시보드 KPI (샘플) */
export const KPI = {
  todayReceived: 27,
  inProgress: 41,
  meetingToday: 36,
  vehicleToday: 9,
  sealPending: 7,
  todayDone: 18,
  approvalWaiting: 12,
  unprocessed: 5,
};

/** 월별 신청 현황 (모듈별 · 샘플) */
export const MONTHLY = [
  { month: "5월", ga: 112, vehicle: 64, meeting: 298, seal: 0 },
  { month: "6월", ga: 128, vehicle: 71, meeting: 312, seal: 0 },
  { month: "7월", ga: 119, vehicle: 83, meeting: 287, seal: 0 },
  { month: "8월", ga: 104, vehicle: 69, meeting: 254, seal: 18 },
  { month: "9월", ga: 137, vehicle: 88, meeting: 331, seal: 46 },
  { month: "10월", ga: 142, vehicle: 97, meeting: 388, seal: 21 },
].map((m) => ({ ...m, total: m.ga + m.vehicle + m.meeting + m.seal }));

/** 진행 상태 분포 (이번 달 · 샘플) */
export const STATUS_BREAKDOWN = [
  { status: "접수", value: 48 },
  { status: "진행중", value: 41 },
  { status: "승인대기", value: 12 },
  { status: "완료", value: 412 },
  { status: "반려·취소", value: 23 },
];

/** 회의실 이용률 (이번 달 업무시간 기준 · 샘플) */
export const ROOM_UTILIZATION = [
  { room: "대회의실 A", floor: "12F", seats: 24, rate: 86 },
  { room: "대회의실 B", floor: "12F", seats: 20, rate: 78 },
  { room: "중회의실 A", floor: "10F", seats: 12, rate: 71 },
  { room: "중회의실 B", floor: "10F", seats: 12, rate: 64 },
  { room: "소회의실 1", floor: "8F", seats: 6, rate: 92 },
  { room: "소회의실 2", floor: "8F", seats: 6, rate: 58 },
  { room: "소회의실 3", floor: "8F", seats: 4, rate: 47 },
];

/** 차량 이용 현황 (이번 달 · 샘플) */
export const VEHICLE_USAGE = [
  { vehicle: "카니발", plate: "12가 3456", trips: 28, km: 1420, state: "운행중" as const },
  { vehicle: "그랜저", plate: "34나 7812", trips: 22, km: 980, state: "대기" as const },
  { vehicle: "아이오닉5", plate: "56다 1290", trips: 31, km: 1105, state: "운행중" as const },
  { vehicle: "스타리아", plate: "78라 4421", trips: 16, km: 860, state: "점검" as const },
];

/** 인장 종류별 사용 빈도 (최근 3개월 · 샘플) */
export const SEAL_USAGE = [
  { seal: "사용인감", count: 34 },
  { seal: "법인인감", count: 27 },
  { seal: "대표이사 직인", count: 15 },
  { seal: "부서 직인", count: 9 },
];

export type Notice = { id: string; title: string; date: string; tag: "긴급" | "공지" | "안내" | "점검"; pinned?: boolean };

export const NOTICES: Notice[] = [
  { id: "n1", title: "10/18(일) 02:00–06:00 통합 시스템 정기 점검 안내", date: "2026-10-14", tag: "점검", pinned: true },
  { id: "n2", title: "[긴급] 12층 대회의실 A 공조 설비 공사로 10/15 오후 사용 중지", date: "2026-10-14", tag: "긴급", pinned: true },
  { id: "n3", title: "인장 날인 신청 온라인 접수 전면 시행 (서면 신청 병행 종료)", date: "2026-10-12", tag: "공지" },
  { id: "n4", title: "법인차량 운행일지 작성 기준 변경 (주행거리 사진 첨부)", date: "2026-10-08", tag: "안내" },
  { id: "n5", title: "4분기 사무용품 일괄 신청 기간 안내 (10/20–10/31)", date: "2026-10-05", tag: "안내" },
];

export const FAQS = [
  { q: "회의실 반복 예약은 어떻게 하나요?", a: "예약 화면에서 '반복' 옵션을 켜고 주기(매주·격주·매월)와 종료일을 지정하면, 겹치는 일정이 있는 날짜를 먼저 알려드립니다." },
  { q: "인장 날인 신청 후 승인까지 얼마나 걸리나요?", a: "인장 종류별 승인 단계에 따라 다르며 보통 1영업일 이내입니다. 진행 단계는 '나의 신청'에서 실시간으로 확인할 수 있습니다." },
  { q: "차량 예약을 취소하면 다른 사람에게 바로 공개되나요?", a: "네. 취소 즉시 해당 시간대가 '이용 가능'으로 바뀌어 다른 직원이 예약할 수 있습니다." },
  { q: "승인 완료와 날인 완료는 무엇이 다른가요?", a: "승인 완료는 결재가 끝난 상태이고, 날인 완료는 인장 관리자가 실제 날인을 마치고 사용대장에 기록한 상태입니다." },
];

export const GUIDES = [
  { title: "처음 사용하는 직원을 위한 5분 가이드", meta: "PDF · 12쪽" },
  { title: "인장 날인 신청서 작성 방법", meta: "영상 · 3분" },
  { title: "회의실 반복·장기 예약 활용법", meta: "가이드 · 6단계" },
];

export type Notification = { id: string; module: ModuleKey; text: string; time: string; unread: boolean };

export const NOTIFICATIONS: Notification[] = [
  { id: "a1", module: "seal", text: "법인인감 날인 신청이 1차 승인되었습니다.", time: "10분 전", unread: true },
  { id: "a2", module: "meeting", text: "내일 14:00 대회의실 A 예약이 확정되었습니다.", time: "1시간 전", unread: true },
  { id: "a3", module: "ga", text: "프로젝터 램프 교체 요청에 담당자가 배정되었습니다.", time: "3시간 전", unread: false },
  { id: "a4", module: "vehicle", text: "카니발 반납 시 운행일지를 작성해 주세요.", time: "어제", unread: false },
];
