"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import type { Guide } from "@/lib/help";
import { MODULE_MAP } from "@/lib/modules";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** 이용 가이드 — 단계별 슬라이드 + 오른쪽 미리보기 화면이 순서대로 채워지는 애니메이션 */
export function GuideModal({ guide, onClose }: { guide: Guide | null; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  useEffect(() => {
    setStep(0);
    setDir(1);
  }, [guide]);
  useEffect(() => {
    if (!guide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });
  if (!guide) return <AnimatePresence />;
  const total = guide.steps.length;
  const s = guide.steps[step];
  const last = step === total - 1;
  const color = guide.module === "all" ? "var(--color-brand-600)" : MODULE_MAP[guide.module].color;
  function go(d: number) {
    setDir(d);
    setStep((v) => Math.min(total - 1, Math.max(0, v + d)));
  }

  return (
    <AnimatePresence>
      <motion.div key="guide" className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
          className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[32px]"
          initial={{ y: 60, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* 진행 바 */}
          <div className="h-1 w-full bg-canvas">
            <motion.div className="h-full" style={{ background: color }} animate={{ width: `${((step + 1) / total) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-8 sm:pt-6">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.2em]" style={{ color }}>
                GUIDE · {step + 1} / {total}
              </p>
              <p className="truncate text-sm font-bold text-ink-2">{guide.title}</p>
            </div>
            <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas text-ink-2 transition hover:bg-line" aria-label="닫기">
              <X className="size-5" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 pb-4 pt-5 sm:px-8 md:grid-cols-[1fr_1.05fr] md:gap-8 md:pt-6">
            {/* 설명 */}
            <div className="relative min-h-[220px]">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <span className="grid size-12 place-items-center rounded-2xl text-lg font-extrabold text-white shadow-lg" style={{ background: color }}>
                    {step + 1}
                  </span>
                  <h3 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight md:text-[28px]">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.desc}</p>
                  {s.tip && (
                    <motion.p
                      className="mt-5 flex gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Lightbulb className="mt-0.5 size-4 shrink-0" /> {s.tip}
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 미리보기 화면 */}
            <div className="relative overflow-hidden rounded-3xl p-5 md:p-6" style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${color} 14%, white), color-mix(in srgb, ${color} 4%, white))` }}>
              <motion.div
                className="absolute -right-16 -top-16 size-48 rounded-full blur-3xl"
                style={{ background: color, opacity: 0.18 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
              <div className="relative rounded-2xl bg-white p-4 shadow-[0_20px_50px_-24px_rgb(15_31_27/0.35)]">
                <div className="mb-4 flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full bg-rose-300" />
                  <i className="size-2.5 rounded-full bg-amber-300" />
                  <i className="size-2.5 rounded-full bg-brand-300" />
                  <span className="ml-2 truncate text-[11px] font-bold text-ink-3">{s.title}</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.ul key={step} className="space-y-2.5" initial="hidden" animate="show" exit={{ opacity: 0 }} variants={{ show: { transition: { staggerChildren: 0.28, delayChildren: 0.15 } } }}>
                    {s.lines.map((line, i) => (
                      <motion.li
                        key={line}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
                        className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-line px-3 py-2.5"
                      >
                        <motion.span
                          className="grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                          style={{ background: color }}
                          variants={{ hidden: { scale: 0 }, show: { scale: 1, transition: { type: "spring", damping: 12, stiffness: 260, delay: 0.15 } } }}
                        >
                          {i === s.lines.length - 1 ? <Check className="size-3.5" /> : i + 1}
                        </motion.span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{line}</span>
                        {/* 입력되는 느낌의 막대 */}
                        <motion.span
                          className="h-1.5 w-12 shrink-0 origin-left rounded-full"
                          style={{ background: `color-mix(in srgb, ${color} 30%, white)` }}
                          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.6, ease: EASE, delay: 0.2 } } }}
                        />
                      </motion.li>
                    ))}
                  </motion.ul>
                </AnimatePresence>
                {/* 커서 */}
                <motion.span
                  key={`cursor-${step}`}
                  className="pointer-events-none absolute size-4 rounded-full border-2 border-white shadow-lg"
                  style={{ background: color }}
                  initial={{ left: "20%", top: "30%", opacity: 0 }}
                  animate={{ left: ["20%", "70%", "82%"], top: ["30%", "55%", `${Math.min(88, 30 + s.lines.length * 15)}%`], opacity: [0, 1, 1] }}
                  transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3 }}
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {/* 하단 이동 */}
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-8">
            <div className="flex gap-1.5" aria-hidden>
              {guide.steps.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => (setDir(i > step ? 1 : -1), setStep(i))}
                  className="h-2 rounded-full"
                  animate={{ width: i === step ? 24 : 8, background: i <= step ? color : "var(--color-line)" }}
                  aria-label={`${i + 1}단계`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}>
                <ArrowLeft className="size-4" /> 이전
              </Button>
              {last ? (
                <Link href={guide.href} onClick={onClose} className={buttonClass("primary", "md", "btn-sheen")}>
                  {guide.cta} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Button onClick={() => go(1)} className={cn("btn-sheen")}>
                  다음 <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
