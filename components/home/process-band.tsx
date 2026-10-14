"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FilePlus2, SearchCheck, UserCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const STEPS = [
  { icon: FilePlus2, title: "신청", desc: "모듈 공통 신청서로 간편 접수" },
  { icon: SearchCheck, title: "확인", desc: "담당자 검토·배정, 충돌 자동 확인" },
  { icon: UserCheck, title: "처리·승인", desc: "단계별 승인과 처리 이력 기록" },
  { icon: CheckCircle2, title: "완료", desc: "완료 알림과 이력·대장 자동 기록" },
];

/** 4단계 표준 업무 흐름 */
export function ProcessBand() {
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-16 md:px-8 md:py-20">
      <SectionHeading eyebrow="STANDARD FLOW" title="모든 업무는 같은 4단계로" align="center" />
      <Reveal>
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <svg className="absolute left-[12%] right-[12%] top-9 hidden h-2 w-[76%] lg:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
            <motion.line
              x1="0"
              y1="1"
              x2="100"
              y2="1"
              stroke="var(--color-brand-300)"
              strokeWidth="2"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
          </svg>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                className="relative flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.18, duration: 0.6 }}
              >
                <span className="relative grid size-[72px] place-items-center rounded-full bg-white text-brand-600 shadow-card ring-8 ring-canvas">
                  <Icon className="size-7" />
                  <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <p className="mt-4 text-lg font-bold">{s.title}</p>
                <p className="mt-1 max-w-[200px] text-sm text-ink-2">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
