"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { ModuleArt } from "@/components/art/module-art";
import { useRequests } from "@/components/providers/requests-provider";
import { MODULES } from "@/lib/modules";

const EASE = [0.22, 1, 0.36, 1] as const;
const DONE = ["완료", "반려", "취소"];

/**
 * 4개 업무를 한눈에 — 큰 이미지형 카드(상단 일러스트 + 하단 어두운 그라데이션 위 제목·설명)
 * 카드 전체를 누르면 업무 화면, '+' 버튼은 바로 신청서
 */
export function ServiceCards() {
  const { requests, openRequest } = useRequests();
  return (
    <section id="modules" className="mx-auto max-w-[1320px] px-4 pb-6 pt-10 md:px-8 md:pt-16">
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <motion.p
            className="mb-3 text-[11px] font-bold tracking-[0.28em] text-ink-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            QUICK SERVICE
          </motion.p>
          <motion.h2
            className="text-[30px] font-extrabold leading-[1.12] tracking-[-0.035em] md:text-[44px]"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            transition={{ staggerChildren: 0.1 }}
          >
            {["필요한 업무를,", "한 곳에서 바로 시작하세요."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.05em]">
                <motion.span
                  className={i === 0 ? "block text-ink-3" : "block text-ink"}
                  variants={{ hidden: { y: "105%" }, show: { y: "0%", transition: { duration: 0.9, ease: EASE } } }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.h2>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.key}
                href={m.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink-2 transition hover:border-ink hover:bg-ink hover:text-white"
              >
                <Icon className="size-3.5" /> {m.shortName}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          const open = requests.filter((r) => r.module === m.key && !DONE.includes(r.status)).length;
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 36, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
              className="min-w-0"
            >
              <Link
                href={m.href}
                className="group relative block h-[236px] overflow-hidden rounded-[22px] shadow-card ring-1 ring-black/5 transition-shadow duration-500 hover:shadow-lift sm:h-[300px] md:rounded-[28px] xl:h-[420px]"
              >
                {/* 일러스트 배경 */}
                <ModuleArt
                  module={m.key}
                  className="absolute inset-0 [&>svg]:absolute [&>svg]:inset-x-0 [&>svg]:top-[6%] [&>svg]:h-[62%] xl:[&>svg]:top-[9%] xl:[&>svg]:h-[46%] [&>svg]:transition-transform [&>svg]:duration-700 [&>svg]:ease-out group-hover:[&>svg]:-translate-y-2 group-hover:[&>svg]:scale-[1.06]"
                />
                {/* 글자 가독성 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" aria-hidden />
                {/* 지나가는 빛 */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" aria-hidden />

                {/* 상단: 업무 태그 · 진행 건수 */}
                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 md:inset-x-4 md:top-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm backdrop-blur md:px-3 md:py-1.5 md:text-xs">
                    <Icon className="size-3.5" style={{ color: m.color }} />
                    {m.shortName}
                  </span>
                  <span className="rounded-full bg-black/25 px-2 py-1 text-[10px] font-bold text-white backdrop-blur md:px-2.5 md:text-[11px]">
                    진행 <span className="tabular">{open}</span>
                  </span>
                </div>

                {/* 하단: 제목 · 설명 · 기능 */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 text-white md:p-5">
                  {m.badge.tone === "new" && <span className="mb-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur">✦ NEW</span>}
                  <h3 className="text-[17px] font-extrabold leading-tight tracking-tight sm:text-xl md:text-[22px]">{m.name.replace(" 신청 및 관리", "")}</h3>
                  <p className="mt-1.5 line-clamp-2 hidden text-[13px] leading-relaxed text-white/80 sm:block">{m.tagline}</p>
                  <ul className="mt-3 hidden flex-wrap gap-1.5 xl:flex">
                    {m.features.slice(0, 3).map((f) => (
                      <li key={f} className="rounded-full border border-white/25 px-2 py-0.5 text-[11px] font-medium text-white/85">
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between md:mt-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white/90 md:text-[13px]">
                      바로가기 <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                    <button
                      type="button"
                      aria-label={`${m.requestLabel} 바로 신청`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openRequest(m.key);
                      }}
                      className="grid size-9 place-items-center rounded-full bg-white text-ink shadow-lg transition duration-300 hover:scale-110 md:size-10"
                    >
                      <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />
                    </button>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
