"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusDonut } from "@/components/charts/status-donut";
import { TrendArea } from "@/components/charts/trend-area";
import { RequestTable } from "@/components/modules/request-table";
import { useRequests } from "@/components/providers/requests-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { MODULES, type ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function ActivitySection() {
  const { requests } = useRequests();
  const [tab, setTab] = useState<ModuleKey | "all">("all");
  const rows = requests.filter((r) => tab === "all" || r.module === tab).slice(0, 7);

  return (
    <section className="relative py-16 md:py-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-full bg-gradient-to-b from-white via-white to-canvas" aria-hidden />
      <div className="mx-auto max-w-[1320px] px-4 md:px-8">
        <SectionHeading
          eyebrow="MY WORK"
          title="최근 신청 내역과 처리 현황"
          description="내가 신청한 업무와 예약이 지금 어느 단계에 있는지 한눈에 확인하세요."
          action={
            <Link href="/admin#requests" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:gap-2.5 transition-all">
              전체 내역 보기 <ArrowRight className="size-4" />
            </Link>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Reveal>
            <Card className="h-full p-5 md:p-6">
              <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="업무 구분">
                {[{ key: "all" as const, shortName: "전체" }, ...MODULES].map((m) => (
                  <button
                    key={m.key}
                    role="tab"
                    aria-selected={tab === m.key}
                    onClick={() => setTab(m.key)}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                      tab === m.key ? "bg-ink text-white" : "bg-canvas text-ink-2 hover:bg-brand-50 hover:text-brand-700",
                    )}
                  >
                    {m.shortName}
                  </button>
                ))}
              </div>
              <RequestTable rows={rows} compact />
            </Card>
          </Reveal>

          <div className="grid gap-5">
            <Reveal delay={0.1}>
              <Card className="p-5 md:p-6">
                <CardHeader title="진행 상태" description="이번 달 전체 신청 기준" className="mb-5" />
                <StatusDonut />
              </Card>
            </Reveal>
            <Reveal delay={0.2}>
              <Card className="p-5 md:p-6">
                <CardHeader
                  title="월별 신청 추이"
                  description="최근 6개월 · 전 모듈 합계"
                  action={<span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">▲ 17.6%</span>}
                  className="mb-3"
                />
                <TrendArea height={180} />
              </Card>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
