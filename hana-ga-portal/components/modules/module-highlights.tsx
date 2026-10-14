"use client";

import { motion } from "framer-motion";
import { AlertCircle, Check, Lock, ShieldCheck } from "lucide-react";
import { Meters } from "@/components/charts/meters";
import { Card, CardHeader } from "@/components/ui/card";
import { SEAL_USAGE } from "@/lib/data";
import type { ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function ModuleHighlight({ moduleKey }: { moduleKey: ModuleKey }) {
  return moduleKey === "seal" ? <SealHighlight /> : null;
}

const SEAL_STEPS = ["신청서 작성", "신청 접수", "담당자 검토", "승인 / 반려", "실제 날인", "사용대장 기록"];

function SealHighlight() {
  const current = 3;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card className="p-5 md:p-6">
        <CardHeader title="날인 진행 단계" description="SEAL-202610-0021 · 법인인감 · 임대차 계약서" className="mb-6" />
        <ol className="grid grid-cols-3 gap-y-6 md:grid-cols-6">
          {SEAL_STEPS.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s} className="relative flex flex-col items-center text-center">
                {i > 0 && (
                  <span className="absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2 bg-line">
                    <motion.span
                      className="block h-full bg-[color:var(--color-mod-seal)]"
                      initial={{ width: 0 }}
                      whileInView={{ width: i <= current ? "100%" : 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15, duration: 0.4 }}
                    />
                  </span>
                )}
                <span
                  className={cn(
                    "relative z-10 grid size-10 place-items-center rounded-full text-sm font-bold ring-4 ring-white",
                    done && "bg-[color:var(--color-mod-seal)] text-white",
                    active && "bg-white text-[color:var(--color-mod-seal)] ring-[color:var(--color-mod-seal)]/30 outline-2 outline-[color:var(--color-mod-seal)]",
                    !done && !active && "bg-canvas text-ink-3",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn("mt-2 text-xs font-semibold", active ? "text-[color:var(--color-mod-seal)]" : done ? "text-ink" : "text-ink-3")}>{s}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-[color:var(--color-mod-seal)]/5 px-4 py-3 text-sm text-ink-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-mod-seal)]" />
          승인 완료와 실제 날인 완료는 별도 단계로 관리됩니다. 인장 이미지를 문서에 자동 합성하는 기능은 제공하지 않습니다.
        </div>
      </Card>
      <Card className="p-5 md:p-6">
        <CardHeader title="인장별 사용대장" description="최근 3개월 날인 완료" className="mb-5" />
        <Meters items={SEAL_USAGE.map((s) => ({ label: s.seal, value: s.count }))} color="linear-gradient(90deg,#b79bff,#8a5ce6)" max={40} unit="건" />
        <ul className="mt-6 space-y-2 text-xs text-ink-2">
          <li className="flex items-center gap-2">
            <Lock className="size-3.5 text-[color:var(--color-mod-seal)]" /> 첨부파일은 권한 확인 후에만 열람
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-[color:var(--color-mod-seal)]" /> 승인·반려 이력은 수정 불가 감사 기록
          </li>
        </ul>
      </Card>
    </div>
  );
}
