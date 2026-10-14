/** 기존 총무·차량·회의실 시스템에서 공통으로 쓰던 부서 목록 (기존 HTML 원본 순서 유지) */
export const DEPARTMENTS = [
  "감사부", "준법지원부", "소비자보호부", "선임계리사지원", "ICT전략부", "AI전략부", "영업기획부",
  "금융기관제휴사업부", "GA사업부", "하이브리드사업부", "상품부", "계약심사부", "보험금심사팀", "손님지원센터",
  "재무기획부", "경영지원부", "가계여신부", "자산운용부", "변액보험자산운용부", "투자관리팀", "계리부",
  "리스크관리부", "투자심사부", "계약관리부", "ESG기획팀", "정보보호지원팀",
];

/** 기존 시스템 규칙: 2자 이상, 자음만 입력 불가, 한글 또는 영문 포함 */
export function validFullName(value: string) {
  const v = String(value || "").trim();
  if (v.length < 2) return false;
  if (/^[ㄱ-ㅎ\s]+$/.test(v)) return false;
  return /[가-힣a-zA-Z]/.test(v);
}

export function validContact(value: string) {
  return String(value || "").trim().length >= 2;
}

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const nowIso = () => new Date().toISOString();

/** 로컬(한국) 기준 YYYY-MM-DD */
export function todayStr(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + days));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

/** MM.DD 형식 (기존 fmt 함수와 동일한 표기) */
export function fmtMd(v?: string | null) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function escapeHtml(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]!);
}

/** 기존 시스템과 같은 방식의 Excel 호환(.xls, HTML 테이블) 파일 다운로드 */
export function downloadXls(filename: string, html: string) {
  saveBlob(filename, new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" }));
}

export function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  saveBlob(filename, new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}

/** 파일 저장 — 링크를 문서에 잠시 붙여 클릭해야 파일명이 유지되는 브라우저가 있음 */
export function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
