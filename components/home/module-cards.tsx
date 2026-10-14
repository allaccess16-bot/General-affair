"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { ModuleArt } from "@/components/art/module-art";
import { useRequests } from "@/components/providers/requests-provider";
import { Badge } from "@/components/ui/badge";
import { Stagger, staggerItem } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { MODULES } from "@/lib/modules";

export function ModuleCards() {
  const { requests } = useRequests();
  return (
    <section id="modules" className="mx-auto max-w-[1320px] px-4 py-16 md:px-8 md:py-20">
      <SectionHeading
        eyebrow="BUSINESS MODULES"
        title={
          <>
            하나의 포털, <span className="text-gradient">네 가지 업무</span>
          </>
        }
        description="모든 모듈이 같은 로그인, 같은 화면 규칙, 같은 진행 단계로 동작합니다."
      />
      <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const open = requests.filter((r) => r.module === m.key && !["완료", "반려", "취소"].includes(r.status)).length;
          return (
            <motion.article
              key={m.key}
              variants={staggerItem}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              style={{ "--spot": m.color } as React.CSSProperties}
              className="spotlight group relative flex flex-col overflow-hidden rounded-[28px] border border-line bg-white shadow-card transition-shadow duration-300 hover:shadow-lift"
            >
              <div className="relative">
                <ModuleArt module={m.key} className="h-44 transition-transform duration-700 group-hover:scale-[1.04]" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Badge className={m.badge.tone === "new" ? "bg-white text-[color:var(--color-mod-seal)]" : "bg-white/90 text-brand-700"}>
                    {m.badge.tone === "new" ? "✦ " : "● "}
                    {m.badge.label}
                  </Badge>
                </div>
                <span
                  className="absolute -bottom-6 left-5 grid size-12 place-items-center rounded-2xl bg-white shadow-card ring-4 ring-white"
                  style={{ color: m.color }}
                >
                  <Icon className="size-6" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5 pt-9">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold tracking-tight">{m.name}</h3>
                  <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink-2 tabular">진행 {open}건</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{m.description}</p>
                <ul className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                      <Check className="size-3.5 shrink-0" style={{ color: m.color }} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={m.href}
                  className="mt-6 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3 text-sm font-bold text-ink transition-colors group-hover:bg-brand-600 group-hover:text-white"
                >
                  바로가기
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </motion.article>
          );
        })}
      </Stagger>
    </section>
  );
}
