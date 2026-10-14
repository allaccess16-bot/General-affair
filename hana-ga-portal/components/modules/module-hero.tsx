"use client";

import { motion } from "framer-motion";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { ModuleArt } from "@/components/art/module-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";

const EASE = [0.22, 1, 0.36, 1] as const;

/** 모듈 상단 배너 — 모든 업무 모듈 공통 */
export function ModuleHero({
  moduleKey,
  onPrimary,
  secondary,
  meta,
}: {
  moduleKey: ModuleKey;
  onPrimary: () => void;
  secondary?: { label: string; href: string };
  meta?: React.ReactNode;
}) {
  const m = MODULE_MAP[moduleKey];
  const Icon = m.icon;
  const sec = secondary ?? { label: "신청 내역 보기", href: "#requests" };
  return (
    <>
      
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
                <Button onClick={onPrimary}>
                  <Plus className="size-4" /> {m.requestLabel}
                </Button>
                <Link href={sec.href} className="inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold text-ink-2 ring-1 ring-line hover:bg-white">
                  {sec.label}
                </Link>
              </motion.div>
              {meta && <div className="mt-6">{meta}</div>}
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}>
              <ModuleArt module={moduleKey} className="h-48 rounded-3xl md:h-60" />
            </motion.div>
          </div>
        </div>
      </section>

    </>
  );
}
