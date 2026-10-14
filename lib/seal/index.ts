/**
 * 인장 날인 신청 및 관리 (신규 모듈)
 * 흐름: 신청서 작성 → 접수 → 담당자 검토 → 승인 / 반려 → 실제 날인 → 날인 완료(사용대장 기록)
 * 승인 완료(승인)와 실제 날인 완료(날인완료)는 별도 상태로 관리합니다.
 * 인장 이미지를 문서에 자동 합성하는 기능은 제공하지 않습니다.
 */
import { escapeHtml } from "@/lib/shared";

/** 인장 종류 — 크게 2종 (법인인감 / 직인) */
export const SEAL_KINDS = [
  { value: "법인인감", desc: "등기소 등록 인감 · 계약서·금융거래 등", color: "#8a5ce6" },
  { value: "직인", desc: "대표이사 직인 · 공문·증명서 등", color: "#d9488b" },
] as const;
export type SealKind = (typeof SEAL_KINDS)[number]["value"];

export const SEAL_STATUSES = ["접수", "검토중", "승인", "반려", "날인완료", "취소"] as const;
export type SealStatus = (typeof SEAL_STATUSES)[number];

/** 요청자가 사전 승인을 받았음을 증빙하는 방식 */
export const APPROVAL_METHODS = ["전자결재", "서면결재", "이메일 승인", "기타"] as const;

export type SealHistory = { at: string; action: string; actor: string; note?: string };

export type SealRequest = {
  id: string;
  request_no: string;
  requested_at: string;
  requester_name: string;
  department: string;
  contact: string;
  seal_kind: SealKind;
  purpose: string;
  document_name: string;
  submit_to: string;
  needed_date: string;
  quantity: number;
  /** 사전 승인 증빙 */
  approval_method: string;
  approval_doc_no: string;
  approver_name: string;
  approval_date: string;
  approval_note: string;
  /** 증명서 발급 희망 */
  need_seal_certificate: boolean;
  seal_certificate_count: number;
  need_usage_seal_form: boolean;
  usage_seal_form_count: number;
  remarks: string;
  /** 첨부파일 — 추후 지원 (현재는 파일명 목록만 예약) */
  attachments: string[];
  status: SealStatus;
  reject_reason?: string | null;
  handler?: string | null;
  approved_at?: string | null;
  sealed_date?: string | null;
  sealed_by?: string | null;
  certificates_issued?: boolean;
  history: SealHistory[];
  created_at: string;
  /** 작성한 직원 (로그인 도입 이후 건) */
  created_by?: string | null;
  updated_at: string;
};

export type SealInput = Omit<
  SealRequest,
  "id" | "request_no" | "requested_at" | "attachments" | "status" | "reject_reason" | "handler" | "approved_at" | "sealed_date" | "sealed_by" | "certificates_issued" | "history" | "created_at" | "updated_at"
>;

export const SEAL_STATUS_STYLE: Record<SealStatus, string> = {
  접수: "bg-slate-100 text-slate-700",
  검토중: "bg-amber-50 text-amber-800",
  승인: "bg-sky-50 text-sky-700",
  반려: "bg-rose-50 text-rose-700",
  날인완료: "bg-[color:var(--color-mod-seal)] text-white",
  취소: "bg-zinc-100 text-zinc-500",
};

/** 신청번호: SEAL-YYYYMM-0001 (월별 일련번호) */
export function nextRequestNo(list: Pick<SealRequest, "request_no">[], date: string) {
  const prefix = `SEAL-${date.slice(0, 4)}${date.slice(5, 7)}-`;
  const max = list.filter((r) => r.request_no.startsWith(prefix)).reduce((m, r) => Math.max(m, Number(r.request_no.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function certificateText(r: SealRequest) {
  const parts: string[] = [];
  if (r.need_seal_certificate) parts.push(`법인 인감증명서 ${r.seal_certificate_count}부`);
  if (r.need_usage_seal_form) parts.push(`사용인감계 ${r.usage_seal_form_count}부`);
  return parts.join(", ");
}

export function approvalText(r: SealRequest) {
  return [r.approval_method, r.approval_doc_no && `문서번호 ${r.approval_doc_no}`, r.approver_name && `승인권자 ${r.approver_name}`, r.approval_date && `승인일 ${r.approval_date}`]
    .filter(Boolean)
    .join(" · ");
}

export type SealListType = "requests" | "ledger";

/** 날인 요청 목록 / 날인 완료 대장 — 출력(인쇄)·Excel 공용 HTML */
export function buildSealListHtml(rows: SealRequest[], type: SealListType, kind: SealKind | "전체", forPrint = false) {
  const title = `${kind === "전체" ? "인장" : kind} ${type === "ledger" ? "날인 완료 대장 (사용대장)" : "날인 요청 목록"}`;
  const head =
    type === "ledger"
      ? ["No", "신청번호", "날인일자", "인장", "부서", "신청자", "대상 문서", "날인 목적", "제출처", "수량", "사전 승인 증빙", "증명서 발급", "날인 처리자", "확인"]
      : ["No", "신청번호", "신청일", "필요일", "인장", "부서", "신청자", "대상 문서", "날인 목적", "제출처", "수량", "사전 승인 증빙", "증명서 발급 희망", "상태"];
  const body = rows.map((r, i) =>
    type === "ledger"
      ? [i + 1, r.request_no, r.sealed_date ?? "", r.seal_kind, r.department, r.requester_name, r.document_name, r.purpose, r.submit_to, r.quantity, approvalText(r), certificateText(r) || "-", r.sealed_by ?? "", ""]
      : [i + 1, r.request_no, r.requested_at, r.needed_date, r.seal_kind, r.department, r.requester_name, r.document_name, r.purpose, r.submit_to, r.quantity, approvalText(r), certificateText(r) || "-", r.status],
  );
  const css = `<style>
    @page{size:A4 landscape;margin:12mm}
    body{font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;color:#111;margin:0;padding:${forPrint ? "0" : "8px"}}
    h1{font-size:18px;margin:0 0 4px}
    .meta{font-size:11px;color:#555;margin-bottom:10px;display:flex;justify-content:space-between}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #777;padding:5px 6px;font-size:10.5px;vertical-align:middle}
    th{background:#ece7fb;font-weight:bold;text-align:center}
    td{text-align:center}
    td.l{text-align:left}
    td.nw,th.nw{white-space:nowrap}
    .sign{margin-top:14px;display:flex;justify-content:flex-end;gap:0}
    .sign div{border:1px solid #777;width:80px;height:64px;font-size:11px;text-align:center;padding-top:4px}
  </style>`;
  const left = new Set(["대상 문서", "날인 목적", "제출처", "사전 승인 증빙", "증명서 발급", "증명서 발급 희망"]);
  const nowrap = new Set(["No", "신청번호", "신청일", "필요일", "날인일자", "인장", "부서", "신청자", "수량", "상태", "날인 처리자", "확인"]);
  return `<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${css}</head><body>
  <h1>하나생명보험(주) ${escapeHtml(title)}</h1>
  <div class="meta"><span>출력일시: ${new Date().toLocaleString("ko-KR")} · 총 ${rows.length}건</span><span>경영지원부</span></div>
  <table><thead><tr>${head.map((h) => `<th class="${nowrap.has(h) ? "nw" : ""}">${h}</th>`).join("")}</tr></thead><tbody>
  ${body.map((r) => `<tr>${r.map((c, j) => `<td class="${left.has(head[j]) ? "l" : nowrap.has(head[j]) ? "nw" : ""}">${escapeHtml(c)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${head.length}">해당 내역이 없습니다.</td></tr>`}
  </tbody></table>
  ${forPrint ? `<div class="sign"><div>담당</div><div>부서장</div><div>인장관리자</div></div>` : ""}
  </body></html>`;
}

/** 새 창에서 인쇄 */
export function printHtml(html: string) {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
