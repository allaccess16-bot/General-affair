"use client";

import { Gauge } from "lucide-react";
import { Meters } from "@/components/charts/meters";
import { MonthlyStacked } from "@/components/charts/monthly-stacked";
import { VehicleBars } from "@/components/charts/vehicle-bars";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ROOM_UTILIZATION, SEAL_USAGE, VEHICLE_USAGE } from "@/lib/data";

export function OpsStats() {
  const avgRoom = Math.round(ROOM_UTILIZATION.reduce((s, r) => s + r.rate, 0) / ROOM_UTILIZATION.length);
  const totalKm = VEHICLE_USAGE.reduce((s, v) => s + v.km, 0);
  const sealTotal = SEAL_USAGE.reduce((s, v) => s + v.count, 0);

  return (
    <section id="stats" className="mx-auto max-w-[1320px] px-4 py-16 md:px-8 md:py-20">
      <SectionHeading
        eyebrow="OPERATIONS INSIGHT"
        title="숫자로 보는 경영지원 운영 현황"
        description="모듈별 이용 데이터를 한 화면에서 비교하고 자원 배분을 판단하세요."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <Card className="h-full p-5 md:p-6">
            <CardHeader title="월별 신청 현황" description="모듈별 누적 · 최근 6개월" className="mb-4" />
            <MonthlyStacked height={270} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={0.1}>
          <Card className="h-full p-5 md:p-6">
            <CardHeader
              title="회의실 이용률"
              description="이번 달 업무시간(09–18시) 대비"
              action={
                <span className="flex items-center gap-1 rounded-full bg-[color:var(--color-mod-meeting)]/10 px-2.5 py-1 text-xs font-bold text-[#a35f0a]">
                  <Gauge className="size-3.5" /> 평균 {avgRoom}%
                </span>
              }
              className="mb-5"
            />
            <Meters
              items={ROOM_UTILIZATION.map((r) => ({ label: r.room, sub: `${r.floor} · ${r.seats}인`, value: r.rate }))}
              color="linear-gradient(90deg, #f3b766, #e08a1e)"
              max={100}
              unit="%"
            />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-6" delay={0.05}>
          <Card className="h-full p-5 md:p-6">
            <CardHeader
              title="차량 이용 현황"
              description="이번 달 차량별 운행 횟수"
              action={
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-ink-3">총 주행거리</p>
                  <p className="text-lg font-extrabold text-ink">
                    <CountUp value={totalKm} />
                    <span className="ml-0.5 text-xs font-bold text-ink-3">km</span>
                  </p>
                </div>
              }
              className="mb-2"
            />
            <VehicleBars height={210} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-6" delay={0.15}>
          <Card className="relative h-full overflow-hidden p-5 md:p-6">
            <CardHeader title="인장 사용 빈도" description="최근 3개월 · 인장 종류별 날인 완료 건수" className="mb-5" />
            <div className="grid items-center gap-6 sm:grid-cols-[150px_1fr]">
              <div className="relative mx-auto grid size-36 place-items-center rounded-full bg-gradient-to-br from-[#b79bff] to-[#5b35b0] text-white shadow-[0_20px_40px_-18px_rgb(91_53_176/0.7)]">
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-white/40" />
                <div className="text-center">
                  <p className="text-[11px] font-semibold text-white/80">누적 날인</p>
                  <p className="text-3xl font-extrabold">
                    <CountUp value={sealTotal} />
                  </p>
                  <p className="text-[11px] text-white/80">건</p>
                </div>
              </div>
              <Meters
                items={SEAL_USAGE.map((s) => ({ label: s.seal, value: s.count }))}
                color="linear-gradient(90deg, #b79bff, #8a5ce6)"
                max={Math.max(...SEAL_USAGE.map((s) => s.count))}
                unit="건"
              />
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
