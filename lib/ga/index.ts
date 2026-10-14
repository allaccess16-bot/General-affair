/**
 * 총무 업무요청 — 기존 Supabase `requests` 테이블 구조를 그대로 따릅니다.
 * (원본: index_hana_vehicle_selector_unified.html)
 */
import { escapeHtml, fmtMd } from "@/lib/shared";

export const GA_CATEGORIES = ["시설/비품", "문서/행정", "좌석/이전", "출입증/보안", "차량/출장", "복리후생", "계약/구매"] as const;
export const GA_URGENCY = ["보통", "긴급", "낮음"] as const;
export const GA_STATUSES = ["접수", "검토중", "진행중", "완료", "반려"] as const;

export type GaStatus = (typeof GA_STATUSES)[number];

export type GaRequest = {
  id: string;
  request_date: string;
  title: string;
  description: string;
  requester_name: string;
  department: string;
  contact: string;
  /** 기존 시스템은 평문 저장 — 통합 시 해시 또는 로그인 권한으로 대체 필요 */
  edit_password: string;
  location: string;
  category: string;
  urgency: string;
  status: GaStatus;
  assignee?: string | null;
  admin_memo?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type GaRequestInput = Omit<GaRequest, "id" | "status" | "assignee" | "admin_memo" | "completed_at" | "created_at" | "updated_at">;

function makeTable(headers: string[], rows: unknown[][]) {
  return `<table border="1" cellspacing="0" cellpadding="6"><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function barRows(obj: Record<string, number>) {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return entries
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td>${v}</td><td><div style="background:#e6f4f1;width:220px;height:16px;border-radius:8px;"><div style="background:#008485;width:${Math.round((v / max) * 220)}px;height:16px;border-radius:8px;"></div></div></td></tr>`,
    )
    .join("");
}

/** 기존 '요청관리_상세내용포함_리포트.xls'와 동일한 구성 */
export function buildGaReportHtml(requests: GaRequest[]) {
  const status: Record<string, number> = {};
  requests.forEach((r) => (status[r.status || "미지정"] = (status[r.status || "미지정"] || 0) + 1));
  const css = `<style>body{font-family:Arial,'Malgun Gothic',sans-serif}h1{color:#006b6c}h2{color:#008485;margin-top:28px}table{border-collapse:collapse;margin:10px 0 24px 0;width:100%}th{background:#008485;color:white}td,th{border:1px solid #b7c9c9;padding:7px;font-size:12px}.note{color:#666}</style>`;
  const sections = [
    `<h2>상태별 그래프</h2><table border="1" cellspacing="0" cellpadding="6"><tr><th>상태</th><th>건수</th><th>그래프</th></tr>${barRows(status)}</table>`,
    `<h2>요청 상세 데이터</h2>${makeTable(
      ["요청일", "제목", "상세내용", "요청자", "부서", "연락처/내선", "카테고리", "긴급도", "상태", "담당자", "등록일", "완료일", "처리메모"],
      requests.map((r) => [r.request_date, r.title, r.description, r.requester_name, r.department, r.contact, r.category, r.urgency, r.status, r.assignee ?? "", fmtMd(r.created_at), fmtMd(r.completed_at), r.admin_memo ?? ""]),
    )}`,
  ];
  return `<html><head><meta charset="utf-8">${css}</head><body><h1>하나생명 총무 업무요청 상세 리포트</h1><p class="note">생성일: ${new Date().toLocaleString("ko-KR")}</p>${sections.join("")}</body></html>`;
}
