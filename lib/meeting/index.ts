/**
 * 회의실 예약 — 기존 Supabase `rooms` / `reservations_public` 구조와 업무 규칙을 그대로 따릅니다.
 * (원본: reservation_system.html V2.10)
 *
 * 실서비스에서 예약 생성·취소·입실확인·관리자 처리는 Supabase RPC
 * (create_reservation, create_recurring_reservations, manage_reservation, manage_reservation_series,
 *  find_reservations_by_code, admin_verify, admin_cancel_reservation, admin_cancel_series, admin_set_room_active)
 * 가 서버에서 검증합니다. 이 파일의 함수들은 데모 환경에서 같은 규칙을 재현합니다.
 */

export type Room = { id: string; floor: 12 | 13; name: string; capacity: number; location: string; sort_order: number; active: boolean };

export const ROOMS: Room[] = [
  { id: "12-1", floor: 12, name: "회의실 12-1", capacity: 5, location: "최정국 본부장 옆", sort_order: 1, active: true },
  { id: "12-2", floor: 12, name: "회의실 12-2", capacity: 4, location: "곽상현 본부장 옆", sort_order: 2, active: true },
  { id: "12-3", floor: 12, name: "회의실 12-3", capacity: 8, location: "계리부 옆 구석", sort_order: 3, active: true },
  { id: "12-4", floor: 12, name: "회의실 12-4", capacity: 4, location: "변액 앞", sort_order: 4, active: true },
  { id: "12-5", floor: 12, name: "회의실 12-5", capacity: 4, location: "노조사무실 앞", sort_order: 5, active: true },
  { id: "12-6", floor: 12, name: "회의실 12-6", capacity: 5, location: "여직원휴게실 앞", sort_order: 6, active: true },
  { id: "13-1", floor: 13, name: "회의실 13-1", capacity: 5, location: "민원상담실", sort_order: 1, active: true },
  { id: "13-2", floor: 13, name: "회의실 13-2", capacity: 5, location: "고충처리실", sort_order: 2, active: true },
  { id: "13-3", floor: 13, name: "회의실 13-3", capacity: 5, location: "QA실", sort_order: 3, active: true },
  { id: "13-4", floor: 13, name: "회의실 13-4", capacity: 12, location: "중앙회의실", sort_order: 4, active: true },
  { id: "13-5", floor: 13, name: "회의실 13-5", capacity: 4, location: "휴게공간", sort_order: 5, active: true },
  { id: "13-L", floor: 13, name: "대회의실", capacity: 30, location: "13층 대회의실", sort_order: 6, active: true },
];

/** 12F = 한색 계열 / 13F = 난색 계열 (기존 색상 유지) */
export const ROOM_COLORS: Record<string, string> = {
  "12-1": "#00A979", "12-2": "#0097B8", "12-3": "#3577E5", "12-4": "#6257D9", "12-5": "#8E4FD1", "12-6": "#C53AA9",
  "13-1": "#6FAE19", "13-2": "#C88A00", "13-3": "#E77A10", "13-4": "#E65336", "13-5": "#E53F6D", "13-L": "#CB2F36",
};
export const roomColor = (id: string) => ROOM_COLORS[id] ?? "#4BD4A9";

export const MEETING_CONFIG = { businessStart: "08:00", businessEnd: "20:00", checkinGraceMinutes: 10, slot: 30 };

export type MeetingStatus = "reserved" | "checked_in" | "completed" | "cancelled" | "no_show";

export type MeetingReservation = {
  id: string;
  room_id: string;
  title: string;
  organizer_name: string;
  department: string;
  attendee_count: number;
  start_at: string;
  end_at: string;
  status: MeetingStatus;
  series_id: string | null;
  recurrence_label: string | null;
  checked_in_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  updated_at: string;
  /** 데모 전용: 서버에서는 해시로 보관되며 클라이언트에 내려오지 않음 */
  _code: string;
};

export const STATUS_TEXT: Record<MeetingStatus, string> = {
  reserved: "예약",
  checked_in: "사용 중",
  completed: "사용 완료",
  cancelled: "취소",
  no_show: "자동취소",
};

export const isActive = (r: Pick<MeetingReservation, "status">) => r.status === "reserved" || r.status === "checked_in";

const SEOUL = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export function seoulParts(iso: string) {
  const p: Record<string, string> = {};
  SEOUL.formatToParts(new Date(iso)).forEach((x) => x.type !== "literal" && (p[x.type] = x.value));
  let h = Number(p.hour);
  if (h === 24) h = 0;
  return { date: `${p.year}-${p.month}-${p.day}`, minute: h * 60 + Number(p.minute) };
}

export const localIso = (date: string, time: string) => `${date}T${time}:00+09:00`;
export const minuteLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const toMinute = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" }).format(new Date(iso));
}

export function isoDow(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function recurrenceDates(start: string, end: string, weekdays: Set<number>, addDays: (d: string, n: number) => string) {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (weekdays.has(isoDow(d))) out.push(d);
  return out;
}

export function timeOptions() {
  const out: string[] = [];
  for (let m = toMinute(MEETING_CONFIG.businessStart); m <= toMinute(MEETING_CONFIG.businessEnd); m += MEETING_CONFIG.slot) out.push(minuteLabel(m));
  return out;
}

export function randCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  crypto.getRandomValues(new Uint32Array(8)).forEach((n) => (out += chars[n % chars.length]));
  return out;
}

export function overlaps(r: Pick<MeetingReservation, "start_at" | "end_at">, startIso: string, endIso: string) {
  return new Date(r.start_at) < new Date(endIso) && new Date(r.end_at) > new Date(startIso);
}

/** 같은 회의실의 활성 예약과 겹치는 건 (서버의 EXCLUDE 제약과 동일한 판단) */
export function conflictsFor(list: MeetingReservation[], roomId: string, startIso: string, endIso: string) {
  return list.filter((r) => r.room_id === roomId && isActive(r) && overlaps(r, startIso, endIso));
}

/**
 * 자동 상태 전환 (서버 스케줄러 역할의 데모 구현)
 * - 단일 예약: 시작 후 10분 내 입실확인이 없으면 no_show
 * - 모든 활성 예약: 종료 시각이 지나면 completed
 */
export function sweepStatuses(list: MeetingReservation[], now = Date.now()): MeetingReservation[] {
  let changed = false;
  const grace = MEETING_CONFIG.checkinGraceMinutes * 60000;
  const next = list.map((r) => {
    if (!isActive(r)) return r;
    const s = new Date(r.start_at).getTime();
    const e = new Date(r.end_at).getTime();
    if (!r.series_id && r.status === "reserved" && now > s + grace) {
      changed = true;
      return { ...r, status: "no_show" as const, cancel_reason: "no_show", updated_at: new Date(now).toISOString() };
    }
    if (now >= e) {
      changed = true;
      return { ...r, status: "completed" as const, updated_at: new Date(now).toISOString() };
    }
    return r;
  });
  return changed ? next : list;
}
