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

export { DEPARTMENTS } from "./shared";

export const STATUSES: RequestStatus[] = ["접수", "진행중", "승인대기", "승인완료", "완료", "반려", "취소"];

export const TODAY = "2026-10-14";


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




export type Notice = { id: string; title: string; date: string; tag: "긴급" | "공지" | "안내" | "점검"; pinned?: boolean };

export const NOTICES: Notice[] = [
  { id: "n1", title: "10/18(일) 02:00–06:00 통합 시스템 정기 점검 안내", date: "2026-10-14", tag: "점검", pinned: true },
  { id: "n2", title: "[긴급] 13층 대회의실 공조 설비 공사로 10/15 오후 사용 중지", date: "2026-10-14", tag: "긴급", pinned: true },
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
  { id: "a2", module: "meeting", text: "내일 15:00 회의실 12-1 예약이 확정되었습니다.", time: "1시간 전", unread: true },
  { id: "a3", module: "ga", text: "프로젝터 램프 교체 요청에 담당자가 배정되었습니다.", time: "3시간 전", unread: false },
  { id: "a4", module: "vehicle", text: "K5 191호8366 반납 후 운행 완료 기록을 작성해 주세요.", time: "어제", unread: false },
];
