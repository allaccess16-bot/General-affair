"use client";

import { motion } from "framer-motion";
import { CarFront, Inbox, Loader, Presentation, Stamp, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { Stagger, staggerItem } from "@/components/ui/reveal";
import { KPI } from "@/lib/data";

type Item = { label: string; value: number; unit: string; desc: string; icon: LucideIcon; color: string; delta: string };

const ITEMS: Item[] = [
  { label: "오늘 접수 업무", value: KPI.todayReceived, unit: "건", desc: "전 모듈 신규 접수", icon: Inbox, color: "var(--color-brand-600)", delta: "+6 전일 대비" },
  { label: "처리 중", value: KPI.inProgress, unit: "건", desc: "담당자 배정 완료", icon: Loader, color: "var(--color-mod-ga)", delta: "평균 1.4일 소요" },
  { label: "회의실 예약", value: KPI.meetingToday, unit: "건", desc: "오늘 확정된 회의", icon: Presentation, color: "var(--color-mod-meeting)", delta: "이용률 74%" },
  { label: "차량 예약", value: KPI.vehicleToday, unit: "건", desc: "오늘 배차 일정", icon: CarFront, color: "var(--color-mod-vehicle)", delta: "가용 1대" },
  { label: "인장 신청", value: KPI.sealPending, unit: "건", desc: "승인·날인 대기", icon: Stamp, color: "var(--color-mod-seal)", delta: "긴급 2건" },
];

export function KpiSection() {
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-10 md:px-8" aria-label="오늘의 업무 현황">
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {ITEMS.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className={`group relative overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-lift ${i === 0 ? "col-span-2 md:col-span-1" : ""}`}
            >
              <div
                className="absolute -right-8 -top-8 size-28 rounded-full opacity-[0.08] transition-transform duration-500 group-hover:scale-125"
                style={{ background: k.color }}
                aria-hidden
              />
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${k.color} 12%, white)`, color: k.color }}>
                  <Icon className="size-5" />
                </span>
                <span className="text-[11px] font-semibold text-ink-3">{k.delta}</span>
              </div>
              <p className="mt-5 text-sm font-semibold text-ink-2">{k.label}</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none tracking-tight text-ink">
                <CountUp value={k.value} />
                <span className="ml-1 text-base font-bold text-ink-3">{k.unit}</span>
              </p>
              <p className="mt-2 text-xs text-ink-3">{k.desc}</p>
            </motion.div>
          );
        })}
      </Stagger>
    </section>
  );
}
