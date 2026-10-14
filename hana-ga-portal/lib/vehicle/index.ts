/**
 * 법인차량 배차 — 기존 Supabase `vehicle_reservations` 테이블 구조와 업무 규칙을 그대로 따릅니다.
 * (원본: index_hana_vehicle_selector_unified.html)
 */
import { escapeHtml } from "@/lib/shared";

export const VEHICLES = [
  { number: "191호8366", name: "K5", label: "K5 191호8366" },
  { number: "191호8367", name: "K5", label: "K5 191호8367 청라" },
  { number: "146호9979", name: "K5", label: "K5 146호9979" },
] as const;

export type VehicleStatus = "신청" | "승인" | "반려" | "사용완료";

export type VehicleReservation = {
  id: string;
  vehicle_name: string;
  vehicle_number: string;
  use_date: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  applicant: string;
  department: string;
  contact: string;
  driver: string;
  /** 기존 시스템은 평문 저장 — 통합 시 해시 또는 로그인 권한으로 대체 필요 */
  reservation_password: string;
  purpose: string;
  destination: string;
  status: VehicleStatus;
  complete_department?: string | null;
  complete_name?: string | null;
  odometer_before?: number | null;
  odometer_after?: number | null;
  total_distance?: number | null;
  fuel_cost?: number | null;
  parking_cost?: number | null;
  etc_cost?: number | null;
  complete_memo?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleInput = Pick<
  VehicleReservation,
  "vehicle_number" | "start_date" | "start_time" | "end_date" | "end_time" | "applicant" | "department" | "contact" | "driver" | "reservation_password" | "purpose" | "destination"
>;

export type CompletionInput = Pick<
  VehicleReservation,
  "complete_department" | "complete_name" | "odometer_before" | "odometer_after" | "fuel_cost" | "parking_cost" | "etc_cost" | "complete_memo"
>;

/** 중복 판단 대상 상태 (기존 규칙: 신청·승인 건만 시간 점유) */
export const BLOCKING: VehicleStatus[] = ["신청", "승인"];

export function vehicleLabel(c: Pick<VehicleReservation, "vehicle_number" | "vehicle_name">) {
  const suffix = c.vehicle_number === "191호8367" ? " 청라" : "";
  return `${c.vehicle_name || "K5"} ${c.vehicle_number}${suffix}`;
}

export function resStart(c: Pick<VehicleReservation, "start_date" | "use_date" | "start_time">) {
  const d = c.start_date || c.use_date;
  return d ? new Date(`${d}T${c.start_time || "00:00"}`) : null;
}
export function resEnd(c: Pick<VehicleReservation, "end_date" | "use_date" | "end_time">) {
  const d = c.end_date || c.use_date;
  return d ? new Date(`${d}T${c.end_time || "23:59"}`) : null;
}

export function rangesOverlap(a1: Date | null, a2: Date | null, b1: Date | null, b2: Date | null) {
  if (!a1 || !a2 || !b1 || !b2) return false;
  return a1 < b2 && b1 < a2;
}

/** 같은 차량의 신청·승인 예약과 시간이 겹치는 건 */
export function findConflicts(list: VehicleReservation[], vehicle: string, start: Date, end: Date, excludeId?: string) {
  return list.filter(
    (c) => c.id !== excludeId && c.vehicle_number === vehicle && BLOCKING.includes(c.status) && rangesOverlap(start, end, resStart(c), resEnd(c)),
  );
}

export function coversDate(c: VehicleReservation, date: string) {
  const s = c.start_date || c.use_date;
  const e = c.end_date || c.use_date;
  return s <= date && date <= e;
}

const won = (n?: number | null) => (Number(n || 0) ? Number(n).toLocaleString("ko-KR") : "");

/** 기존 '업무용승용차 운행기록부' 별지 서식과 동일한 레이아웃 */
export function buildLogbookHtml(source: VehicleReservation[], label: string) {
  const rows = source.slice().sort((a, b) => String(a.use_date).localeCompare(String(b.use_date)));
  const dataRows = rows
    .map(
      (c) => `<tr><td>${escapeHtml(c.use_date)}</td><td>${escapeHtml(c.department)}</td><td>${escapeHtml(c.complete_name || c.applicant)}</td><td>${escapeHtml(c.odometer_before ?? "")}</td><td>${escapeHtml(c.odometer_after ?? "")}</td><td>${escapeHtml(c.total_distance ?? "")}</td><td></td><td>✓</td><td>${won(c.fuel_cost)}</td><td>${won(c.parking_cost)}</td><td>${won(c.etc_cost)}</td><td>${escapeHtml(c.complete_memo ?? "")}</td><td></td><td></td><td></td><td>${escapeHtml(c.destination)}</td></tr>`,
    )
    .join("");
  const emptyRows = Array.from({ length: Math.max(12, 22 - rows.length) }, () => `<tr><td>&nbsp;</td>${"<td></td>".repeat(15)}</tr>`).join("");
  const css = `<style>body{font-family:'Malgun Gothic',Arial,sans-serif;color:#111;}table{border-collapse:collapse;}.sheet td,.sheet th{border:1px solid #555;padding:5px;font-size:11px;text-align:center;vertical-align:middle;height:24px;white-space:normal;}.sheet th{background:#e5e7eb;font-weight:bold;}.title{background:#666;color:#fff;font-weight:bold;font-size:18px;text-align:center;height:30px;}.dark{background:#666!important;color:#fff!important;font-weight:bold;}.left{text-align:left!important;}.section{font-weight:bold;text-align:left!important;border:0!important;background:#fff!important;padding:7px 0 3px 0!important;}.meta td{border:1px solid #555;padding:4px;font-size:11px;height:22px;}.meta-label{background:#e5e7eb;font-weight:bold;text-align:center;}.note{font-size:11px;color:#444;margin-top:8px;}</style>`;
  const plates = label === "전체" ? VEHICLES.map((v) => v.number).join(" / ") : label;
  return `<html><head><meta charset="utf-8">${css}</head><body>
<table class="meta" style="width:1200px;"><tr><td style="width:300px;" class="left">[업무용승용차 운행기록부에 관한 별지 서식] &lt;2016.12.30 개정&gt;</td><td style="width:80px;" class="meta-label">과세기간</td><td style="width:80px;" class="meta-label">시작일</td><td style="width:100px;"></td><td style="width:360px;" class="title">업무용승용차 운행기록부</td><td style="width:90px;" class="meta-label">법인명</td><td style="width:190px;">하나생명보험(주)</td></tr>
<tr><td></td><td></td><td class="meta-label">종료일</td><td></td><td></td><td class="meta-label">사업자등록번호</td><td>214-86-00845</td></tr></table>
<table class="sheet" style="width:1200px;"><tr><td colspan="16" class="section">1. 기본정보</td></tr><tr><td class="meta-label" style="width:80px;">① 차종</td><td style="width:90px;">K5</td><td class="meta-label" style="width:120px;">② 자동차등록번호</td><td style="width:100px;">${escapeHtml(plates)}</td><td colspan="12"></td></tr><tr><td colspan="16" class="section">2. 업무용 사용비율 계산</td></tr></table>
<table class="sheet" style="width:1200px;"><tr><th style="width:80px;" rowspan="2">③ 사용일자</th><th style="width:90px;" colspan="2">④ 사용자</th><th style="width:85px;" rowspan="2">⑤ 주행 전<br>계기판 거리<br>(km)</th><th style="width:85px;" rowspan="2">⑥ 주행 후<br>계기판 거리<br>(km)</th><th style="width:70px;" rowspan="2">⑦ 주행거리<br>(km)</th><th colspan="6">운행 내역</th><th colspan="3">OT</th><th style="width:130px;" rowspan="2">주요 행선지</th></tr>
<tr><th style="width:90px;">부서</th><th style="width:70px;">성명</th><th style="width:75px;">⑧ 출·퇴근용<br>(km)</th><th style="width:75px;">⑨ 일반 업무용<br>(km)</th><th style="width:70px;" class="dark">유류비</th><th style="width:70px;" class="dark">주차비</th><th style="width:70px;" class="dark">기타비용</th><th style="width:95px;">⑩ 비고</th><th style="width:60px;">출근<br>시간</th><th style="width:60px;">퇴근<br>시간</th><th style="width:70px;">시간 외<br>근무시간</th></tr>
${dataRows}${emptyRows}</table><div class="note">※ 시스템에서 차량 배차 및 운행완료 기록을 기준으로 자동 생성되었습니다.</div></body></html>`;
}
