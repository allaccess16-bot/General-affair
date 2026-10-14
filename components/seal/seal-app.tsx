"use client";

import { motion } from "framer-motion";
import { Check, Download, FileCheck2, Printer, Search, Stamp, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminGate } from "@/components/modules/admin-gate";
import { ModuleHero } from "@/components/modules/module-hero";
import { useDemo, type SealAction } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Empty, Field, Notice, Pill, Tabs } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Reveal } from "@/components/ui/reveal";
import {
  approvalText,
  buildSealListHtml,
  certificateText,
  printHtml,
  SEAL_KINDS,
  SEAL_STATUS_STYLE,
  SEAL_STATUSES,
  type SealKind,
  type SealListType,
  type SealRequest,
  type SealStatus,
} from "@/lib/seal";
import { DEPARTMENTS, downloadXls, fmtMd, todayStr } from "@/lib/shared";
import { cn } from "@/lib/utils";
import { SealFormModal } from "./seal-form-modal";

type Tab = "user" | "admin" | "print";
const STEPS = ["신청서 작성", "신청 접수", "담당자 검토", "승인 / 반려", "실제 날인", "사용대장 기록"];
const ADMIN_NAME = "송현우(경영지원부)";

function stepOf(s: SealStatus) {
  return { 접수: 1, 검토중: 2, 승인: 4, 반려: 3, 날인완료: 6, 취소: 1 }[s];
}

export function SealStatusPill({ s }: { s: SealStatus }) {
  return <Pill className={SEAL_STATUS_STYLE[s]}>{s}</Pill>;
}

function KindPill({ k }: { k: SealKind }) {
  const c = SEAL_KINDS.find((x) => x.value === k)!.color;
  return (
    <Pill style={{ background: `${c}14`, color: c }}>
      <Stamp className="size-3" /> {k}
    </Pill>
  );
}

export function SealApp() {
  const { seal, ready, isAdmin } = useDemo();
  const admin = isAdmin("seal");
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("user");
  const [form, setForm] = useState(false);
  useEffect(() => {
    if (params.get("new")) setForm(true);
  }, [params]);
  const pending = seal.filter((r) => r.status === "접수" || r.status === "검토중").length;
  const toSeal = seal.filter((r) => r.status === "승인").length;

  return (
    <div>
      <ModuleHero
        moduleKey="seal"
        onPrimary={() => setForm(true)}
        secondary={{ label: "내 신청 조회", href: "#work" }}
        meta={
          ready && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill className="bg-white text-ink-2 ring-1 ring-line">인장 2종 · 법인인감 / 직인</Pill>
              <Pill className="bg-amber-50 text-amber-800">승인 대기 {pending}건</Pill>
              <Pill className="bg-sky-50 text-sky-700">날인 대기 {toSeal}건</Pill>
            </div>
          )
        }
      />
      <div id="work" className="mx-auto max-w-[1320px] scroll-mt-24 space-y-6 px-4 md:px-8">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: "user", label: "날인 신청 · 내 신청" },
            { value: "admin", label: "승인 · 날인 처리", locked: !admin, badge: admin ? pending + toSeal : undefined },
            { value: "print", label: "목록 출력 · 사용대장", locked: !admin },
          ]}
          className="w-fit max-w-full"
        />
        {!ready ? (
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
        ) : (
          <>
            {tab === "user" && <SealUser onNew={() => setForm(true)} />}
            {tab === "admin" && (
              <AdminGate module="seal">
                <SealAdmin />
              </AdminGate>
            )}
            {tab === "print" && (
              <AdminGate module="seal">
                <SealPrint />
              </AdminGate>
            )}
          </>
        )}
      </div>
      <SealFormModal open={form} onClose={() => setForm(false)} />
    </div>
  );
}

function Stepper({ status }: { status: SealStatus }) {
  const cur = stepOf(status);
  const rejected = status === "반려";
  return (
    <ol className="grid grid-cols-3 gap-y-5 md:grid-cols-6">
      {STEPS.map((s, i) => {
        const done = i < cur;
        const active = i === cur;
        const label = rejected && i === 3 ? "반려" : s;
        return (
          <li key={s} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span className="absolute right-1/2 top-4 h-0.5 w-full bg-line">
                <motion.span className={cn("block h-full", rejected && i >= 3 ? "bg-rose-400" : "bg-[color:var(--color-mod-seal)]")} initial={{ width: 0 }} animate={{ width: i <= cur ? "100%" : 0 }} transition={{ delay: i * 0.08 }} />
              </span>
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 place-items-center rounded-full text-xs font-bold ring-4 ring-white",
                done ? "bg-[color:var(--color-mod-seal)] text-white" : active ? (rejected ? "bg-rose-500 text-white" : "bg-white text-[color:var(--color-mod-seal)] outline-2 outline-[color:var(--color-mod-seal)]") : "bg-canvas text-ink-3",
              )}
            >
              {done ? <Check className="size-4" /> : rejected && active ? <X className="size-4" /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-[11px] font-semibold", active ? (rejected ? "text-rose-600" : "text-[color:var(--color-mod-seal)]") : done ? "text-ink" : "text-ink-3")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- 신청자 화면 ---------------- */
function SealUser({ onNew }: { onNew: () => void }) {
  const { seal } = useDemo();
  const [kw, setKw] = useState("");
  const [applied, setApplied] = useState("");
  const [detail, setDetail] = useState<SealRequest | null>(null);
  const list = applied ? seal.filter((r) => r.requester_name.includes(applied) || r.department.includes(applied) || r.request_no.includes(applied.toUpperCase())) : seal.slice(0, 6);
  const live = detail ? seal.find((r) => r.id === detail.id) ?? null : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Card className="relative overflow-hidden p-6">
          <div className="absolute -right-10 -top-10 size-36 rounded-full bg-[color:var(--color-mod-seal)]/10" aria-hidden />
          <p className="relative text-xs font-extrabold tracking-widest text-[color:var(--color-mod-seal)]">SEAL REQUEST</p>
          <h3 className="relative mt-1 text-xl font-bold">인장 날인 신청</h3>
          <p className="relative mt-2 text-sm text-ink-2">법인인감·직인 날인과 인감증명서·사용인감계 발급을 신청합니다. 사전 승인(결재) 증빙이 필요합니다.</p>
          <Button className="relative mt-5 w-full" onClick={onNew}>
            + 날인 신청서 작성
          </Button>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold">내 신청 조회</h3>
          <p className="mt-1 text-xs text-ink-3">이름, 부서 또는 신청번호로 조회합니다.</p>
          <form className="mt-4 flex gap-2" onSubmit={(e) => (e.preventDefault(), setApplied(kw.trim()))}>
            <input className="input" placeholder="이름/부서/신청번호" value={kw} onChange={(e) => setKw(e.target.value)} />
            <Button type="submit" variant="dark" className="h-[46px] shrink-0 rounded-[14px] px-4">
              <Search className="size-4" /> 조회
            </Button>
          </form>
        </Card>
        <Card className="p-6">
          <h3 className="mb-3 font-bold">진행 절차</h3>
          <ol className="space-y-2 text-sm text-ink-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-[color:var(--color-mod-seal)]/10 text-[11px] font-bold text-[color:var(--color-mod-seal)]">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <div className="min-w-0 space-y-3">
        <p className="text-sm font-semibold text-ink-3">{applied ? `‘${applied}’ 조회 결과 ${list.length}건` : "최근 신청"}</p>
        {list.length === 0 && <Empty>조회된 신청이 없습니다.</Empty>}
        {list.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="cursor-pointer p-5 transition-shadow hover:shadow-lift" onClick={() => setDetail(r)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <KindPill k={r.seal_kind} />
                    <span className="text-xs font-semibold text-ink-3 tabular">{r.request_no}</span>
                  </div>
                  <p className="mt-2 font-bold">
                    {r.document_name} <span className="font-medium text-ink-3">· {r.quantity}부</span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {r.purpose} → {r.submit_to}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    {r.requester_name} · {r.department} · 신청 {fmtMd(r.requested_at)} · 필요 {fmtMd(r.needed_date)}
                    {certificateText(r) && ` · ${certificateText(r)}`}
                  </p>
                </div>
                <SealStatusPill s={r.status} />
              </div>
              <div className="mt-4">
                <Stepper status={r.status} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <SealDetailModal r={live} onClose={() => setDetail(null)} />
    </div>
  );
}

function Row({ k, v, full }: { k: string; v: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-canvas p-3", full && "sm:col-span-2")}>
      <p className="text-xs text-ink-3">{k}</p>
      <div className="mt-0.5 text-sm font-semibold">{v || "-"}</div>
    </div>
  );
}

function SealDetailModal({ r, onClose, admin }: { r: SealRequest | null; onClose: () => void; admin?: boolean }) {
  const { sealAct, notify } = useDemo();
  const [reason, setReason] = useState("");
  const [sealedDate, setSealedDate] = useState(todayStr());
  const [sealedBy, setSealedBy] = useState("송현우");
  const [issued, setIssued] = useState(false);
  useEffect(() => {
    setReason("");
    setSealedDate(todayStr());
    setIssued(false);
  }, [r?.id]);
  const act = async (a: SealAction, msg: string) => {
    const res = await sealAct(r!.id, a);
    notify(res.ok ? msg : res.error, !res.ok);
  };
  return (
    <Modal open={!!r} onClose={onClose} eyebrow={r?.request_no} title="날인 신청 상세" tone="plain" width="max-w-3xl">
      {r && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <KindPill k={r.seal_kind} />
            <SealStatusPill s={r.status} />
            {r.certificates_issued && <Pill className="bg-brand-50 text-brand-700">증명서 발급 완료</Pill>}
          </div>
          <Stepper status={r.status} />
          {r.status === "반려" && <Notice tone="error">반려 사유: {r.reject_reason}</Notice>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Row k="신청자 / 소속 부서" v={`${r.requester_name} · ${r.department}`} />
            <Row k="연락처" v={r.contact} />
            <Row k="대상 문서명" v={r.document_name} />
            <Row k="날인 수량" v={`${r.quantity}부`} />
            <Row k="날인 목적" v={r.purpose} full />
            <Row k="사용처 · 제출처" v={r.submit_to} />
            <Row k="신청일 / 필요 일자" v={`${r.requested_at} / ${r.needed_date}`} />
            <Row
              k="사전 승인 증빙"
              full
              v={
                <>
                  {approvalText(r)}
                  {r.approval_note && <span className="mt-1 block font-normal text-ink-2">{r.approval_note}</span>}
                </>
              }
            />
            <Row k="증명서 발급 희망" v={certificateText(r) || "없음"} />
            <Row k="첨부파일" v={<span className="font-normal text-ink-3">추후 지원 예정</span>} />
            {r.remarks && <Row k="기타 요청사항" v={r.remarks} full />}
            {r.sealed_date && <Row k="실제 날인" v={`${r.sealed_date} · ${r.sealed_by}`} full />}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">승인·처리 이력 (변경 불가 기록)</p>
            <ol className="relative space-y-3 border-l-2 border-line pl-5">
              {r.history.map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white bg-[color:var(--color-mod-seal)]" />
                  <b>{h.action}</b> <span className="text-ink-3">· {h.actor} · {new Date(h.at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  {h.note && <p className="text-xs text-ink-2">{h.note}</p>}
                </li>
              ))}
            </ol>
          </div>

          {!admin && ["접수", "검토중", "승인"].includes(r.status) && (
            <Button
              variant="ghost"
              className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-700"
              onClick={() => confirm("이 날인 신청을 취소할까요?") && act({ type: "cancel", actor: r.requester_name }, "신청을 취소했습니다.")}
            >
              신청 취소
            </Button>
          )}

          {admin && (
            <div className="space-y-3 rounded-3xl border border-[color:var(--color-mod-seal)]/30 bg-[color:var(--color-mod-seal)]/5 p-4">
              <p className="text-sm font-bold text-[color:var(--color-mod-seal)]">관리자 처리</p>
              {r.status === "접수" && (
                <Button variant="secondary" className="w-full" onClick={() => act({ type: "review", actor: ADMIN_NAME }, "검토를 시작했습니다.")}>
                  검토 시작 (처리 담당자로 지정)
                </Button>
              )}
              {(r.status === "접수" || r.status === "검토중") && (
                <>
                  <Button className="w-full" onClick={() => act({ type: "approve", actor: "김경영(경영지원부장)" }, "승인했습니다. 실제 날인 후 날인 완료를 등록하세요.")}>
                    <Check className="size-4" /> 승인
                  </Button>
                  <Field label="반려 사유">
                    <textarea className="input h-20 py-3" placeholder="반려 사유를 입력하세요" value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                  <Button variant="ghost" className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-700" onClick={() => act({ type: "reject", actor: "김경영(경영지원부장)", reason }, "반려했습니다.")}>
                    <X className="size-4" /> 반려
                  </Button>
                </>
              )}
              {r.status === "승인" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="실제 날인 일자" required>
                    <input type="date" className="input" value={sealedDate} onChange={(e) => setSealedDate(e.target.value)} />
                  </Field>
                  <Field label="날인 처리자" required>
                    <input className="input" value={sealedBy} onChange={(e) => setSealedBy(e.target.value)} />
                  </Field>
                  {certificateText(r) && (
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" className="size-4 accent-brand-600" checked={issued} onChange={(e) => setIssued(e.target.checked)} />
                      {certificateText(r)} 발급 완료
                    </label>
                  )}
                  <Button className="sm:col-span-2" onClick={() => act({ type: "seal", actor: ADMIN_NAME, sealed_date: sealedDate, sealed_by: sealedBy, certificates_issued: issued }, "날인 완료를 등록했습니다. 사용대장에 기록됩니다.")}>
                    <FileCheck2 className="size-4" /> 날인 완료 등록
                  </Button>
                </div>
              )}
              {["반려", "날인완료", "취소"].includes(r.status) && <p className="text-sm text-ink-3">처리가 끝난 신청입니다.</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- 관리자: 승인·날인 처리 ---------------- */
type Filter = { from: string; to: string; dept: string; name: string; kind: string; status: string };
const EMPTY_FILTER: Filter = { from: "", to: "", dept: "", name: "", kind: "", status: "" };

function applyFilter(list: SealRequest[], f: Filter, dateKey: (r: SealRequest) => string | null | undefined = (r) => r.requested_at) {
  return list.filter((r) => {
    const d = dateKey(r) ?? "";
    return (!f.from || d >= f.from) && (!f.to || d <= f.to) && (!f.dept || r.department === f.dept) && (!f.name || r.requester_name.includes(f.name)) && (!f.kind || r.seal_kind === f.kind) && (!f.status || r.status === f.status);
  });
}

function FilterBar({ f, setF, showStatus = true, dateLabel = "신청일" }: { f: Filter; setF: (f: Filter) => void; showStatus?: boolean; dateLabel?: string }) {
  const u = (k: keyof Filter, v: string) => setF({ ...f, [k]: v });
  return (
    <Card className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <Field label={`${dateLabel} 시작`}>
        <input type="date" className="input" value={f.from} onChange={(e) => u("from", e.target.value)} />
      </Field>
      <Field label={`${dateLabel} 종료`}>
        <input type="date" className="input" value={f.to} onChange={(e) => u("to", e.target.value)} />
      </Field>
      <Field label="부서">
        <select className="input" value={f.dept} onChange={(e) => u("dept", e.target.value)}>
          <option value="">전체 부서</option>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="신청자">
        <input className="input" placeholder="이름" value={f.name} onChange={(e) => u("name", e.target.value)} />
      </Field>
      <Field label="인장 종류">
        <select className="input" value={f.kind} onChange={(e) => u("kind", e.target.value)}>
          <option value="">전체</option>
          {SEAL_KINDS.map((k) => (
            <option key={k.value}>{k.value}</option>
          ))}
        </select>
      </Field>
      {showStatus ? (
        <Field label="상태">
          <select className="input" value={f.status} onChange={(e) => u("status", e.target.value)}>
            <option value="">전체 상태</option>
            {SEAL_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="flex items-end">
          <Button variant="ghost" size="sm" className="h-[46px] w-full" onClick={() => setF(EMPTY_FILTER)}>
            조건 초기화
          </Button>
        </div>
      )}
    </Card>
  );
}

function SealAdmin() {
  const { seal } = useDemo();
  const [f, setF] = useState<Filter>(EMPTY_FILTER);
  const [sel, setSel] = useState<string | null>(null);
  const list = applyFilter(seal, f);
  const live = sel ? seal.find((r) => r.id === sel) ?? null : null;
  const counts = SEAL_STATUSES.map((s) => [s, seal.filter((r) => r.status === s).length] as const);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {counts.map(([s, n]) => (
          <button key={s} onClick={() => setF({ ...f, status: f.status === s ? "" : s })} className={cn("rounded-2xl border bg-white p-3 text-left shadow-card transition", f.status === s ? "border-[color:var(--color-mod-seal)] ring-2 ring-[color:var(--color-mod-seal)]/20" : "border-line")}>
            <SealStatusPill s={s} />
            <p className="mt-2 text-2xl font-extrabold">
              <CountUp value={n} />
            </p>
          </button>
        ))}
      </div>
      <FilterBar f={f} setF={setF} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-canvas text-xs text-ink-3">
              <tr>
                {["신청번호", "인장", "대상 문서 / 목적", "부서 · 신청자", "신청일 / 필요일", "사전 승인", "증명서", "상태"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} onClick={() => setSel(r.id)} className="cursor-pointer border-t border-line hover:bg-[color:var(--color-mod-seal)]/5">
                  <td className="px-4 py-3 text-xs font-semibold tabular">{r.request_no}</td>
                  <td className="px-4 py-3">
                    <KindPill k={r.seal_kind} />
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-semibold">{r.document_name} · {r.quantity}부</p>
                    <p className="truncate text-xs text-ink-3">{r.purpose}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.department}
                    <span className="block text-xs text-ink-3">{r.requester_name}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular text-ink-2">
                    {r.requested_at}
                    <span className="block text-xs text-ink-3">{r.needed_date}</span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-ink-2">{approvalText(r)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{certificateText(r) || "-"}</td>
                  <td className="px-4 py-3">
                    <SealStatusPill s={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <div className="p-8 text-center text-sm text-ink-3">조건에 맞는 신청이 없습니다.</div>}
      </Card>
      <SealDetailModal r={live} admin onClose={() => setSel(null)} />
    </div>
  );
}

/* ---------------- 관리자: 목록 출력 · 사용대장 ---------------- */
function SealPrint() {
  const { seal, notify } = useDemo();
  const [type, setType] = useState<SealListType>("requests");
  const [kind, setKind] = useState<SealKind | "전체">("법인인감");
  const [f, setF] = useState<Filter>(EMPTY_FILTER);
  const rows = useMemo(() => {
    const base = type === "ledger" ? seal.filter((r) => r.status === "날인완료") : seal.filter((r) => r.status !== "취소");
    const filtered = applyFilter(base, { ...f, kind: kind === "전체" ? "" : kind, status: "" }, type === "ledger" ? (r) => r.sealed_date : (r) => r.requested_at);
    return filtered.sort((a, b) => ((type === "ledger" ? a.sealed_date ?? "" : a.requested_at) < (type === "ledger" ? b.sealed_date ?? "" : b.requested_at) ? -1 : 1));
  }, [seal, type, kind, f]);
  const fileBase = `${kind === "전체" ? "인장" : kind}_${type === "ledger" ? "날인완료대장" : "날인요청목록"}_${todayStr()}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["requests", "날인 요청 목록", "접수·검토·승인·반려 등 신청된 전체 목록 (취소 제외)"],
            ["ledger", "날인 완료 대장 (사용대장)", "실제 날인이 완료된 건 — 날인일자 기준"],
          ] as const
        ).map(([v, t, d]) => (
          <button key={v} onClick={() => setType(v)} className={cn("rounded-3xl border bg-white p-5 text-left shadow-card transition", type === v ? "border-[color:var(--color-mod-seal)] ring-2 ring-[color:var(--color-mod-seal)]/20" : "border-line")}>
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-ink-3">{d}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["법인인감", "직인", "전체"] as const).map((k) => {
          const n = (type === "ledger" ? seal.filter((r) => r.status === "날인완료") : seal.filter((r) => r.status !== "취소")).filter((r) => k === "전체" || r.seal_kind === k).length;
          const color = SEAL_KINDS.find((x) => x.value === k)?.color ?? "#4b5a56";
          return (
            <button key={k} onClick={() => setKind(k)} className={cn("flex items-center justify-between rounded-2xl border bg-white px-5 py-4 transition", kind === k ? "ring-2" : "border-line")} style={kind === k ? { borderColor: color, boxShadow: `0 0 0 2px ${color}33` } : undefined}>
              <span className="flex items-center gap-2 font-bold" style={{ color }}>
                <Stamp className="size-4" /> {k} 리스트
              </span>
              <span className="text-2xl font-extrabold">{n}</span>
            </button>
          );
        })}
      </div>
      <FilterBar f={f} setF={setF} showStatus={false} dateLabel={type === "ledger" ? "날인일" : "신청일"} />
      <Reveal>
        <Card className="p-5 md:p-6">
          <CardHeader
            title={`${kind === "전체" ? "전체 인장" : kind} ${type === "ledger" ? "날인 완료 대장" : "날인 요청 목록"}`}
            description={`${rows.length}건 · A4 가로 서식으로 출력됩니다.`}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadXls(`${fileBase}.xls`, buildSealListHtml(rows, type, kind))}>
                  <Download className="size-4" /> Excel
                </Button>
                <Button size="sm" onClick={() => printHtml(buildSealListHtml(rows, type, kind, true)) || notify("팝업이 차단되었습니다. 팝업을 허용해주세요.", true)}>
                  <Printer className="size-4" /> 출력
                </Button>
              </div>
            }
            className="mb-4"
          />
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-[color:var(--color-mod-seal)]/10 text-ink-2">
                <tr>
                  {(type === "ledger"
                    ? ["No", "신청번호", "날인일자", "인장", "부서", "신청자", "대상 문서", "제출처", "수량", "사전 승인 증빙", "증명서", "처리자"]
                    : ["No", "신청번호", "신청일", "필요일", "인장", "부서", "신청자", "대상 문서", "제출처", "수량", "사전 승인 증빙", "상태"]
                  ).map((h) => (
                    <th key={h} className="px-3 py-2.5 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5 tabular">{r.request_no}</td>
                    {type === "ledger" ? <td className="px-3 py-2.5 tabular">{r.sealed_date}</td> : <><td className="px-3 py-2.5 tabular">{r.requested_at}</td><td className="px-3 py-2.5 tabular">{r.needed_date}</td></>}
                    <td className="px-3 py-2.5">{r.seal_kind}</td>
                    <td className="px-3 py-2.5">{r.department}</td>
                    <td className="px-3 py-2.5">{r.requester_name}</td>
                    <td className="px-3 py-2.5">{r.document_name}</td>
                    <td className="px-3 py-2.5">{r.submit_to}</td>
                    <td className="px-3 py-2.5">{r.quantity}</td>
                    <td className="max-w-[220px] px-3 py-2.5">{approvalText(r)}</td>
                    {type === "ledger" ? (
                      <>
                        <td className="px-3 py-2.5">{certificateText(r) || "-"}</td>
                        <td className="px-3 py-2.5">{r.sealed_by}</td>
                      </>
                    ) : (
                      <td className="px-3 py-2.5">
                        <SealStatusPill s={r.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <div className="p-8 text-center text-sm text-ink-3">해당 내역이 없습니다.</div>}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
