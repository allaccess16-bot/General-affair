"use client";

import { motion } from "framer-motion";
import { BadgeCheck, CarFront, Presentation, Stamp, TrendingUp } from "lucide-react";
import { Skyline } from "@/components/art/skyline";

const EASE = [0.22, 1, 0.36, 1] as const;

function Float({
  children,
  className,
  delay,
  amp = 10,
  dur = 6,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  amp?: number;
  dur?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      <motion.div animate={{ y: [0, -amp, 0] }} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

const BARS = [38, 52, 44, 68, 58, 82, 74, 96];

/** 히어로 우측 메인 비주얼 — 오피스 일러스트 위에 업무 포털 UI 카드가 떠 있는 구성 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[640px] lg:aspect-auto lg:h-[560px]">
      <motion.div
        className="absolute inset-x-[6%] inset-y-[4%] overflow-hidden rounded-[40px] shadow-[0_40px_80px_-40px_rgb(0_95_77/0.55)] ring-1 ring-white/70"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.15 }}
      >
        <Skyline className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/30 via-transparent to-white/10" />
      </motion.div>

      {/* 메인 대시보드 창 */}
      <Float delay={0.45} amp={8} dur={7} className="absolute left-0 top-[12%] w-[58%] min-w-[230px]">
        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_24px_50px_-20px_rgb(15_31_27/0.35)] backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-brand-300" />
            <span className="ml-2 text-[11px] font-semibold text-ink-3">통합 대시보드</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium text-ink-3">이번 달 처리 완료</p>
              <p className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl tabular">412건</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">
              <TrendingUp className="size-3" /> 12.4%
            </span>
          </div>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {BARS.map((h, i) => (
              <motion.span
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-300"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.8 + i * 0.06 }}
              />
            ))}
          </div>
        </div>
      </Float>

      {/* 승인 토스트 */}
      <Float delay={0.7} amp={7} dur={5.5} className="absolute right-0 top-[4%] w-[46%] min-w-[210px]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_20px_40px_-18px_rgb(15_31_27/0.35)] backdrop-blur-xl">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--color-mod-seal)]/10 text-[color:var(--color-mod-seal)]">
            <Stamp className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">법인인감 날인 승인</p>
            <p className="text-[11px] text-ink-3">2단계 결재 완료 · 방금</p>
          </div>
          <BadgeCheck className="ml-auto size-5 shrink-0 text-brand-500" />
        </div>
      </Float>

      {/* 회의실 */}
      <Float delay={0.9} amp={9} dur={6.5} className="absolute bottom-[8%] left-[4%] w-[44%] min-w-[180px]">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_40px_-18px_rgb(15_31_27/0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[color:var(--color-mod-meeting)]">
            <Presentation className="size-4" />
            <span className="text-[11px] font-bold">회의실 예약 확정</span>
          </div>
          <p className="mt-2 text-sm font-bold">13층 대회의실</p>
          <p className="text-[11px] text-ink-3">오늘 14:00 – 16:00 · 20명</p>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i >= 4 && i <= 6 ? "bg-[color:var(--color-mod-meeting)]" : "bg-line"}`}
              />
            ))}
          </div>
        </div>
      </Float>

      {/* 차량 + 진행률 링 */}
      <Float delay={1.05} amp={8} dur={7.5} className="absolute bottom-[16%] right-[2%] hidden w-[40%] min-w-[170px] sm:block">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_40px_-18px_rgb(15_31_27/0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden>
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-line)" strokeWidth="5" />
              <motion.circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="var(--color-mod-vehicle)"
                strokeWidth="5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 0.67 }}
                transition={{ duration: 1.4, ease: EASE, delay: 1.3 }}
              />
            </svg>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-bold text-[color:var(--color-mod-vehicle)]">
                <CarFront className="size-3.5" /> 차량 가동률
              </p>
              <p className="text-xl font-extrabold tabular">67%</p>
              <p className="text-[11px] text-ink-3">K5 3대 중 2대 운행</p>
            </div>
          </div>
        </div>
      </Float>
    </div>
  );
}
