import {
  CarFront,
  ClipboardList,
  Presentation,
  Stamp,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey = "ga" | "vehicle" | "meeting" | "seal";

export type ModuleDef = {
  key: ModuleKey;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** 모듈 식별 색 — 차트·아이콘에서 같은 모듈은 항상 같은 색 */
  color: string;
  badge: { label: string; tone: "live" | "new" };
  features: string[];
  subMenus: string[];
  requestLabel: string;
};

export const MODULES: ModuleDef[] = [
  {
    key: "ga",
    name: "총무 업무 지원",
    shortName: "총무업무",
    tagline: "비품·시설·사무환경 요청을 한 번에",
    description: "업무 지원 신청부터 담당자 배정, 처리 완료까지 진행 상황을 실시간으로 확인합니다.",
    href: "/ga",
    icon: ClipboardList,
    color: "var(--color-mod-ga)",
    badge: { label: "운영중", tone: "live" },
    features: ["업무 지원 신청", "담당자 배정", "진행 상태 관리", "유형별 통계"],
    subMenus: ["업무 지원 신청", "신청 내역 조회", "담당자 배정 및 처리", "진행 상태 관리", "처리 완료 이력", "신청 유형별 통계"],
    requestLabel: "업무 지원 신청",
  },
  {
    key: "vehicle",
    name: "법인차량 이용",
    shortName: "법인차량",
    tagline: "실시간 배차 현황과 운행 기록 관리",
    description: "차량별 이용 가능 현황을 확인하고 예약, 변경, 운행일지 작성까지 한곳에서 처리합니다.",
    href: "/vehicle",
    icon: CarFront,
    color: "var(--color-mod-vehicle)",
    badge: { label: "운영중", tone: "live" },
    features: ["이용 가능 현황", "예약·변경·취소", "운행 내역 관리", "차량별 통계"],
    subMenus: ["차량별 이용 현황", "차량 이용 신청", "예약 변경 및 취소", "운행 내역 관리", "차량별 이용 통계", "차량 관리"],
    requestLabel: "차량 예약",
  },
  {
    key: "meeting",
    name: "회의실 예약",
    shortName: "회의실",
    tagline: "중복 없는 스마트 회의실 예약",
    description: "날짜·시간별 빈 회의실을 조회하고 반복·장기 예약과 충돌 안내까지 지원합니다.",
    href: "/meeting",
    icon: Presentation,
    color: "var(--color-mod-meeting)",
    badge: { label: "운영중", tone: "live" },
    features: ["시간대별 조회", "반복·장기 예약", "중복예약 방지", "회의실별 현황"],
    subMenus: ["예약 가능 회의실 조회", "회의실 예약 신청", "예약 변경 및 취소", "반복 및 장기예약", "회의실별 예약 현황", "관리자 예약 관리"],
    requestLabel: "회의실 예약",
  },
  {
    key: "seal",
    name: "인장 날인 신청 및 관리",
    shortName: "인장날인",
    tagline: "승인부터 사용대장까지 투명한 인장 관리",
    description: "날인 신청, 단계별 승인, 실제 날인 완료 등록과 인장별 사용대장을 체계적으로 기록합니다.",
    href: "/seal",
    icon: Stamp,
    color: "var(--color-mod-seal)",
    badge: { label: "신규", tone: "new" },
    features: ["날인 신청서 작성", "단계별 승인·반려", "날인 완료 등록", "인장별 사용대장"],
    subMenus: ["날인 신청서 작성", "신청 내역 및 승인 상태", "승인 및 반려 처리", "날인 처리 완료 등록", "인장별 사용대장", "승인·처리 이력"],
    requestLabel: "날인 신청",
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.key, m])) as Record<ModuleKey, ModuleDef>;
