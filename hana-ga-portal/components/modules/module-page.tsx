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
import { ModuleHero } from "./module-hero";
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
      <ModuleHero moduleKey={moduleKey} onPrimary={() => openRequest(moduleKey)} />

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
