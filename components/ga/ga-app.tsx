"use client";

import { motion } from "framer-motion";
import { CalendarCheck2, ChevronDown, Download, FileText, MapPin, Pencil, RefreshCw, Search, Siren, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Meters } from "@/components/charts/meters";
import { AdminGate } from "@/components/modules/admin-gate";
import { ModuleHero } from "@/components/modules/module-hero";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Empty, Field, Notice, Pill, Tabs } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Reveal } from "@/components/ui/reveal";
import { buildGaReportHtml, GA_STATUSES, type GaRequest, type GaStatus } from "@/lib/ga";
import { downloadCsv, downloadXls, fmtMd } from "@/lib/shared";
import { cn } from "@/lib/utils";
import { GaFormModal } from "./ga-form-modal";

export const GA_STATUS_STYLE: Record<GaStatus, string> = {
  접수: "bg-slate-100 text-slate-700",
  검토중: "bg-amber-50 text-amber-800",
  진행중: "bg-sky-50 text-sky-700",
  완료: "bg-brand-600 text-white",
  반려: "bg-rose-50 text-rose-700",
};

type Tab = "user" | "admin" | "stats";

export function GaApp() {
  const { ga, ready, isAdmin } = useDemo();
  const admin = isAdmin("ga");
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("user");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (params.get("new")) setFormOpen(true);
  }, [params]);

  const todo = ga.filter((r) => r.status !== "완료" && r.status !== "반려").length;

  return (
    <div>
      <ModuleHero
        moduleKey="ga"
        onPrimary={() => setFormOpen(true)}
        secondary={{ label: "내 요청 조회", href: "#work" }}
        meta={
          ready && (
            <div className="flex flex-wrap gap-2 text-sm">
              <Pill className="bg-white text-ink-2 ring-1 ring-line">전체 요청 {ga.length}건</Pill>
              <Pill className="bg-amber-50 text-amber-800">처리 필요 {todo}건</Pill>
              <Pill className="bg-brand-50 text-brand-700">완료 {ga.filter((r) => r.status === "완료").length}건</Pill>
            </div>
          )
        }
      />
      <div id="work" className="mx-auto max-w-[1320px] scroll-mt-24 space-y-6 px-4 md:px-8">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: "user", label: "업무요청 · 내 요청 조회" },
            { value: "admin", label: "요청 관리", locked: !admin, badge: admin ? todo : undefined },
            { value: "stats", label: "통계", locked: !admin },
          ]}
          className="w-fit max-w-full"
        />
        {tab === "user" && <GaUser onNew={() => setFormOpen(true)} />}
        {tab === "admin" && (
          <AdminGate module="ga">
            <GaAdmin />
          </AdminGate>
        )}
        {tab === "stats" && (
          <AdminGate module="ga">
            <GaStats />
          </AdminGate>
        )}
      </div>
      <GaFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function StatusPill({ s }: { s: GaStatus }) {
  return <Pill className={GA_STATUS_STYLE[s] ?? "bg-slate-100"}>{s}</Pill>;
}

/* ---------------- 요청자 화면 ---------------- */
function GaUser({ onNew }: { onNew: () => void }) {
  const { ga, ready } = useDemo();
  const [kw, setKw] = useState("");
  const [applied, setApplied] = useState("");
  const [detail, setDetail] = useState<GaRequest | null>(null);
  const [edit, setEdit] = useState<GaRequest | null>(null);

  const list = applied
    ? ga.filter((r) => r.requester_name.includes(applied) || r.department.includes(applied) || r.contact.includes(applied))
    : ga.slice(0, 6);

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Reveal>
          <Card className="relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 size-36 rounded-full bg-brand-100" aria-hidden />
            <div className="relative">
              <p className="text-xs font-extrabold tracking-widest text-brand-600">GENERAL AFFAIRS</p>
              <h3 className="mt-1 text-xl font-bold">총무 업무요청</h3>
              <p className="mt-2 text-sm text-ink-2">시설, 비품, 행정, 보안 등 필요한 요청을 등록하세요.</p>
              <Button className="mt-5 w-full" onClick={onNew}>
                + 새 요청 등록
              </Button>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="p-6">
            <h3 className="font-bold">내 요청 조회 / 내용 확인</h3>
            <p className="mt-1 text-xs text-ink-3">이름, 부서, 연락처 중 하나로 조회합니다.</p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setApplied(kw.trim());
              }}
            >
              <input className="input" placeholder="이름/부서/연락처" value={kw} onChange={(e) => setKw(e.target.value)} />
              <Button type="submit" variant="dark" className="h-[46px] shrink-0 rounded-[14px] px-4">
                <Search className="size-4" /> 조회
              </Button>
            </form>
            {applied && (
              <button className="mt-3 text-xs font-semibold text-brand-700" onClick={() => (setKw(""), setApplied(""))}>
                조회 조건 해제
              </button>
            )}
          </Card>
        </Reveal>
      </div>

      <div className="min-w-0 space-y-3">
        <p className="text-sm font-semibold text-ink-3">{applied ? `‘${applied}’ 조회 결과 ${list.length}건` : "최근 접수된 요청"}</p>
        {!ready ? (
          <div className="h-40 animate-pulse rounded-3xl bg-white" />
        ) : list.length === 0 ? (
          <Empty>조회된 요청이 없습니다.</Empty>
        ) : (
          list.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-bold">
                      {r.urgency === "긴급" && (
                        <Pill className="bg-rose-50 text-rose-600">
                          <Siren className="size-3" /> 긴급
                        </Pill>
                      )}
                      <span className="truncate">{r.title}</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-3">
                      {r.requester_name} · {r.department} · {fmtMd(r.created_at)} · {r.category}
                    </p>
                    {r.completed_at && <p className="mt-1 text-xs font-bold text-brand-700">완료일: {fmtMd(r.completed_at)}</p>}
                  </div>
                  <StatusPill s={r.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setDetail(r)}>
                    <FileText className="size-4" /> 내용 확인
                  </Button>
                  <Button variant="ghost" size="sm" className="bg-brand-50 text-brand-700" onClick={() => setEdit(r)}>
                    <Pencil className="size-4" /> 수정
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <GaDetailModal r={detail} onClose={() => setDetail(null)} onEdit={(r) => (setDetail(null), setEdit(r))} />
      <GaEditModal r={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function GaDetailModal({ r, onClose, onEdit }: { r: GaRequest | null; onClose: () => void; onEdit: (r: GaRequest) => void }) {
  return (
    <Modal open={!!r} onClose={onClose} eyebrow="REQUEST DETAIL" title="요청 내용 확인" tone="plain">
      {r && (
        <div className="space-y-3">
          <Box label="요청 제목">
            <p className="font-bold">{r.title}</p>
          </Box>
          <Box label="상세 내용">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.description}</p>
          </Box>
          <div className="grid grid-cols-2 gap-2">
            <Box label="요청자">{r.requester_name}</Box>
            <Box label="부서">{r.department}</Box>
            <Box label="연락처/내선">{r.contact || "미입력"}</Box>
            <Box label="상태">
              <StatusPill s={r.status} />
            </Box>
            <Box label="요청일">{r.request_date || fmtMd(r.created_at)}</Box>
            <Box label="완료일">{r.completed_at ? fmtMd(r.completed_at) : "미지정"}</Box>
            <Box label="요청 위치">{r.location}</Box>
            <Box label="담당자">{r.assignee || "미배정"}</Box>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-xs font-extrabold text-brand-700">관리자 진행사항</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{r.admin_memo || "아직 등록된 진행사항이 없습니다."}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" onClick={() => onEdit(r)}>
              내 요청 수정
            </Button>
            <Button onClick={onClose}>확인</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-canvas p-3.5">
      <p className="text-xs text-ink-3">{label}</p>
      <div className="mt-1 text-sm font-semibold">{children}</div>
    </div>
  );
}

/** 내 요청 수정 — 기존과 동일하게 수정 비밀번호 확인 후 제목·상세·위치만 변경 */
function GaEditModal({ r, onClose }: { r: GaRequest | null; onClose: () => void }) {
  const { gaEdit, notify, live, me, isAdmin } = useDemo();
  const needPw = !(me && r && (r.created_by === me.id || isAdmin("ga")));
  const [pw, setPw] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");
  useEffect(() => {
    if (!r) return;
    setPw("");
    setTitle(r.title);
    setDesc(r.description);
    setLoc(r.location);
  }, [r]);
  const submit = async () => {
    if (!r) return;
    if (needPw && !pw) return notify("수정 비밀번호를 입력해주세요.", true);
    if (!title.trim() || !desc.trim() || !loc.trim()) return notify("제목, 상세 내용, 요청 위치를 모두 입력해주세요.", true);
    // 비밀번호 확인은 저장소(실DB 모드에서는 서버 함수 ga.edit_request)에서 수행
    const res = await gaEdit(r.id, pw, { title: title.trim(), description: desc.trim(), location: loc.trim() });
    if (!res.ok) return notify(res.error, true);
    notify("요청 내용이 수정되었습니다.");
    onClose();
  };
  return (
    <Modal open={!!r} onClose={onClose} eyebrow="EDIT" title="내 요청 수정" tone="plain" footer={<Button className="w-full" onClick={submit}>수정 반영</Button>}>
      <div className="space-y-4">
        {needPw && (
          <Field label="수정 비밀번호" required hint={live ? undefined : "데모 데이터의 비밀번호는 1234 입니다."}>
            <input type="password" className="input" placeholder="작성 시 입력한 수정 비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
        )}
        <Field label="요청 제목">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="상세 내용">
          <textarea className="input h-32 py-3" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label="요청 위치">
          <input className="input" value={loc} onChange={(e) => setLoc(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------------- 관리자: 요청 관리 ---------------- */
function GaAdmin() {
  const { ga, gaUpdate, gaRemove, notify } = useDemo();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const list = ga.filter((r) => (!status || r.status === status) && (!q || `${r.title} ${r.requester_name} ${r.department}`.includes(q)));

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input className="input pl-10" placeholder="제목·요청자·부서 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="input sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="상태">
            <option value="">전체 상태</option>
            {GA_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => downloadXls("요청관리_상세내용포함_리포트.xls", buildGaReportHtml(ga))}>
            <Download className="size-4" /> 엑셀 리포트
          </Button>
        </div>
      </Card>
      {list.length === 0 && <Empty>요청이 없습니다.</Empty>}
      {list.map((r) => (
        <GaAdminRow
          key={r.id}
          r={r}
          open={open === r.id}
          onToggle={() => setOpen(open === r.id ? null : r.id)}
          onSave={async (p) => {
            const res = await gaUpdate(r.id, p);
            notify(res.ok ? "반영되었습니다." : res.error, !res.ok);
          }}
          onDelete={async () => {
            if (!confirm("이 업무요청을 삭제할까요? 삭제 후 복구할 수 없습니다.")) return;
            const res = await gaRemove(r.id);
            notify(res.ok ? "삭제되었습니다." : res.error, !res.ok);
          }}
        />
      ))}
    </div>
  );
}

function GaAdminRow({ r, open, onToggle, onSave, onDelete }: { r: GaRequest; open: boolean; onToggle: () => void; onSave: (p: Partial<GaRequest>) => void; onDelete: () => void }) {
  const [status, setStatus] = useState<GaStatus>(r.status);
  const [assignee, setAssignee] = useState(r.assignee ?? "");
  const [completed, setCompleted] = useState(r.completed_at ? r.completed_at.slice(0, 10) : "");
  const [memo, setMemo] = useState(r.admin_memo ?? "");
  useEffect(() => {
    setStatus(r.status);
    setAssignee(r.assignee ?? "");
    setCompleted(r.completed_at ? r.completed_at.slice(0, 10) : "");
    setMemo(r.admin_memo ?? "");
  }, [r]);

  return (
    <Card className={cn("overflow-hidden transition-shadow", open && "shadow-lift")}>
      <button className="flex w-full items-start gap-4 p-5 text-left" onClick={onToggle} aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill s={r.status} />
            {r.urgency === "긴급" && <Pill className="bg-rose-50 text-rose-600">긴급</Pill>}
            <Pill className="bg-canvas text-ink-2">{r.category}</Pill>
          </div>
          <p className="mt-2 font-bold">{r.title}</p>
          <p className="mt-1 line-clamp-1 text-sm text-ink-2">{r.description}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <span>
              {r.requester_name} · {r.department} · {r.contact}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {r.location}
            </span>
            <span>요청일 {r.request_date}</span>
            {r.assignee && <span>담당 {r.assignee}</span>}
          </p>
        </div>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-line bg-canvas/50 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="진행 상태">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as GaStatus)}>
                {GA_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="담당자">
              <input className="input" placeholder="담당자" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </Field>
            <Field label="완료일">
              <input type="date" className="input" value={completed} onChange={(e) => setCompleted(e.target.value)} />
            </Field>
            <Field label="처리메모 (요청자에게 ‘관리자 진행사항’으로 표시)" className="md:col-span-3">
              <textarea className="input h-24 py-3" placeholder="처리메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={onDelete}>
              <Trash2 className="size-4" /> 요청 삭제
            </Button>
            <Button
              onClick={() =>
                onSave({ status, assignee, admin_memo: memo, completed_at: completed ? new Date(`${completed}T00:00:00`).toISOString() : null })
              }
            >
              <RefreshCw className="size-4" /> 확인 후 반영
            </Button>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

/* ---------------- 관리자: 통계 ---------------- */
function GaStats() {
  const { ga } = useDemo();
  const cats = useMemo(() => {
    const o: Record<string, number> = {};
    ga.forEach((r) => (o[r.category || "기타"] = (o[r.category || "기타"] || 0) + 1));
    return Object.entries(o).sort((a, b) => b[1] - a[1]);
  }, [ga]);
  const depts = useMemo(() => {
    const o: Record<string, number> = {};
    ga.forEach((r) => (o[r.department || "미지정"] = (o[r.department || "미지정"] || 0) + 1));
    return Object.entries(o).sort((a, b) => b[1] - a[1]);
  }, [ga]);
  const statusCount = GA_STATUSES.map((s) => ({ s, n: ga.filter((r) => r.status === s).length }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {statusCount.map(({ s, n }) => (
          <Card key={s} className="p-5">
            <StatusPill s={s} />
            <p className="mt-3 text-3xl font-extrabold">
              <CountUp value={n} />
              <span className="ml-1 text-sm font-bold text-ink-3">건</span>
            </p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader
            title="카테고리별 요청"
            action={
              <Button size="sm" variant="secondary" onClick={() => downloadCsv("통계리포트.csv", [["부서", "요청건수"], ...depts])}>
                <Download className="size-4" /> 엑셀추출
              </Button>
            }
            className="mb-5"
          />
          {cats.length ? (
            <Meters items={cats.map(([label, value]) => ({ label, value }))} color="linear-gradient(90deg,#4fbf9b,#00876c)" max={Math.max(...cats.map((c) => c[1]))} unit="건" />
          ) : (
            <Empty>통계가 없습니다.</Empty>
          )}
        </Card>
        <Card className="p-6">
          <CardHeader title="부서별 요청 Top 5" className="mb-5" />
          <ol className="space-y-2.5">
            {depts.slice(0, 5).map(([d, c], i) => (
              <li key={d} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                <b className="flex-1">{d}</b>
                <b className="text-brand-700">{c}건</b>
              </li>
            ))}
          </ol>
          <Notice className="mt-4">
            <CalendarCheck2 className="mr-1 inline size-4" /> 처리 완료율 {ga.length ? Math.round((ga.filter((r) => r.status === "완료").length / ga.length) * 100) : 0}%
          </Notice>
        </Card>
      </div>
    </div>
  );
}
