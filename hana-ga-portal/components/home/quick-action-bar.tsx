"use client";

import { motion } from "framer-motion";
import { Building2, CalendarDays, LayoutGrid, ListChecks, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRequests } from "@/components/providers/requests-provider";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { DEPARTMENTS, STATUSES } from "@/lib/data";
import { MODULES } from "@/lib/modules";

const QUICK_TAGS = [
  { label: "오늘 회의실 빈 시간", href: "/meeting" },
  { label: "내 승인 대기", href: "/seal?status=승인대기#requests" },
  { label: "차량 이용 가능", href: "/vehicle" },
  { label: "사무용품 신청", href: "/ga" },
];

export function QuickActionBar() {
  const router = useRouter();
  const { openRequest } = useRequests();
  const [module, setModule] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [dept, setDept] = useState("");

  const selected = MODULES.find((m) => m.name === module);

  const search = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dept) params.set("dept", dept);
    const qs = params.toString();
    router.push(`${selected?.href ?? "/admin"}${qs ? `?${qs}` : ""}#requests`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
      className="rounded-[28px] border border-white bg-white/90 p-2 shadow-[0_30px_70px_-30px_rgb(0_95_77/0.4)] backdrop-blur-xl"
    >
      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:divide-x lg:divide-line">
        <SelectField
          label="업무 구분"
          icon={LayoutGrid}
          value={module}
          onChange={setModule}
          placeholder="전체 업무"
          options={MODULES.map((m) => m.name)}
        />
        <label className="group flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-brand-50/70">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 group-hover:bg-white">
            <CalendarDays className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-ink-3">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none"
            />
          </span>
        </label>
        <SelectField label="진행 상태" icon={ListChecks} value={status} onChange={setStatus} placeholder="전체 상태" options={STATUSES} />
        <SelectField label="부서" icon={Building2} value={dept} onChange={setDept} placeholder="전체 부서" options={DEPARTMENTS} />
        <div className="flex gap-2 p-2 lg:pl-3">
          <Button variant="secondary" className="h-14 flex-1 px-5 lg:flex-none" onClick={search}>
            <Search className="size-[18px]" /> 조회하기
          </Button>
          <Button className="h-14 flex-1 px-6 lg:flex-none" onClick={() => openRequest(selected?.key)}>
            <Plus className="size-[18px]" /> 바로 신청
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto border-t border-line px-4 py-3 scrollbar-none">
        <span className="shrink-0 text-xs font-bold text-ink-3">빠른 실행</span>
        {QUICK_TAGS.map((t) => (
          <button
            key={t.label}
            onClick={() => router.push(t.href)}
            className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:bg-brand-50 hover:text-brand-700"
          >
            # {t.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
