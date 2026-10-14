"use client";

import { Gauge } from "lucide-react";
import { Meters } from "@/components/charts/meters";
import { MonthlyStacked } from "@/components/charts/monthly-stacked";
import { VehicleBars } from "@/components/charts/vehicle-bars";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { useDemo } from "@/components/providers/demo-store";
import { SEAL_KINDS } from "@/lib/seal";
import { todayStr } from "@/lib/shared";
import { roomUtilization, vehicleUsage } from "@/lib/stats";

export function OpsStats() {
  const { meeting, rooms, vehicles, seal } = useDemo();
  const sealUsage = SEAL_KINDS.map((k) => ({ seal: k.value, count: seal.filter((r) => r.seal_kind === k.value && r.status === "날인완료").length }));
  const util = roomUtilization(meeting, rooms, todayStr());
  const usage = vehicleUsage(vehicles);
  const avgRoom = util.length ? Math.round(util.reduce((s, r) => s + r.rate, 0) / util.length) : 0;
  const totalKm = usage.reduce((s, v) => s + v.km, 0);
  const sealTotal = sealUsage.reduce((s, v) => s + v.count, 0);

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
            <CardHeader title="월별 신청 현황" description="모듈별 누적 · 최근 6개월 (샘플 추이)" className="mb-4" />
            <MonthlyStacked height={270} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={0.1}>
          <Card className="h-full p-5 md:p-6">
            <CardHeader
              title="회의실 예약률"
              description="오늘 업무시간(08–20시) 대비 · 상위 7개 회의실"
              action={
                <span className="flex items-center gap-1 rounded-full bg-[color:var(--color-mod-meeting)]/10 px-2.5 py-1 text-xs font-bold text-[#a35f0a]">
                  <Gauge className="size-3.5" /> 평균 {avgRoom}%
                </span>
              }
              className="mb-5"
            />
            <Meters
              items={util.slice(0, 7).map((r) => ({ label: r.room.name, sub: `${r.room.floor}F · ${r.room.capacity}인`, value: r.rate }))}
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
              description="차량별 이용 건수 (반려 제외)"
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
            <VehicleBars data={usage} height={210} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-6" delay={0.15}>
          <Card className="relative h-full overflow-hidden p-5 md:p-6">
            <CardHeader title="인장 사용 빈도" description="인장 종류별 날인 완료 건수 (사용대장 기준)" className="mb-5" />
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
                items={sealUsage.map((s) => ({ label: s.seal, value: s.count }))}
                color="linear-gradient(90deg, #b79bff, #8a5ce6)"
                max={Math.max(1, ...sealUsage.map((s) => s.count))}
                unit="건"
              />
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
