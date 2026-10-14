"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import Link from "next/link";
import { useRequests } from "@/components/providers/requests-provider";
import { MODULES } from "@/lib/modules";
import { HeroVisual } from "./hero-visual";
import { QuickActionBar } from "./quick-action-bar";

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
});

export function Hero() {
  const { openRequest } = useRequests();
  return (
    <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
      {/* 배경: 연한 그린 그라데이션 + 블러 장식 */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-[#f3faf7] to-canvas" />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-brand-200/50 blur-[120px] animate-float-slow" />
        <div className="absolute -right-20 top-40 size-[420px] rounded-full bg-[#b5ecf0]/50 blur-[110px] animate-float" />
        <div className="absolute bottom-0 left-1/3 size-[300px] rounded-full bg-brand-100/70 blur-[100px]" />
      </div>

      <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-10 pt-10 md:px-8 lg:grid-cols-[1.02fr_1fr] lg:gap-6 lg:pt-16">
        <div>
          <motion.p
            {...fadeUp(0.05)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-brand-700 backdrop-blur"
          >
            <Sparkles className="size-3.5" /> 하나생명 경영지원부 통합 업무 포털
          </motion.p>

          <motion.h1
            {...fadeUp(0.15)}
            className="mt-6 text-[40px] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[54px] lg:text-[64px]"
          >
            총무 통합
            <br />
            <span className="text-gradient">업무 지원</span> 시스템
          </motion.h1>

          <motion.p {...fadeUp(0.28)} className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-ink-2 md:text-lg">
            업무 신청부터 차량·회의실 예약, 인장 날인 승인과 관리까지.
            <br className="hidden sm:block" />
            흩어져 있던 총무 업무를 <strong className="font-bold text-ink">하나의 플랫폼</strong>에서 빠르고 투명하게 처리하세요.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => openRequest()} className={buttonClass("primary", "lg", "group")}>
              업무 시작하기
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </button>
            <Link href="/admin" className={buttonClass("secondary", "lg")}>
              <ShieldCheck className="size-5" />
              관리자 대시보드
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.52)} className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <span
                    key={m.key}
                    className="grid size-11 place-items-center rounded-full bg-white shadow-card ring-2 ring-white"
                    style={{ color: m.color }}
                  >
                    <Icon className="size-5" />
                  </span>
                );
              })}
            </div>
            <p className="text-sm leading-snug text-ink-2">
              <strong className="text-base font-extrabold text-ink">4개 업무 모듈</strong>
              <br />
              단일 로그인으로 모두 이용
            </p>
          </motion.div>
        </div>

        <HeroVisual />
      </div>

      <div className="mx-auto max-w-[1320px] px-4 pb-6 md:px-8">
        <QuickActionBar />
      </div>
    </section>
  );
}
