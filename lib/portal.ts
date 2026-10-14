/**
 * 모듈별 원본 데이터 → 포털 공통 신청 항목(WorkRequest) 변환
 * 통합 대시보드·관리자센터·통합 검색이 같은 형식으로 보여주기 위한 어댑터입니다.
 * (실서비스에서는 DB 뷰 core.v_my_items 로 대체 — docs/02 설계안 6.1 참고)
 */
import type { RequestStatus, WorkRequest } from "@/lib/data";
import type { GaRequest, GaStatus } from "@/lib/ga";
import type { SealRequest, SealStatus } from "@/lib/seal";
import { fmtTime, ROOMS, seoulParts, type MeetingReservation, type MeetingStatus } from "@/lib/meeting";
import { todayStr } from "@/lib/shared";
import { vehicleLabel, type VehicleReservation, type VehicleStatus } from "@/lib/vehicle";

const md = (d: string) => `${d.slice(5, 7)}.${d.slice(8, 10)}`;
const short = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase().padStart(4, "0");

const GA_MAP: Record<GaStatus, RequestStatus> = { 접수: "접수", 검토중: "진행중", 진행중: "진행중", 완료: "완료", 반려: "반려" };
const VH_MAP: Record<VehicleStatus, RequestStatus> = { 신청: "승인대기", 승인: "승인완료", 사용완료: "완료", 반려: "반려" };
const MR_MAP: Record<MeetingStatus, RequestStatus> = { reserved: "승인완료", checked_in: "진행중", completed: "완료", cancelled: "취소", no_show: "취소" };

export function fromGa(r: GaRequest): WorkRequest {
  return {
    id: `ga:${r.id}`,
    no: `GA-${r.request_date.replaceAll("-", "").slice(0, 6)}-${short(r.id)}`,
    module: "ga",
    title: r.title,
    requester: r.requester_name,
    dept: r.department,
    requestedAt: r.request_date,
    scheduledAt: `${md(r.request_date)} · ${r.location}`,
    status: GA_MAP[r.status] ?? "접수",
    urgent: r.urgency === "긴급",
  };
}

export function fromVehicle(c: VehicleReservation): WorkRequest {
  return {
    id: `vh:${c.id}`,
    no: `VH-${c.start_date.replaceAll("-", "").slice(0, 6)}-${short(c.id)}`,
    module: "vehicle",
    title: `${vehicleLabel(c)} · ${c.purpose}`,
    requester: c.applicant,
    dept: c.department,
    requestedAt: todayStr(new Date(c.created_at)),
    scheduledAt: c.start_date === c.end_date ? `${md(c.start_date)} ${c.start_time}–${c.end_time}` : `${md(c.start_date)} ${c.start_time} ~ ${md(c.end_date)} ${c.end_time}`,
    status: VH_MAP[c.status] ?? "승인대기",
  };
}

/** 반복예약은 1건으로 묶어 표시 */
export function fromMeeting(list: MeetingReservation[]): WorkRequest[] {
  const seen = new Set<string>();
  const out: WorkRequest[] = [];
  const now = Date.now();
  const sorted = list.slice().sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  for (const r of sorted) {
    if (r.series_id) {
      if (seen.has(r.series_id)) continue;
      // 다가오는 회차를 대표로 사용
      const next = sorted.find((x) => x.series_id === r.series_id && +new Date(x.end_at) >= now) ?? r;
      seen.add(r.series_id);
      out.push(meetingItem(next, true));
    } else out.push(meetingItem(r, false));
  }
  return out;
}

function meetingItem(r: MeetingReservation, series: boolean): WorkRequest {
  const room = ROOMS.find((x) => x.id === r.room_id);
  const d = seoulParts(r.start_at).date;
  return {
    id: `mr:${r.series_id ?? r.id}`,
    no: `MR-${d.replaceAll("-", "").slice(0, 6)}-${short(r._code)}`,
    module: "meeting",
    title: `${room?.name ?? r.room_id} · ${r.title}${series ? " (반복)" : ""}`,
    requester: r.organizer_name,
    dept: r.department,
    requestedAt: todayStr(new Date(r.created_at)),
    scheduledAt: series ? `${r.recurrence_label?.replaceAll("-", ".").replace(/^\d{4}\./, "")} · ${fmtTime(r.start_at)}–${fmtTime(r.end_at)}` : `${md(d)} ${fmtTime(r.start_at)}–${fmtTime(r.end_at)}`,
    status: MR_MAP[r.status],
  };
}

const SEAL_MAP: Record<SealStatus, RequestStatus> = { 접수: "접수", 검토중: "진행중", 승인: "승인완료", 반려: "반려", 날인완료: "완료", 취소: "취소" };

export function fromSeal(r: SealRequest): WorkRequest {
  return {
    id: `seal:${r.id}`,
    no: r.request_no,
    module: "seal",
    title: `${r.seal_kind} · ${r.document_name}`,
    requester: r.requester_name,
    dept: r.department,
    requestedAt: r.requested_at,
    scheduledAt: `${md(r.needed_date)} 필요 · ${r.quantity}부`,
    status: SEAL_MAP[r.status],
    urgent: r.needed_date <= r.requested_at,
  };
}
