"use client";

import { motion } from "framer-motion";
import { CalendarClock, ChevronLeft, ChevronRight, Clock3, MapPin, Minus, Plus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/form";
import { MEETING_CONFIG, minuteLabel, roomColor, seoulParts, toMinute, type MeetingReservation, type Room } from "@/lib/meeting";
import { addDays, todayStr } from "@/lib/shared";
import { cn } from "@/lib/utils";
import type { BookingPreset } from "./booking-modal";
import { useIndexed, type Indexed } from "./schedule";

const DAY_START = toMinute(MEETING_CONFIG.businessStart);
const DAY_END = toMinute(MEETING_CONFIG.businessEnd);
const SPAN = DAY_END - DAY_START;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

type Idx = ReturnType<typeof useIndexed>;
type Floor = "all" | 12 | 13;

export function useNowMinute() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return { now, minute: seoulParts(new Date(now).toISOString()).minute, today: todayStr(new Date(now)) };
}

const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}` : `${m}분`);
const dateLabel = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${WEEK[dt.getDay()]})`;
};

/** 회의실의 특정 시각 상태 */
function roomStatusAt(room: Room, items: Indexed[], minute: number) {
  const sorted = items.slice().sort((a, b) => a.__s - b.__s);
  const current = sorted.find((r) => r.__s <= minute && r.__e > minute);
  const next = sorted.find((r) => r.__s > minute);
  if (!room.active) return { kind: "closed" as const, current, next };
  if (current) return { kind: "busy" as const, current, next };
  if (next && next.__s - minute <= 30) return { kind: "soon" as const, current, next };
  return { kind: "free" as const, current, next, freeUntil: next ? next.__s : DAY_END };
}

/* ======================================================================
 * 1. 빠른 찾기 — 날짜·시작·사용시간·인원만 고르면 바로 예약 가능한 회의실
 * ==================================================================== */
export function QuickFinder({ rooms, idx, onBook }: { rooms: Room[]; idx: Idx; onBook: (p: BookingPreset) => void }) {
  const { minute, today } = useNowMinute();
  const firstSlot = Math.min(Math.max(DAY_START, Math.ceil(minute / 30) * 30), DAY_END - 30);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState(minuteLabel(firstSlot));
  const [length, setLength] = useState(60);
  const [people, setPeople] = useState(4);
  const [showAll, setShowAll] = useState(false);

  const startMin = toMinute(start);
  const endMin = Math.min(startMin + length, DAY_END);
  const slots = useMemo(() => {
    const out: string[] = [];
    for (let m = DAY_START; m < DAY_END; m += 30) if (date !== today || m + 30 > minute) out.push(minuteLabel(m));
    return out;
  }, [date, today, minute]);
  useEffect(() => {
    if (slots.length && !slots.includes(start)) setStart(slots[0]);
  }, [slots, start]);

  const results = useMemo(
    () =>
      rooms
        .map((room) => {
          const items = idx.active(room.id, date).slice().sort((a, b) => a.__s - b.__s);
          const clash = items.find((r) => r.__s < endMin && r.__e > startMin);
          const nextAfter = items.find((r) => r.__s >= endMin);
          const reason = !room.active ? "운영 중지" : room.capacity < people ? `정원 ${room.capacity}명` : clash ? `${minuteLabel(clash.__s)}–${minuteLabel(clash.__e)} ${clash.title}` : null;
          return { room, ok: !reason, reason, freeUntil: nextAfter ? nextAfter.__s : DAY_END };
        })
        .sort((a, b) => Number(b.ok) - Number(a.ok) || a.room.capacity - people - (b.room.capacity - people) || a.room.floor - b.room.floor),
    [rooms, idx, date, startMin, endMin, people],
  );
  const okCount = results.filter((r) => r.ok).length;
  const shown = showAll ? results : results.filter((r) => r.ok);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-[#fff7ec] to-white p-5 md:p-6">
        <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#b0640b]">
          <Search className="size-4" /> 빠른 찾기
        </p>
        <h3 className="mt-1 text-xl font-bold">언제, 몇 명이 사용하나요?</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[auto_auto_1fr_auto]">
          <div>
            <p className="mb-1.5 text-xs font-bold text-ink-3">날짜</p>
            <div className="flex gap-1">
              {[
                [today, "오늘"],
                [addDays(today, 1), "내일"],
              ].map(([d, l]) => (
                <button key={l} onClick={() => setDate(d)} className={cn("h-11 rounded-xl px-4 text-sm font-bold", date === d ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line")}>
                  {l}
                </button>
              ))}
              <input type="date" className="input h-11 w-40" value={date} min={today} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="날짜 직접 선택" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-ink-3">시작 시간</p>
            <select className="input h-11 w-32" value={start} onChange={(e) => setStart(e.target.value)}>
              {slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-ink-3">사용 시간</p>
            <div className="flex flex-wrap gap-1">
              {[30, 60, 90, 120, 180].map((m) => (
                <button key={m} onClick={() => setLength(m)} className={cn("h-11 rounded-xl px-3.5 text-sm font-bold", length === m ? "bg-[color:var(--color-mod-meeting)] text-white" : "bg-white text-ink-2 ring-1 ring-line")}>
                  {dur(m)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-ink-3">인원</p>
            <div className="flex h-11 items-center rounded-xl bg-white ring-1 ring-line">
              <button className="grid size-11 place-items-center text-ink-2" onClick={() => setPeople(Math.max(1, people - 1))} aria-label="인원 줄이기">
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center font-bold tabular">{people}명</span>
              <button className="grid size-11 place-items-center text-ink-2" onClick={() => setPeople(Math.min(30, people + 1))} aria-label="인원 늘리기">
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-line p-5 md:p-6">
        <p className="mb-3 text-sm">
          <b>{dateLabel(date)} {start}–{minuteLabel(endMin)}</b> · {people}명 기준{" "}
          <span className={cn("font-bold", okCount ? "text-brand-700" : "text-rose-600")}>{okCount ? `예약 가능 ${okCount}곳` : "예약 가능한 회의실이 없습니다"}</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map(({ room, ok, reason, freeUntil }, i) => (
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn("flex flex-col rounded-2xl border p-3.5", ok ? "border-brand-200 bg-white" : "border-line bg-canvas/60 opacity-60")}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-1.5 font-bold">
                  <i className="size-2.5 rounded-full" style={{ background: roomColor(room.id) }} />
                  {room.name}
                </p>
                <span className="shrink-0 text-xs text-ink-3">{room.floor}F</span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink-3">
                <span className="inline-flex items-center gap-0.5">
                  <Users className="size-3" /> {room.capacity}인
                </span>
                <span className="hidden min-w-0 items-center gap-0.5 truncate sm:inline-flex">
                  <MapPin className="size-3 shrink-0" /> {room.location}
                </span>
              </p>
              {ok ? (
                <>
                  <p className="mt-2 text-xs font-semibold text-brand-700">{freeUntil >= DAY_END ? "이후 종일 비어있음" : `${minuteLabel(freeUntil)}까지 비어있음`}</p>
                  <Button size="sm" className="mt-2.5" onClick={() => onBook({ roomId: room.id, date, start, end: minuteLabel(endMin) })}>
                    바로 예약
                  </Button>
                </>
              ) : (
                <p className="mt-2 truncate text-xs font-semibold text-rose-600">{reason}</p>
              )}
            </motion.div>
          ))}
        </div>
        {results.length > okCount && (
          <button className="mt-3 text-sm font-bold text-ink-2 underline-offset-4 hover:underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "예약 가능한 회의실만 보기" : `예약 불가 회의실 ${results.length - okCount}곳 보기 (사유 확인)`}
          </button>
        )}
      </div>
    </Card>
  );
}

/* ======================================================================
 * 2. 지금 회의실 상태 — 층별 상태판
 * ==================================================================== */
const STATE_STYLE = {
  free: { label: "비어있음", tile: "border-brand-200 bg-gradient-to-br from-brand-50 to-white", dot: "bg-brand-500", text: "text-brand-700" },
  soon: { label: "곧 시작", tile: "border-amber-200 bg-gradient-to-br from-amber-50 to-white", dot: "bg-amber-500", text: "text-amber-700" },
  busy: { label: "사용 중", tile: "border-rose-200 bg-gradient-to-br from-rose-50 to-white", dot: "bg-rose-500", text: "text-rose-700" },
  closed: { label: "운영 중지", tile: "border-line bg-zinc-50", dot: "bg-zinc-400", text: "text-zinc-500" },
};

export function NowBoard({ rooms, idx, onBook, onDetail }: { rooms: Room[]; idx: Idx; onBook: (p: BookingPreset) => void; onDetail: (r: MeetingReservation) => void }) {
  const { minute, today } = useNowMinute();
  const inHours = minute >= DAY_START && minute < DAY_END;
  const states = rooms.map((room) => ({ room, st: roomStatusAt(room, idx.active(room.id, today), minute) }));
  const count = (k: keyof typeof STATE_STYLE) => states.filter((s) => s.st.kind === k).length;
  const slotStart = minuteLabel(Math.min(Math.max(DAY_START, Math.ceil(minute / 30) * 30), DAY_END - 30));

  return (
    <Card className="p-5 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-ink-3">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand-500" />
            </span>
            LIVE · 지금 {minuteLabel(minute)}
          </p>
          <h3 className="mt-1 text-xl font-bold">지금 회의실 상태</h3>
          {!inHours && <p className="text-sm text-ink-3">운영시간({MEETING_CONFIG.businessStart}–{MEETING_CONFIG.businessEnd}) 외입니다.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["free", "soon", "busy", "closed"] as const).map((k) => (
            <span key={k} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold", STATE_STYLE[k].tile, STATE_STYLE[k].text)}>
              <i className={cn("size-2 rounded-full", STATE_STYLE[k].dot)} /> {STATE_STYLE[k].label} {count(k)}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {([12, 13] as const).map((floor) => (
          <div key={floor}>
            <p className="mb-2 flex items-center gap-2 text-sm font-extrabold">
              <span className="rounded-lg bg-ink px-2 py-0.5 text-white">{floor}F</span>
              <span className="text-ink-3">{states.filter((s) => s.room.floor === floor && s.st.kind === "free").length}곳 비어있음</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {states
                .filter((s) => s.room.floor === floor)
                .map(({ room, st }) => {
                  const S = STATE_STYLE[st.kind];
                  const info =
                    st.kind === "busy"
                      ? `${minuteLabel(st.current!.__e)} 종료 · ${st.current!.title}`
                      : st.kind === "soon"
                        ? `${st.next!.__s - minute}분 후 ${st.next!.title}`
                        : st.kind === "free"
                          ? st.freeUntil! >= DAY_END
                            ? "오늘 남은 시간 모두 비어있음"
                            : `${minuteLabel(st.freeUntil!)}까지 · ${dur(st.freeUntil! - Math.max(minute, DAY_START))}`
                          : "신규 예약 불가";
                  return (
                    <motion.button
                      key={room.id}
                      whileHover={{ y: -3 }}
                      onClick={() => (st.kind === "free" ? onBook({ roomId: room.id, date: today, start: slotStart }) : st.current ? onDetail(st.current) : st.next ? onDetail(st.next) : undefined)}
                      className={cn("relative flex min-h-[112px] flex-col rounded-2xl border p-3 text-left shadow-sm transition-shadow hover:shadow-card", S.tile)}
                    >
                      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ background: roomColor(room.id) }} />
                      <span className="flex items-center justify-between gap-1 pl-1.5">
                        <b className="truncate text-[15px]">{room.name.replace("회의실 ", "")}</b>
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-ink-3">
                          <Users className="size-3" />
                          {room.capacity}
                        </span>
                      </span>
                      <span className={cn("mt-1.5 flex items-center gap-1.5 pl-1.5 text-sm font-extrabold", S.text)}>
                        <i className={cn("size-2 rounded-full", S.dot, st.kind === "busy" && "animate-pulse")} />
                        {S.label}
                      </span>
                      <span className="mt-auto line-clamp-2 pl-1.5 pt-1 text-[11px] leading-snug text-ink-2">{info}</span>
                    </motion.button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">비어있는 회의실을 누르면 지금 시간으로 바로 예약창이 열립니다.</p>
    </Card>
  );
}

/* ======================================================================
 * 3. 하루 예약 현황표 — 시간축 타임라인 + 현재 시각선 + 빈 시간 표시
 * ==================================================================== */
export function DayBoard({
  rooms,
  idx,
  date,
  setDate,
  floor,
  setFloor,
  onBook,
  onDetail,
  showNav = true,
}: {
  rooms: Room[];
  idx: Idx;
  date: string;
  setDate: (d: string) => void;
  floor: Floor;
  setFloor: (f: Floor) => void;
  onBook: (p: BookingPreset) => void;
  onDetail: (r: MeetingReservation) => void;
  showNav?: boolean;
}) {
  const { minute, today } = useNowMinute();
  const scroller = useRef<HTMLDivElement>(null);
  const list = rooms.filter((r) => floor === "all" || r.floor === floor);
  const isToday = date === today;
  const pastEdge = date < today ? DAY_END : isToday ? Math.min(Math.max(minute, DAY_START), DAY_END) : DAY_START;
  const pct = (m: number) => ((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / SPAN) * 100;
  const hours = Array.from({ length: SPAN / 60 + 1 }, (_, i) => DAY_START + i * 60);
  // 오늘이면 현재 시각 근처로 자동 스크롤 (모바일에서 지난 시간부터 보이지 않도록)
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const ratio = date === today ? (Math.min(Math.max(minute, DAY_START), DAY_END) - DAY_START) / SPAN : 0;
    el.scrollLeft = Math.max(0, 132 + ratio * (el.scrollWidth - 132) - 160);
  }, [date, today, minute]);
  const totalFree = list.reduce((s, room) => {
    if (!room.active) return s;
    const booked = idx.active(room.id, date).reduce((a, r) => a + Math.max(0, Math.min(r.__e, DAY_END) - Math.max(r.__s, pastEdge)), 0);
    return s + Math.max(0, DAY_END - pastEdge - booked);
  }, 0);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-ink-3">
            <CalendarClock className="size-4" /> 하루 예약 현황표
          </p>
          <h3 className="mt-1 text-xl font-bold">
            {dateLabel(date)} {isToday && <Pill className="ml-1 align-middle bg-ink text-white">오늘</Pill>}
          </h3>
          <p className="text-sm text-ink-3">
            {date < today ? "지난 날짜입니다." : <>남은 빈 시간 합계 <b className="text-brand-700">{dur(totalFree)}</b> · 초록 빈 칸을 누르면 그 시간으로 예약됩니다.</>}
          </p>
        </div>
        {showNav && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(["all", 12, 13] as Floor[]).map((f) => (
                <button key={String(f)} onClick={() => setFloor(f)} className={cn("h-10 rounded-full px-3.5 text-sm font-bold", floor === f ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line")}>
                  {f === "all" ? "전체" : `${f}F`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="grid size-10 place-items-center rounded-full border border-line bg-white" onClick={() => setDate(addDays(date, -1))} aria-label="이전 날짜">
                <ChevronLeft className="size-4" />
              </button>
              <input type="date" className="input h-10 w-40" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="날짜" />
              <button className="grid size-10 place-items-center rounded-full border border-line bg-white" onClick={() => setDate(addDays(date, 1))} aria-label="다음 날짜">
                <ChevronRight className="size-4" />
              </button>
              <Button size="sm" variant="secondary" className="h-10" onClick={() => setDate(today)}>
                오늘
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-5 rounded border border-dashed border-brand-300 bg-brand-50" /> 예약 가능
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-5 rounded bg-[#3577E5]" /> 예약됨 (회의실별 색상)
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-5 rounded bg-zinc-200" /> 지난 시간
        </span>
        {isToday && (
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-0.5 bg-rose-500" /> 현재 시각
          </span>
        )}
      </div>

      <div ref={scroller} className="overflow-x-auto rounded-2xl border border-line">
        <div className="min-w-[860px]">
          {/* 시간축 */}
          <div className="sticky top-0 z-10 flex border-b border-line bg-canvas/90 backdrop-blur">
            <div className="sticky left-0 z-10 w-[132px] shrink-0 bg-canvas px-3 py-2 text-xs font-bold text-ink-3">회의실</div>
            <div className="relative h-9 flex-1">
              {hours.map((h) => (
                <span key={h} className={cn("absolute top-2 text-[11px] font-bold text-ink-3 tabular", h === DAY_START ? "translate-x-1" : h === DAY_END ? "-translate-x-[110%]" : "-translate-x-1/2")} style={{ left: `${pct(h)}%` }}>
                  {String(h / 60).padStart(2, "0")}시
                </span>
              ))}
            </div>
          </div>
          {list.map((room) => {
            const items = idx.active(room.id, date).slice().sort((a, b) => a.__s - b.__s);
            const color = roomColor(room.id);
            // 빈 구간 계산 (지난 시간 이후)
            const gaps: [number, number][] = [];
            let cursor = Math.max(DAY_START, pastEdge);
            for (const r of items) {
              if (r.__s > cursor) gaps.push([cursor, r.__s]);
              cursor = Math.max(cursor, r.__e);
            }
            if (cursor < DAY_END) gaps.push([cursor, DAY_END]);
            return (
              <div key={room.id} className="group flex border-b border-line last:border-0">
                <div className="sticky left-0 z-[5] flex w-[132px] shrink-0 flex-col justify-center border-r border-line bg-white px-3 py-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <i className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="truncate">{room.name}</span>
                  </p>
                  <p className="pl-4 text-[11px] text-ink-3">
                    {room.floor}F · {room.capacity}인{!room.active && " · 중지"}
                  </p>
                </div>
                <div className="relative h-[62px] flex-1">
                  {hours.map((h) => (
                    <span key={h} className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${pct(h)}%` }} />
                  ))}
                  {/* 지난 시간 */}
                  {pastEdge > DAY_START && <span className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,#f1f3f2_0,#f1f3f2_6px,#e8ecea_6px,#e8ecea_12px)]" style={{ width: `${pct(pastEdge)}%` }} />}
                  {/* 빈 구간 */}
                  {room.active &&
                    gaps.map(([s, e]) => {
                      const start30 = Math.ceil(s / 30) * 30;
                      if (e - start30 < 30) return null;
                      return (
                        <button
                          key={s}
                          onClick={() => onBook({ roomId: room.id, date, start: minuteLabel(start30), end: minuteLabel(Math.min(start30 + 60, e - ((e - start30) % 30))) })}
                          className="absolute inset-y-1.5 flex items-center justify-center rounded-lg border border-dashed border-brand-300 bg-brand-50/70 text-[11px] font-bold text-brand-700 opacity-80 transition hover:border-brand-500 hover:bg-brand-100 hover:opacity-100"
                          style={{ left: `calc(${pct(start30)}% + 2px)`, width: `calc(${pct(e) - pct(start30)}% - 4px)` }}
                          title={`${minuteLabel(start30)}–${minuteLabel(e)} 비어있음 · 눌러서 예약`}
                        >
                          {e - start30 >= 60 && <span className="truncate px-1">+ {minuteLabel(start30)}~ 빈 시간 {dur(e - start30)}</span>}
                        </button>
                      );
                    })}
                  {/* 예약 */}
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onDetail(r)}
                      className="absolute inset-y-1.5 overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm transition hover:brightness-110"
                      style={{ left: `calc(${pct(r.__s)}% + 1px)`, width: `calc(${pct(r.__e) - pct(r.__s)}% - 2px)`, background: color, opacity: r.__e <= pastEdge ? 0.45 : 1 }}
                      title={`${minuteLabel(r.__s)}–${minuteLabel(r.__e)} ${r.title} · ${r.department} ${r.organizer_name}`}
                    >
                      <b className="block truncate text-[11px] leading-tight">
                        {minuteLabel(r.__s)}–{minuteLabel(r.__e)}
                        {r.series_id ? " ↻" : ""}
                        {r.status === "checked_in" ? " · 사용 중" : ""}
                      </b>
                      <span className="block truncate text-[11px] leading-tight opacity-95">{r.title}</span>
                      <span className="block truncate text-[10px] leading-tight opacity-80">{r.department}</span>
                    </button>
                  ))}
                  {/* 현재 시각 */}
                  {isToday && minute >= DAY_START && minute <= DAY_END && <span className="pointer-events-none absolute inset-y-0 z-[4] w-0.5 bg-rose-500" style={{ left: `${pct(minute)}%` }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isToday && minute >= DAY_START && minute <= DAY_END && (
        <p className="mt-2 flex items-center gap-1 text-xs text-rose-600">
          <Clock3 className="size-3.5" /> 빨간 선이 현재 시각({minuteLabel(minute)})입니다.
        </p>
      )}
    </Card>
  );
}
