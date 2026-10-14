"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { isActive, MEETING_CONFIG, minuteLabel, roomColor, seoulParts, toMinute, type MeetingReservation, type Room } from "@/lib/meeting";
import { addDays, todayStr } from "@/lib/shared";
import { cn } from "@/lib/utils";

const DAY_START = toMinute(MEETING_CONFIG.businessStart);
const DAY_END = toMinute(MEETING_CONFIG.businessEnd);
const SLOTS = (DAY_END - DAY_START) / 30;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export type Indexed = MeetingReservation & { __date: string; __s: number; __e: number };

export function useIndexed(list: MeetingReservation[]) {
  return useMemo(() => {
    const byDateRoom = new Map<string, Indexed[]>();
    const byDate = new Map<string, Indexed[]>();
    for (const r of list) {
      const s = seoulParts(r.start_at);
      const e = seoulParts(r.end_at);
      const x: Indexed = { ...r, __date: s.date, __s: s.minute, __e: e.date === s.date ? e.minute : DAY_END };
      if (!byDate.has(s.date)) byDate.set(s.date, []);
      byDate.get(s.date)!.push(x);
      if (isActive(r)) {
        const k = `${s.date}|${r.room_id}`;
        if (!byDateRoom.has(k)) byDateRoom.set(k, []);
        byDateRoom.get(k)!.push(x);
      }
    }
    return { byDate, active: (roomId: string, date: string) => byDateRoom.get(`${date}|${roomId}`) ?? [] };
  }, [list]);
}

function dayMetrics(date: string, rooms: Room[], active: (r: string, d: string) => Indexed[]) {
  const span = DAY_END - DAY_START;
  const meters = rooms.map((room) => {
    const booked = active(room.id, date).reduce((s, r) => s + Math.max(0, Math.min(r.__e, DAY_END) - Math.max(r.__s, DAY_START)), 0);
    return { room, pct: Math.round((booked / span) * 100) };
  });
  const occupancy = meters.length ? Math.round(meters.reduce((s, m) => s + m.pct, 0) / meters.length) : 0;
  return {
    meters,
    occupancy,
    availableRooms: meters.filter((m) => m.room.active && m.pct < 100).length,
    bookedRooms: meters.filter((m) => m.pct > 0).length,
  };
}

/** 월간 탁상달력 — 날짜별 공실 수·예약률·회의실별 미터 */
export function MonthCalendar({ selected, onSelect, rooms, idx }: { selected: string; onSelect: (d: string) => void; rooms: Room[]; idx: ReturnType<typeof useIndexed> }) {
  const [y, m] = selected.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const firstDow = new Date(`${first}T12:00:00+09:00`).getDay();
  const gridStart = addDays(first, -firstDow);
  const today = todayStr();
  const moveMonth = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    onSelect(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
  };
  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <button className="grid size-10 place-items-center rounded-full border border-line hover:bg-canvas" onClick={() => moveMonth(-1)} aria-label="이전 달">
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold tracking-widest text-ink-3">MONTHLY AVAILABILITY</p>
          <p className="text-xl font-extrabold">
            {y}년 {m}월
          </p>
        </div>
        <button className="grid size-10 place-items-center rounded-full border border-line hover:bg-canvas" onClick={() => moveMonth(1)} aria-label="다음 달">
          <ChevronRight className="size-4" />
        </button>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white" onClick={() => onSelect(today)}>
          오늘
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-ink-3">
        {WEEK.map((w, i) => (
          <span key={w} className={cn("py-1", i === 0 && "text-rose-500", i === 6 && "text-sky-600")}>
            {w}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }, (_, i) => {
          const date = addDays(gridStart, i);
          const inMonth = date.slice(0, 7) === first.slice(0, 7);
          const met = dayMetrics(date, rooms, idx.active);
          const level = met.occupancy >= 55 ? "bg-rose-400" : met.occupancy >= 25 ? "bg-amber-400" : "bg-brand-400";
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              aria-label={`${date}, 공실 가능 회의실 ${met.availableRooms}개, 전체 예약률 ${met.occupancy}%`}
              className={cn(
                "group flex min-h-[74px] flex-col rounded-xl border p-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-card md:min-h-[96px] md:p-2",
                inMonth ? "bg-white" : "bg-canvas/60 opacity-50",
                date === selected ? "border-brand-500 ring-2 ring-brand-200" : "border-line",
              )}
            >
              <span className="flex items-center justify-between">
                <b className={cn("text-sm", i % 7 === 0 && "text-rose-500", i % 7 === 6 && "text-sky-600")}>{Number(date.slice(8))}</b>
                {date === today && <span className="rounded bg-ink px-1 text-[9px] font-bold text-white">TODAY</span>}
              </span>
              <span className="mt-auto hidden text-[11px] font-bold text-ink-2 md:block">공실 {met.availableRooms}</span>
              <span className="hidden text-[10px] text-ink-3 md:block">예약 {met.bookedRooms}실</span>
              <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
                <span className={cn("block h-full rounded-full", level)} style={{ width: `${Math.max(met.occupancy, 3)}%` }} />
              </span>
              <span className="mt-1 hidden gap-[2px] md:flex">
                {met.meters.map(({ room, pct }) => (
                  <i key={room.id} title={`${room.name} · 예약률 ${pct}%`} className="h-1 flex-1 rounded-full" style={{ background: pct ? roomColor(room.id) : "var(--color-line)", opacity: pct ? 0.35 + pct / 150 : 1 }} />
                ))}
              </span>
              <small className="mt-0.5 text-[10px] text-ink-3 tabular">{met.occupancy}%</small>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="flex items-center gap-1">
          <i className="size-2.5 rounded-full bg-brand-400" /> 공실 여유
        </span>
        <span className="flex items-center gap-1">
          <i className="size-2.5 rounded-full bg-amber-400" /> 예약 보통
        </span>
        <span className="flex items-center gap-1">
          <i className="size-2.5 rounded-full bg-rose-400" /> 예약 많음
        </span>
        <span>날짜를 누르면 아래에서 회의실별 시간을 확인할 수 있습니다.</span>
      </div>
    </Card>
  );
}

function Axis({ labelWidth }: { labelWidth: string }) {
  return (
    <div className="flex text-[10px] font-semibold text-ink-3" style={{ paddingLeft: labelWidth }}>
      {Array.from({ length: SLOTS / 2 }, (_, i) => (
        <span key={i} className="flex-1">
          {minuteLabel(DAY_START + i * 60).slice(0, 2)}
        </span>
      ))}
    </div>
  );
}

/** 30분 슬롯 행 — 빈 칸을 누르면 해당 시간으로 바로 예약, 예약 칸을 누르면 상세 */
export function SlotRow({
  label,
  sub,
  color,
  items,
  disabled,
  past,
  onFree,
  onBusy,
  labelWidth = "112px",
}: {
  label: React.ReactNode;
  sub?: string;
  color: string;
  items: Indexed[];
  disabled?: boolean;
  past?: (slotStart: number) => boolean;
  onFree: (start: string, end: string) => void;
  onBusy: (r: Indexed) => void;
  labelWidth?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0" style={{ width: `calc(${labelWidth} - 8px)` }}>
        <p className="flex items-center gap-1.5 truncate text-sm font-bold">
          <i className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
          {label}
        </p>
        {sub && <p className="truncate pl-4 text-[11px] text-ink-3">{sub}</p>}
      </div>
      <div className="relative flex h-10 flex-1 gap-[2px]">
        {Array.from({ length: SLOTS }, (_, i) => {
          const s = DAY_START + i * 30;
          const busy = items.find((r) => r.__s < s + 30 && r.__e > s);
          const isPast = past?.(s);
          if (busy)
            return (
              <button
                key={i}
                title={`${busy.title} · ${busy.department} ${busy.organizer_name}`}
                onClick={() => onBusy(busy)}
                className="flex-1 rounded-[5px] transition hover:brightness-110"
                style={{ background: color, opacity: busy.status === "checked_in" ? 1 : 0.78 }}
              />
            );
          return (
            <button
              key={i}
              disabled={disabled || isPast}
              title={disabled ? "운영 중지" : isPast ? "지난 시간" : `${minuteLabel(s)}–${minuteLabel(s + 30)} 예약 가능`}
              onClick={() => onFree(minuteLabel(s), minuteLabel(s + 30))}
              className={cn(
                "flex-1 rounded-[5px] border transition",
                disabled ? "border-transparent bg-zinc-100" : isPast ? "border-transparent bg-canvas" : "border-brand-100 bg-brand-50 hover:border-brand-400 hover:bg-brand-100",
                i % 2 === 0 && "ml-[2px]",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/** 회의실 7일 보기 — 선택한 회의실의 7일간 공실 */
export function WeekAvailability({ room, from, idx, onFree, onBusy }: { room: Room; from: string; idx: ReturnType<typeof useIndexed>; onFree: (date: string, s: string, e: string) => void; onBusy: (r: Indexed) => void }) {
  const today = todayStr();
  const nowMin = seoulParts(new Date().toISOString()).minute;
  return (
    <Card className="p-4 md:p-6">
      <p className="mb-4 text-sm text-ink-2">
        <b>{room.name}</b>의 {from.replaceAll("-", ".")}부터 7일간 30분 단위 공실입니다. <b>초록색 빈 칸을 누르면</b> 해당 회의실·날짜·시간이 예약창에 자동 입력됩니다.
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-[760px] space-y-2">
          <Axis labelWidth="112px" />
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(from, i);
            const dt = new Date(`${d}T00:00:00`);
            return (
              <SlotRow
                key={d}
                label={`${dt.getMonth() + 1}.${dt.getDate()} (${WEEK[dt.getDay()]})`}
                sub={d === today ? "오늘" : undefined}
                color={roomColor(room.id)}
                items={idx.active(room.id, d)}
                disabled={!room.active}
                past={(s) => d < today || (d === today && s + 30 <= nowMin)}
                onFree={(s, e) => onFree(d, s, e)}
                onBusy={onBusy}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}
