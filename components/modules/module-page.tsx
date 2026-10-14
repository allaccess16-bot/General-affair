"use client";

import { motion } from "framer-motion";
import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ModuleArt } from "@/components/art/module-art";
import { useRequests } from "@/components/providers/requests-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Reveal, Stagger, staggerItem } from "@/components/ui/reveal";
import { DEPARTMENTS, STATUSES } from "@/lib/data";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { ModuleHighlight } from "./module-highlights";
import { RequestTable } from "./request-table";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ModulePage({ moduleKey }: { moduleKey: ModuleKey }) {
  const m = MODULE_MAP[moduleKey];
  const Icon = m.icon;
  const params = useSearchParams();
  const { requests, openRequest } = useRequests();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [dept, setDept] = useState(params.get("dept") ?? "");
  const [activeMenu, setActiveMenu] = useState(0);

  const mine = useMemo(() => requests.filter((r) => r.module === moduleKey), [requests, moduleKey]);
  const rows = mine.filter(
    (r) =>
      (!status || r.status === status) &&
      (!dept || r.dept === dept) &&
      (!q.trim() || `${r.title} ${r.no} ${r.requester}`.includes(q.trim())),
  );

  const stats = [
    { label: "전체 신청", value: mine.length },
    { label: "진행 중", value: mine.filter((r) => ["접수", "진행중", "승인대기", "승인완료"].includes(r.status)).length },
    { label: "완료", value: mine.filter((r) => r.status === "완료").length },
    { label: "긴급", value: mine.filter((r) => r.urgent).length },
  ];

  return (
    <div>
      {/* 모듈 배너 */}
      <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-canvas" aria-hidden />
        <div className="absolute -left-32 top-0 -z-10 size-[420px] rounded-full bg-brand-200/40 blur-[110px]" aria-hidden />
        <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-8 md:px-8 md:pt-12">
          <nav className="mb-6 flex items-center gap-1 text-sm text-ink-3" aria-label="경로">
            <Link href="/" className="hover:text-brand-700">
              홈
            </Link>
            <ChevronRight className="size-4" />
            <span className="font-semibold text-ink-2">{m.name}</span>
          </nav>
          <div className="grid items-center gap-6 overflow-hidden rounded-[32px] border border-white bg-white/80 p-6 shadow-card backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-8">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl text-white shadow-card" style={{ background: m.color }}>
                  <Icon className="size-6" />
                </span>
                <Badge className={m.badge.tone === "new" ? "bg-[color:var(--color-mod-seal)]/10 text-[color:var(--color-mod-seal)]" : "bg-brand-50 text-brand-700"}>
                  {m.badge.label}
                </Badge>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
                className="mt-5 text-[30px] font-extrabold leading-tight tracking-tight md:text-[42px]"
              >
                {m.name}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.16 }} className="mt-3 max-w-xl text-ink-2 md:text-lg">
                {m.description}
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.24 }} className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => openRequest(moduleKey)}>
                  <Plus className="size-4" /> {m.requestLabel}
                </Button>
                <Link href="#requests" className="inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold text-ink-2 ring-1 ring-line hover:bg-white">
                  신청 내역 보기
                </Link>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}>
              <ModuleArt module={moduleKey} className="h-48 rounded-3xl md:h-60" />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 md:px-8 lg:grid-cols-[240px_1fr]">
        {/* 좌측 서브 메뉴 */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-1.5 overflow-x-auto rounded-3xl border border-line bg-white p-2 shadow-card scrollbar-none lg:flex-col" aria-label={`${m.shortName} 메뉴`}>
            {m.subMenus.map((s, i) => (
              <button
                key={s}
                onClick={() => setActiveMenu(i)}
                className={cn(
                  "relative shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                  activeMenu === i ? "text-white" : "text-ink-2 hover:bg-canvas",
                )}
              >
                {activeMenu === i && (
                  <motion.span layoutId={`submenu-${moduleKey}`} className="absolute inset-0 -z-0 rounded-2xl" style={{ background: m.color }} />
                )}
                <span className="relative">{s}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <motion.div key={s.label} variants={staggerItem} className="rounded-3xl border border-line bg-white p-5 shadow-card">
                <p className="text-sm font-semibold text-ink-3">{s.label}</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight">
                  <CountUp value={s.value} />
                  <span className="ml-1 text-sm font-bold text-ink-3">건</span>
                </p>
              </motion.div>
            ))}
          </Stagger>

          <Reveal>
            <ModuleHighlight moduleKey={moduleKey} />
          </Reveal>

          <Reveal>
            <Card id="requests" className="scroll-mt-24 p-5 md:p-6">
              <CardHeader title="신청 내역" description={`${m.subMenus[activeMenu]} · 검색 결과 ${rows.length}건`} className="mb-4" />
              <div className="mb-5 grid gap-2 md:grid-cols-[1fr_180px_180px]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목, 신청번호, 신청자 검색" className="input pl-10" />
                </label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input" aria-label="상태">
                  <option value="">전체 상태</option>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select value={dept} onChange={(e) => setDept(e.target.value)} className="input" aria-label="부서">
                  <option value="">전체 부서</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <RequestTable rows={rows} showModule={false} />
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
