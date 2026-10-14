"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, RefreshCw, Search, Settings2, ShieldCheck, ShieldOff, UserCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import * as live from "@/lib/db/live";
import { cn } from "@/lib/utils";

const MODULES: { key: live.ModuleKeyDb; label: string }[] = [
  { key: "ga", label: "총무" },
  { key: "vehicle", label: "차량" },
  { key: "meeting", label: "회의실" },
  { key: "seal", label: "인장" },
];
const FILTERS = [
  { key: "pending", label: "승인대기" },
  { key: "all", label: "전체" },
  { key: "admin", label: "관리자" },
  { key: "disabled", label: "이용중지" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const STATUS_STYLE: Record<live.Profile["status"], { label: string; cls: string }> = {
  pending: { label: "승인대기", cls: "bg-amber-50 text-amber-700" },
  active: { label: "이용중", cls: "bg-brand-50 text-brand-700" },
  disabled: { label: "이용중지", cls: "bg-zinc-100 text-zinc-500" },
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" });

/** 최고관리자: 가입 승인 · 관리자 권한(모듈별) · 이용중지 · 가입 정책 */
export function UserManagement() {
  const { isAdmin, profile: me, refresh: refreshMe } = useAuth();
  const { notify } = useDemo();
  const superAdmin = isAdmin();
  const [rows, setRows] = useState<live.Profile[]>([]);
  const [settings, setSettings] = useState<live.AuthSettings | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, st] = await Promise.all([live.listProfiles(), live.getSettings()]);
      setRows(p);
      setSettings(st);
      setDomains(st.allowed_email_domains.join(", "));
    } catch (e) {
      notify(live.friendly(e), true);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    if (superAdmin) load();
  }, [superAdmin, load]);

  // 승인대기가 없으면 처음 화면을 '전체'로
  useEffect(() => {
    if (!loading && filter === "pending" && !rows.some((r) => r.status === "pending")) setFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      admin: rows.filter((r) => r.role === "admin" && r.status === "active").length,
      disabled: rows.filter((r) => r.status === "disabled").length,
    }),
    [rows],
  );

  const list = useMemo(() => {
    const k = q.trim();
    return rows.filter(
      (r) =>
        (filter === "all" || (filter === "admin" ? r.role === "admin" : r.status === filter)) &&
        (!k || `${r.name} ${r.email} ${r.department}`.includes(k)),
    );
  }, [rows, filter, q]);

  const save = async (r: live.Profile, patch: Partial<Pick<live.Profile, "status" | "role" | "admin_modules">>, msg: string) => {
    const next = { ...r, ...patch };
    setBusyId(r.id);
    try {
      await live.adminUpdateProfile(r.id, next.status, next.role, next.role === "admin" ? next.admin_modules : []);
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...next, admin_modules: next.role === "admin" ? next.admin_modules : [] } : x)));
      notify(msg);
      if (r.id === me?.id) refreshMe();
    } catch (e) {
      notify(live.friendly(e), true);
    }
    setBusyId(null);
  };

  const toggleModule = (r: live.Profile, m: live.ModuleKeyDb | "all") => {
    if (m === "all") return save(r, { role: "admin", admin_modules: [] }, `${r.name} — 최고관리자(전체 업무) 권한을 부여했습니다.`);
    const cur = r.role === "admin" ? r.admin_modules : [];
    const nextMods = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m];
    if (r.role === "admin" && cur.length === 0) {
      // 최고관리자 → 특정 업무 관리자로 좁히기
      return save(r, { role: "admin", admin_modules: [m] }, `${r.name} — ${MODULES.find((x) => x.key === m)!.label} 관리자로 변경했습니다.`);
    }
    if (nextMods.length === 0) return save(r, { role: "user", admin_modules: [] }, `${r.name} — 일반 직원으로 변경했습니다.`);
    return save(r, { role: "admin", admin_modules: nextMods }, `${r.name} — 관리 업무: ${nextMods.map((x) => MODULES.find((y) => y.key === x)!.label).join("·")}`);
  };

  const saveSetting = async (key: keyof live.AuthSettings, value: unknown, msg: string) => {
    try {
      await live.setSetting(key, value);
      setSettings((s) => (s ? { ...s, [key]: value } : s));
      notify(msg);
    } catch (e) {
      notify(live.friendly(e), true);
    }
  };

  if (!superAdmin)
    return (
      <Card className="p-6 text-sm text-ink-2">
        <CardHeader title="직원 · 권한 관리" description="가입 승인과 권한 부여는 최고관리자만 할 수 있습니다." />
      </Card>
    );

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card className="min-w-0 p-5 md:p-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Users className="size-5 text-brand-600" /> 직원 · 권한 관리
            </span>
          }
          description="가입 신청 승인, 업무별 관리자 지정, 이용 중지를 처리합니다."
          action={
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} /> 새로고침
            </Button>
          }
          className="mb-5"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Users, label: "전체 직원", value: counts.all, tone: "text-brand-600" },
            { icon: Clock3, label: "승인대기", value: counts.pending, tone: "text-amber-600" },
            { icon: ShieldCheck, label: "관리자", value: counts.admin, tone: "text-violet-600" },
            { icon: ShieldOff, label: "이용중지", value: counts.disabled, tone: "text-zinc-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-canvas p-4">
              <s.icon className={cn("size-5", s.tone)} />
              <p className="mt-2 text-2xl font-extrabold tabular">{s.value}</p>
              <p className="text-xs text-ink-3">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-canvas p-1 scrollbar-none" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn("relative z-10 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors", filter === f.key ? "text-white" : "text-ink-2")}
              >
                {filter === f.key && <motion.span layoutId="um-filter" className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                <span className="relative">
                  {f.label} {counts[f.key] > 0 && <span className="tabular opacity-70">{counts[f.key]}</span>}
                </span>
              </button>
            ))}
          </div>
          <label className="relative block sm:w-64">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input className="input h-10 pl-10 text-sm" placeholder="이름·이메일·부서 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {loading && rows.length === 0 && <li className="p-8 text-center text-sm text-ink-3">불러오는 중…</li>}
          {!loading && list.length === 0 && <li className="p-8 text-center text-sm text-ink-3">해당하는 직원이 없습니다.</li>}
          <AnimatePresence initial={false}>
            {list.map((r) => {
              const st = STATUS_STYLE[r.status];
              const superRow = r.role === "admin" && r.admin_modules.length === 0;
              const busy = busyId === r.id;
              return (
                <motion.li key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("flex flex-col gap-3 p-4 lg:flex-row lg:items-center", busy && "opacity-60")}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-200 to-brand-500 text-sm font-bold text-white">{r.name.slice(0, 1)}</span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 font-bold">
                        {r.name}
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", st.cls)}>{st.label}</span>
                        {r.id === me?.id && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">나</span>}
                      </p>
                      <p className="truncate text-xs text-ink-3">
                        {r.department} · {r.email} {r.contact && `· ${r.contact}`} · 가입 {fmt(r.created_at)}
                      </p>
                    </div>
                  </div>

                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => save(r, { status: "active" }, `${r.name} 님의 가입을 승인했습니다.`)}>
                        <UserCheck className="size-4" /> 승인
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm(`${r.name} 님의 가입을 거절(이용중지)할까요?`) && save(r, { status: "disabled" }, "가입을 거절했습니다.")}>
                        거절
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-bold text-ink-3">관리 권한</span>
                      <button
                        disabled={busy || r.status !== "active"}
                        onClick={() => toggleModule(r, "all")}
                        className={cn("rounded-full border px-2.5 py-1 text-xs font-bold transition", superRow ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:border-brand-300")}
                      >
                        {superRow && <Check className="mr-0.5 inline size-3" />}전체
                      </button>
                      {MODULES.map((m) => {
                        const on = r.role === "admin" && (superRow || r.admin_modules.includes(m.key));
                        return (
                          <button
                            key={m.key}
                            disabled={busy || r.status !== "active"}
                            onClick={() => toggleModule(r, m.key)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-bold transition",
                              on ? (superRow ? "border-brand-200 bg-brand-50 text-brand-700" : "border-violet-500 bg-violet-500 text-white") : "border-line bg-white text-ink-2 hover:border-violet-300",
                            )}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                      {r.role === "admin" && !superRow && (
                        <button disabled={busy} onClick={() => save(r, { role: "user", admin_modules: [] }, `${r.name} — 일반 직원으로 변경했습니다.`)} className="ml-1 text-xs font-semibold text-ink-3 underline-offset-2 hover:underline">
                          해제
                        </button>
                      )}
                      <span className="mx-1 hidden h-4 w-px bg-line lg:block" />
                      {r.status === "active" ? (
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={busy} onClick={() => confirm(`${r.name} 님의 이용을 중지할까요?`) && save(r, { status: "disabled" }, "이용을 중지했습니다.")}>
                          이용중지
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => save(r, { status: "active" }, "이용을 재개했습니다.")}>
                          이용재개
                        </Button>
                      )}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-ink-3">
          <b>전체</b> = 최고관리자(모든 업무 처리 + 직원 관리). 업무 버튼(총무·차량·회의실·인장)을 누르면 해당 업무만 처리하는 관리자가 됩니다. 최고관리자는 최소 1명이 유지됩니다.
        </p>
      </Card>

      <Card className="h-fit p-5 md:p-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Settings2 className="size-5 text-brand-600" /> 가입 정책
            </span>
          }
          className="mb-4"
        />
        {settings && (
          <div className="space-y-5 text-sm">
            <label className="flex cursor-pointer items-start justify-between gap-3">
              <span>
                <b className="block">가입 즉시 이용</b>
                <span className="text-xs text-ink-3">끄면 관리자 승인 후 이용 (권장)</span>
              </span>
              <button
                role="switch"
                aria-checked={settings.auto_approve}
                onClick={() => saveSetting("auto_approve", !settings.auto_approve, settings.auto_approve ? "가입 후 관리자 승인이 필요합니다." : "가입하면 바로 이용할 수 있습니다.")}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", settings.auto_approve ? "bg-brand-600" : "bg-zinc-300")}
              >
                <motion.span layout className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow", settings.auto_approve ? "right-0.5" : "left-0.5")} />
              </button>
            </label>
            <div>
              <b className="block">가입 허용 메일 도메인</b>
              <span className="text-xs text-ink-3">쉼표로 구분 · 비우면 모든 메일 허용</span>
              <div className="mt-2 flex gap-2">
                <input className="input h-10 text-sm" placeholder="hanafn.com" value={domains} onChange={(e) => setDomains(e.target.value)} />
                <Button
                  size="sm"
                  className="h-10"
                  onClick={() => {
                    const list = domains.split(",").map((d) => d.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
                    saveSetting("allowed_email_domains", list, list.length ? `허용 도메인: ${list.join(", ")}` : "모든 메일 주소로 가입할 수 있습니다.");
                  }}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
