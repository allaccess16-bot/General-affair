"use client";

import { motion } from "framer-motion";
import { CalendarDays, CarFront, Check, ClipboardPen, Download, Gauge, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminGate } from "@/components/modules/admin-gate";
import { ModuleHero } from "@/components/modules/module-hero";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Empty, Notice, Pill, Tabs } from "@/components/ui/form";
import { Reveal } from "@/components/ui/reveal";
import { addDays, downloadXls, todayStr } from "@/lib/shared";
import { cn } from "@/lib/utils";
import { BLOCKING, buildLogbookHtml, coversDate, vehicleLabel, VEHICLES, type VehicleReservation, type VehicleStatus } from "@/lib/vehicle";
import { VehicleCompleteModal, VehicleEditModal, VehicleFormModal } from "./vehicle-modals";

export const VEHICLE_STATUS_STYLE: Record<VehicleStatus, string> = {
  신청: "bg-amber-50 text-amber-800",
  승인: "bg-sky-50 text-sky-700",
  반려: "bg-rose-50 text-rose-700",
  사용완료: "bg-brand-600 text-white",
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const dayLabel = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return `${dt.getMonth() + 1}.${dt.getDate()} (${WEEK[dt.getDay()]})`;
};

type Tab = "user" | "admin" | "stats";

export function VehicleApp() {
  const { vehicles, ready, role } = useDemo();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("user");
  const [form, setForm] = useState<{ open: boolean; date?: string; vehicle?: string }>({ open: false });

  useEffect(() => {
    if (params.get("new")) setForm({ open: true });
  }, [params]);

  const pending = vehicles.filter((c) => c.status === "신청").length;

  return (
    <div>
      <ModuleHero
        moduleKey="vehicle"
        onPrimary={() => setForm({ open: true })}
        secondary={{ label: "예약 현황 보기", href: "#work" }}
        meta={
          ready && (
            <div className="flex flex-wrap gap-2">
              {[
                ["1", "날짜확인"],
                ["2", "신청/승인"],
                ["3", "운행기록"],
              ].map(([n, t]) => (
                <span key={n} className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-xs font-bold">
                  <span className="grid size-6 place-items-center rounded-full bg-[color:var(--color-mod-vehicle)] text-[11px] text-white">{n}</span>
                  {t}
                </span>
              ))}
            </div>
          )
        }
      />
      <div id="work" className="mx-auto max-w-[1320px] scroll-mt-24 space-y-6 px-4 md:px-8">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: "user", label: "배차신청 · 예약 현황" },
            { value: "admin", label: "차량 배차 관리", locked: role !== "admin", badge: role === "admin" ? pending : undefined },
            { value: "stats", label: "차량별 통계", locked: role !== "admin" },
          ]}
          className="w-fit max-w-full"
        />
        {tab === "user" && <VehicleUser onNew={(date, vehicle) => setForm({ open: true, date, vehicle })} />}
        {tab === "admin" && (
          <AdminGate>
            <VehicleAdmin />
          </AdminGate>
        )}
        {tab === "stats" && (
          <AdminGate>
            <VehicleStats />
          </AdminGate>
        )}
      </div>
      <VehicleFormModal open={form.open} initialDate={form.date} initialVehicle={form.vehicle} onClose={() => setForm({ open: false })} />
    </div>
  );
}

export function VehicleStatusPill({ s }: { s: VehicleStatus }) {
  return <Pill className={VEHICLE_STATUS_STYLE[s]}>{s}</Pill>;
}

/* ---------------- 사용자 화면 ---------------- */
function VehicleUser({ onNew }: { onNew: (date?: string, vehicle?: string) => void }) {
  const { vehicles, ready } = useDemo();
  const [vehicle, setVehicle] = useState("전체");
  const [date, setDate] = useState("");
  const [edit, setEdit] = useState<VehicleReservation | null>(null);
  const [complete, setComplete] = useState<VehicleReservation | null>(null);
  const today = todayStr();
  const days = Array.from({ length: 7 }, (_, i) => addDays(date || today, i));

  let list = vehicles.slice().sort((a, b) => `${b.start_date}${b.start_time}`.localeCompare(`${a.start_date}${a.start_time}`));
  if (vehicle !== "전체") list = list.filter((c) => c.vehicle_number === vehicle);
  if (date) list = list.filter((c) => coversDate(c, date));
  else list = list.slice(0, 12);

  return (
    <div className="space-y-5">
      <Reveal>
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <CardHeader title="차량별 예약 가능 현황" description="날짜를 선택하면 해당일부터 7일간의 차량별 예약을 보여줍니다. 빈 칸을 누르면 바로 신청할 수 있습니다." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className="input sm:w-56" value={vehicle} onChange={(e) => setVehicle(e.target.value)} aria-label="차량 선택">
                <option value="전체">전체 차량</option>
                {VEHICLES.map((v) => (
                  <option key={v.number} value={v.number}>
                    {v.label}
                  </option>
                ))}
              </select>
              <input type="date" className="input sm:w-44" value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜" />
              {date && (
                <Button variant="ghost" size="sm" className="h-[46px]" onClick={() => setDate("")}>
                  전체
                </Button>
              )}
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[150px_repeat(7,1fr)] gap-1.5">
              <span />
              {days.map((d) => (
                <span key={d} className={cn("rounded-xl py-2 text-center text-xs font-bold", d === today ? "bg-ink text-white" : "text-ink-3")}>
                  {dayLabel(d)}
                </span>
              ))}
              {VEHICLES.filter((v) => vehicle === "전체" || v.number === vehicle).map((v) => (
                <VehicleWeekRow key={v.number} plate={v.number} label={v.label} days={days} list={vehicles} onPick={(d) => onNew(d, v.number)} />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-3">같은 날짜라도 기존 반납시간 이후에는 예약 신청이 가능합니다.</p>
        </Card>
      </Reveal>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{date ? `${date} 차량 예약 현황` : "최근 차량 예약 현황"}</h3>
        <Button size="sm" onClick={() => onNew(date || undefined, vehicle !== "전체" ? vehicle : undefined)}>
          + 차량 예약 신청하기
        </Button>
      </div>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-3xl bg-white" />
      ) : list.length === 0 ? (
        <Empty>선택한 조건의 예약 내역이 없습니다.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="h-full p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Pill className="bg-[color:var(--color-mod-vehicle)]/10 text-[color:var(--color-mod-vehicle)]">
                      <CarFront className="size-3.5" /> {vehicleLabel(c)}
                    </Pill>
                    <p className="mt-2 font-bold tabular">
                      {c.start_date} {c.start_time} ~ {c.end_date} {c.end_time}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      {c.purpose} · {c.destination}
                    </p>
                    <p className="mt-1 text-xs text-ink-3">
                      {c.department} · {c.applicant} · 운전자 {c.driver}
                    </p>
                  </div>
                  <VehicleStatusPill s={c.status} />
                </div>
                {(c.status === "신청" || c.status === "승인") && (
                  <div className="mt-4 flex gap-2">
                    {c.status === "신청" && (
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEdit(c)}>
                        <Pencil className="size-4" /> 신청 수정
                      </Button>
                    )}
                    {c.status === "승인" && (
                      <Button size="sm" className="flex-1" onClick={() => setComplete(c)}>
                        <ClipboardPen className="size-4" /> 운행 완료 기록
                      </Button>
                    )}
                  </div>
                )}
                {c.status === "사용완료" && (
                  <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-2">
                    주행 {c.total_distance ?? 0}km · 유류비 {Number(c.fuel_cost || 0).toLocaleString("ko-KR")}원 · 주차비 {Number(c.parking_cost || 0).toLocaleString("ko-KR")}원
                  </p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      <VehicleEditModal c={edit} onClose={() => setEdit(null)} />
      <VehicleCompleteModal c={complete} onClose={() => setComplete(null)} />
    </div>
  );
}

function VehicleWeekRow({ plate, label, days, list, onPick }: { plate: string; label: string; days: string[]; list: VehicleReservation[]; onPick: (d: string) => void }) {
  return (
    <>
      <span className="flex items-center gap-2 pr-2 text-sm font-bold">
        <CarFront className="size-4 shrink-0 text-[color:var(--color-mod-vehicle)]" />
        <span className="truncate">{label}</span>
      </span>
      {days.map((d) => {
        const items = list.filter((c) => c.vehicle_number === plate && BLOCKING.includes(c.status) && coversDate(c, d));
        return (
          <button
            key={d}
            onClick={() => onPick(d)}
            title={items.length ? "예약 있음 — 다른 시간대 신청 가능" : "예약 없음 — 눌러서 신청"}
            className={cn(
              "min-h-16 rounded-xl border p-1.5 text-left text-[11px] leading-tight transition hover:-translate-y-0.5",
              items.length ? "border-transparent bg-[color:var(--color-mod-vehicle)]/10" : "border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50",
            )}
          >
            {items.length ? (
              items.map((c) => (
                <span key={c.id} className={cn("mb-1 block truncate rounded-md px-1.5 py-1 font-bold", c.status === "승인" ? "bg-[color:var(--color-mod-vehicle)] text-white" : "bg-amber-100 text-amber-800")}>
                  {(c.start_date === d ? c.start_time : "00:00") + "–" + (c.end_date === d ? c.end_time : "24:00")}
                </span>
              ))
            ) : (
              <span className="font-semibold text-brand-600">예약 없음</span>
            )}
          </button>
        );
      })}
    </>
  );
}

/* ---------------- 관리자: 배차 관리 ---------------- */
function VehicleAdmin() {
  const { vehicles, vehicleSetStatus, vehicleRemove, notify } = useDemo();
  const [status, setStatus] = useState<string>("");
  const list = vehicles
    .filter((c) => !status || c.status === status)
    .slice()
    .sort((a, b) => `${b.start_date}${b.start_time}`.localeCompare(`${a.start_date}${a.start_time}`));
  const act = (id: string, s: VehicleStatus) => {
    vehicleSetStatus(id, s);
    notify("처리되었습니다.");
  };
  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {["", "신청", "승인", "사용완료", "반려"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", status === s ? "bg-ink text-white" : "bg-canvas text-ink-2")}
            >
              {s || "전체"} <span className="opacity-60">{s ? vehicles.filter((c) => c.status === s).length : vehicles.length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => downloadXls("업무용승용차_운행기록부_전체.xls", buildLogbookHtml(vehicles, "전체"))}>
            <Download className="size-4" /> 운행기록부 전체
          </Button>
          {VEHICLES.map((v) => (
            <Button
              key={v.number}
              size="sm"
              variant="ghost"
              className="bg-[color:var(--color-mod-vehicle)]/10 text-[color:var(--color-mod-vehicle)]"
              onClick={() => downloadXls(`업무용승용차_운행기록부_${v.number}.xls`, buildLogbookHtml(vehicles.filter((c) => c.vehicle_number === v.number), v.number))}
            >
              {v.number.slice(-4)}
            </Button>
          ))}
        </div>
      </Card>
      <Notice>운행기록부는 국세청 「업무용승용차 운행기록부」 별지 서식과 같은 형태의 Excel(.xls)로 내려받습니다(기존 시스템과 동일).</Notice>
      {list.length === 0 && <Empty>차량 신청이 없습니다.</Empty>}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold tabular">
                  {c.start_date} {c.start_time} ~ {c.end_date} {c.end_time}
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {c.purpose} / {c.destination}
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  {c.applicant} · {c.department} · 운전자 {c.driver} · {c.contact}
                </p>
                <p className="mt-1 text-xs font-bold text-[color:var(--color-mod-vehicle)]">{vehicleLabel(c)}</p>
              </div>
              <VehicleStatusPill s={c.status} />
            </div>
            {c.status === "사용완료" && (
              <div className="mt-3 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-ink-2">
                운행자: {c.complete_name} / {c.complete_department}
                <br />
                주행거리: {c.total_distance ?? 0}km ({c.odometer_before} → {c.odometer_after})
                <br />
                유류비 {Number(c.fuel_cost || 0).toLocaleString("ko-KR")}원 · 주차비 {Number(c.parking_cost || 0).toLocaleString("ko-KR")}원 · 기타 {Number(c.etc_cost || 0).toLocaleString("ko-KR")}원
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {c.status === "승인" ? (
                <Button size="sm" variant="dark" className="flex-1" onClick={() => act(c.id, "신청")}>
                  <RotateCcw className="size-4" /> 승인 취소
                </Button>
              ) : c.status !== "사용완료" ? (
                <Button size="sm" className="flex-1" onClick={() => act(c.id, "승인")}>
                  <Check className="size-4" /> 승인
                </Button>
              ) : null}
              {c.status !== "사용완료" && c.status !== "반려" && (
                <Button size="sm" variant="ghost" className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-700" onClick={() => act(c.id, "반려")}>
                  <X className="size-4" /> 반려
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  if (!confirm("이 차량 신청 내역을 삭제할까요? 삭제 후 복구할 수 없습니다.")) return;
                  vehicleRemove(c.id);
                  notify("삭제되었습니다.");
                }}
              >
                <Trash2 className="size-4" /> 삭제
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 관리자: 통계 ---------------- */
function VehicleStats() {
  const { vehicles } = useDemo();
  const stats = useMemo(
    () =>
      VEHICLES.map((v) => {
        const list = vehicles.filter((c) => c.vehicle_number === v.number);
        const done = list.filter((c) => c.status === "사용완료");
        return {
          ...v,
          total: list.length,
          done: done.length,
          km: done.reduce((s, c) => s + Number(c.total_distance || 0), 0),
          cost: done.reduce((s, c) => s + Number(c.fuel_cost || 0) + Number(c.parking_cost || 0) + Number(c.etc_cost || 0), 0),
          pending: list.filter((c) => c.status === "신청").length,
        };
      }),
    [vehicles],
  );
  const maxKm = Math.max(1, ...stats.map((s) => s.km));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((s, i) => (
        <Reveal key={s.number} delay={i * 0.05}>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Pill className="bg-[color:var(--color-mod-vehicle)]/10 text-[color:var(--color-mod-vehicle)]">
                <CarFront className="size-3.5" /> {s.label}
              </Pill>
              {s.pending > 0 && <Pill className="bg-amber-50 text-amber-800">승인대기 {s.pending}</Pill>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-3">전체 신청</p>
                <p className="text-2xl font-extrabold">
                  <CountUp value={s.total} />건
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3">운행 완료</p>
                <p className="text-2xl font-extrabold">
                  <CountUp value={s.done} />건
                </p>
              </div>
            </div>
            <p className="mt-5 flex items-center gap-1 text-xs font-semibold text-ink-3">
              <Gauge className="size-3.5" /> 누적 주행 {s.km.toLocaleString("ko-KR")}km
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-canvas">
              <motion.div className="h-full rounded-full bg-[color:var(--color-mod-vehicle)]" initial={{ width: 0 }} whileInView={{ width: `${(s.km / maxKm) * 100}%` }} viewport={{ once: true }} />
            </div>
            <p className="mt-4 flex items-center gap-1 text-xs text-ink-3">
              <CalendarDays className="size-3.5" /> 운행 비용 합계 {s.cost.toLocaleString("ko-KR")}원
            </p>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}
