"use client";

import { motion } from "framer-motion";
import { AlertCircle, Check, Fuel, Gauge, Lock, ShieldCheck, Wrench } from "lucide-react";
import { Meters } from "@/components/charts/meters";
import { Card, CardHeader } from "@/components/ui/card";
import { SEAL_USAGE, VEHICLE_USAGE } from "@/lib/data";
import type { ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function ModuleHighlight({ moduleKey }: { moduleKey: ModuleKey }) {
  switch (moduleKey) {
    case "ga":
      return <GaHighlight />;
    case "vehicle":
      return <VehicleHighlight />;
    case "meeting":
      return <MeetingHighlight />;
    case "seal":
      return <SealHighlight />;
  }
}

function GaHighlight() {
  const types = [
    { label: "시설·설비 수리", value: 46 },
    { label: "사무용품·비품", value: 38 },
    { label: "명함·인쇄물", value: 24 },
    { label: "좌석·환경 개선", value: 19 },
    { label: "택배·우편", value: 15 },
  ];
  return (
    <Card className="p-5 md:p-6">
      <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <CardHeader title="신청 유형별 통계" description="이번 달 · 상위 5개 유형" className="mb-5" />
          <Meters items={types} color="linear-gradient(90deg,#4fbf9b,#00876c)" max={50} unit="건" />
        </div>
        <div>
          <CardHeader title="처리 담당자 현황" description="배정 대기 → 처리 중 → 완료" className="mb-5" />
          <ul className="space-y-3">
            {[
              ["장민준 대리", "시설", 6, 2],
              ["송현우 주임", "비품", 4, 1],
              ["김하늘 사원", "인쇄·우편", 3, 0],
            ].map(([name, area, doing, wait]) => (
              <li key={String(name)} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{String(name)[0]}</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{name}</span>
                  <span className="block text-xs text-ink-3">{area} 담당</span>
                </span>
                <span className="text-right text-xs">
                  <span className="block font-bold text-sky-700">처리 중 {doing}</span>
                  <span className="block text-ink-3">대기 {wait}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

const VEHICLE_STATE = {
  운행중: { cls: "bg-sky-50 text-sky-700", icon: Gauge },
  대기: { cls: "bg-brand-50 text-brand-700", icon: Check },
  점검: { cls: "bg-amber-50 text-amber-800", icon: Wrench },
};

function VehicleHighlight() {
  return (
    <Card className="p-5 md:p-6">
      <CardHeader title="차량별 이용 가능 현황" description="실시간 배차 상태 · 이번 달 누적" className="mb-5" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {VEHICLE_USAGE.map((v, i) => {
          const s = VEHICLE_STATE[v.state];
          const Icon = s.icon;
          return (
            <motion.div
              key={v.plate}
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl border border-line p-4 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", s.cls)}>
                  <Icon className="size-3.5" /> {v.state === "대기" ? "이용 가능" : v.state}
                </span>
                <span className="text-xs text-ink-3 tabular">{v.plate}</span>
              </div>
              <p className="mt-4 text-lg font-bold">{v.vehicle}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-ink-3">운행</p>
                  <p className="font-bold tabular">{v.trips}회</p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="flex items-center gap-1 text-ink-3">
                    <Fuel className="size-3" /> 주행
                  </p>
                  <p className="font-bold tabular">{v.km.toLocaleString("ko-KR")}km</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const BOOKINGS: { room: string; slots: [number, number, string][] }[] = [
  { room: "대회의실 A", slots: [[9, 11, "임원 회의"], [14, 16, "분기 실적 보고"]] },
  { room: "대회의실 B", slots: [[10, 12, "교육"], [13, 14, "면접"]] },
  { room: "중회의실 A", slots: [[9, 10, "스크럼"], [11, 13, "협력사 미팅"], [15, 17, "기획 리뷰"]] },
  { room: "중회의실 B", slots: [[13, 15, "리스크 위원회"]] },
  { room: "소회의실 1", slots: [[9, 12, "집중 업무"], [12, 13, "1:1"], [16, 18, "워크숍 준비"]] },
];

function MeetingHighlight() {
  return (
    <Card className="p-5 md:p-6">
      <CardHeader
        title="오늘의 회의실 현황"
        description="업무시간 09–18시 · 이미 예약된 시간에는 중복 예약할 수 없습니다"
        action={
          <span className="hidden items-center gap-3 text-xs text-ink-3 sm:flex">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-[color:var(--color-mod-meeting)]" /> 예약됨
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm border border-dashed border-ink-3" /> 예약 가능
            </span>
          </span>
        }
        className="mb-5"
      />
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="ml-[96px] grid grid-cols-9 text-[11px] font-semibold text-ink-3">
            {HOURS.map((h) => (
              <span key={h}>{h}:00</span>
            ))}
          </div>
          <ul className="mt-2 space-y-2">
            {BOOKINGS.map((b, ri) => (
              <li key={b.room} className="flex items-center gap-3">
                <span className="w-[84px] shrink-0 text-sm font-semibold">{b.room}</span>
                <div className="relative h-11 flex-1 rounded-xl border border-dashed border-line bg-canvas/60">
                  {b.slots.map(([s, e, t], i) => (
                    <motion.div
                      key={t}
                      title={`${t} ${s}:00–${e}:00`}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileInView={{ scaleX: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: ri * 0.08 + i * 0.06, duration: 0.5 }}
                      style={{ left: `${((s - 9) / 9) * 100}%`, width: `${((e - s) / 9) * 100}%`, originX: 0 }}
                      className="absolute inset-y-1 truncate rounded-lg bg-gradient-to-r from-[#f3b766] to-[#e08a1e] px-2 py-1.5 text-[11px] font-bold text-white shadow-sm"
                    >
                      {t}
                    </motion.div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
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
