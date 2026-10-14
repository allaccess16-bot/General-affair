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
    <section className="mx-auto max-w-[1320px] px-4 py-10 md:px-8 md:py-14" aria-label="오늘의 업무 현황">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold tracking-[0.28em] text-ink-3">TODAY</p>
        <motion.span
          className="h-px flex-1 origin-left bg-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <Stagger className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-5">
        {ITEMS.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} variants={staggerItem} className={`group min-w-0 ${i === 0 ? "col-span-2 md:col-span-1" : ""}`}>
              <p className="flex items-baseline text-[40px] font-semibold leading-none tracking-[-0.04em] text-ink md:text-[52px]">
                <CountUp value={k.value} />
                <span className="ml-1 text-lg font-semibold text-ink-3 md:text-xl">{k.unit}</span>
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-ink-2">
                <Icon className="size-4 shrink-0" style={{ color: k.color }} />
                {k.label}
              </p>
              <p className="mt-1 text-xs text-ink-3">
                {k.desc} · <span className="font-semibold">{k.delta}</span>
              </p>
            </motion.div>
          );
        })}
      </Stagger>
    </section>
  );
}
