"use client";

import { motion } from "framer-motion";
import { CarFront, Inbox, Loader, Presentation, Stamp, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { Stagger, staggerItem } from "@/components/ui/reveal";
import { useDemo } from "@/components/providers/demo-store";
import { useRequests } from "@/components/providers/requests-provider";
import { seoulParts } from "@/lib/meeting";
import { todayStr } from "@/lib/shared";
import { coversDate } from "@/lib/vehicle";

type Item = { label: string; value: number; unit: string; desc: string; icon: LucideIcon; color: string; delta: string };

export function KpiSection() {
  const { requests } = useRequests();
  const { meeting, vehicles } = useDemo();
  const today = todayStr();
  const todayMeeting = meeting.filter((r) => seoulParts(r.start_at).date === today && r.status !== "cancelled");
  const todayVehicle = vehicles.filter((c) => (c.status === "승인" || c.status === "신청") && coversDate(c, today));
  const sealOpen = requests.filter((r) => r.module === "seal" && (r.status === "승인대기" || r.status === "승인완료"));
  const ITEMS: Item[] = [
    { label: "오늘 접수 업무", value: requests.filter((r) => r.requestedAt === today).length, unit: "건", desc: "전 모듈 오늘 신청·예약", icon: Inbox, color: "var(--color-brand-600)", delta: "실시간" },
    { label: "처리 중", value: requests.filter((r) => r.status === "진행중" || r.status === "접수").length, unit: "건", desc: "접수·진행 단계 업무", icon: Loader, color: "var(--color-mod-ga)", delta: "총무·회의실" },
    { label: "회의실 예약", value: todayMeeting.length, unit: "건", desc: "오늘 회의실 예약", icon: Presentation, color: "var(--color-mod-meeting)", delta: `자동취소 ${todayMeeting.filter((r) => r.status === "no_show").length}` },
    { label: "차량 예약", value: todayVehicle.length, unit: "건", desc: "오늘 배차 일정", icon: CarFront, color: "var(--color-mod-vehicle)", delta: `승인대기 ${vehicles.filter((c) => c.status === "신청").length}` },
    { label: "인장 신청", value: sealOpen.length, unit: "건", desc: "승인·날인 대기", icon: Stamp, color: "var(--color-mod-seal)", delta: `긴급 ${sealOpen.filter((r) => r.urgent).length}` },
  ];
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
