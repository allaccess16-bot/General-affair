"use client";

import { motion } from "framer-motion";
import { ChevronDown, MapPin, Search, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminGate } from "@/components/modules/admin-gate";
import { ModuleHero } from "@/components/modules/module-hero";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Empty, Notice, Pill, Tabs } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Reveal, Stagger, staggerItem } from "@/components/ui/reveal";
import { fmtDate, fmtTime, isActive, isoDow, MEETING_CONFIG, roomColor, seoulParts, STATUS_TEXT, type MeetingReservation, type MeetingStatus, type Room } from "@/lib/meeting";
import { todayStr } from "@/lib/shared";
import { cn } from "@/lib/utils";
import { BookingModal, type BookingPreset } from "./booking-modal";
import { DayBoard, NowBoard, QuickFinder } from "./overview";
import { MonthCalendar, useIndexed, WeekAvailability, type Indexed } from "./schedule";

type Tab = "overview" | "calendar" | "week" | "mine" | "admin" | "guide";
type Floor = "all" | 12 | 13;

const STATUS_STYLE: Record<MeetingStatus, string> = {
  reserved: "bg-brand-50 text-brand-700",
  checked_in: "bg-sky-50 text-sky-700",
  completed: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-zinc-100 text-zinc-500",
  no_show: "bg-rose-50 text-rose-700",
};

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function MeetingApp() {
  const { ready, isAdmin, rooms } = useDemo();
  const admin = isAdmin("meeting");
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [booking, setBooking] = useState<{ open: boolean; preset?: BookingPreset }>({ open: false });
  const [detail, setDetail] = useState<MeetingReservation | null>(null);

  useEffect(() => {
    if (params.get("new")) setBooking({ open: true });
  }, [params]);

  const openBooking = (preset?: BookingPreset) => setBooking({ open: true, preset });

  return (
    <div>
      <ModuleHero
        moduleKey="meeting"
        onPrimary={() => openBooking()}
        secondary={{ label: "통합 예약 현황", href: "#work" }}
        meta={
          ready && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill className="bg-white text-ink-2 ring-1 ring-line">12층·13층 {rooms.length}개 회의실</Pill>
              <Pill className="bg-white text-ink-2 ring-1 ring-line">30분 단위 · {MEETING_CONFIG.businessStart}–{MEETING_CONFIG.businessEnd}</Pill>
              <Pill className="bg-amber-50 text-amber-800">단일 예약 10분 내 입실확인</Pill>
            </div>
          )
        }
      />
      <div id="work" className="mx-auto max-w-[1320px] scroll-mt-24 space-y-6 px-4 md:px-8">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: "한눈에 보기" },
            { value: "calendar", label: "월간 달력" },
            { value: "week", label: "회의실별 7일" },
            { value: "mine", label: "내 예약" },
            { value: "admin", label: "관리자", locked: !admin },
            { value: "guide", label: "이용 안내" },
          ]}
          className="w-fit max-w-full"
        />
        {!ready ? (
          <div className="h-80 animate-pulse rounded-3xl bg-white" />
        ) : (
          <>
            {tab === "overview" && <Overview onBook={openBooking} onDetail={setDetail} />}
            {tab === "calendar" && <CalendarView onBook={openBooking} onDetail={setDetail} />}
            {tab === "week" && <WeekView onBook={openBooking} onDetail={setDetail} />}
            {tab === "mine" && <Mine />}
            {tab === "admin" && (
              <AdminGate module="meeting">
                <Admin />
              </AdminGate>
            )}
            {tab === "guide" && <Guide />}
          </>
        )}
      </div>
      <BookingModal open={booking.open} preset={booking.preset} onClose={() => setBooking({ open: false })} />
      <DetailModal r={detail} rooms={rooms} onClose={() => setDetail(null)} />
    </div>
  );
}

function FloorChips({ value, onChange }: { value: Floor; onChange: (f: Floor) => void }) {
  return (
    <div className="flex gap-1">
      {(["all", 12, 13] as Floor[]).map((f) => (
        <button key={String(f)} onClick={() => onChange(f)} className={cn("rounded-full px-3.5 py-2 text-sm font-bold", value === f ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line")}>
          {f === "all" ? "전체" : `${f}F`}
        </button>
      ))}
    </div>
  );
}

/* ---------------- 한눈에 보기 ---------------- */
function Overview({ onBook, onDetail }: { onBook: (p?: BookingPreset) => void; onDetail: (r: MeetingReservation) => void }) {
  const { meeting, rooms } = useDemo();
  const idx = useIndexed(meeting);
  const [date, setDate] = useState(todayStr());
  const [floor, setFloor] = useState<Floor>("all");
  return (
    <div className="space-y-5">
      <Reveal>
        <NowBoard rooms={rooms} idx={idx} onBook={onBook} onDetail={onDetail} />
      </Reveal>
      <Reveal delay={0.05}>
        <QuickFinder rooms={rooms} idx={idx} onBook={onBook} />
      </Reveal>
      <Reveal delay={0.1}>
        <DayBoard rooms={rooms} idx={idx} date={date} setDate={setDate} floor={floor} setFloor={setFloor} onBook={onBook} onDetail={onDetail} />
      </Reveal>
    </div>
  );
}

/* ---------------- 월간 달력 ---------------- */
function CalendarView({ onBook, onDetail }: { onBook: (p?: BookingPreset) => void; onDetail: (r: MeetingReservation) => void }) {
  const { meeting, rooms } = useDemo();
  const idx = useIndexed(meeting);
  const [date, setDate] = useState(todayStr());
  const [floor, setFloor] = useState<Floor>("all");
  const list = rooms.filter((r) => floor === "all" || r.floor === floor);
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <FloorChips value={floor} onChange={setFloor} />
      </div>
      <MonthCalendar selected={date} onSelect={setDate} rooms={list} idx={idx} />
      <DayBoard rooms={rooms} idx={idx} date={date} setDate={setDate} floor={floor} setFloor={setFloor} onBook={onBook} onDetail={onDetail} showNav={false} />
    </div>
  );
}

/* ---------------- 회의실별 7일 ---------------- */
function WeekView({ onBook, onDetail }: { onBook: (p?: BookingPreset) => void; onDetail: (r: MeetingReservation) => void }) {
  const { meeting, rooms } = useDemo();
  const idx = useIndexed(meeting);
  const [date, setDate] = useState(todayStr());
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  if (!room) return null;
  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <span className="text-sm font-bold">회의실 선택</span>
        <div className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none">
          {rooms.map((r) => (
            <button
              key={r.id}
              title={`${r.name} · ${r.capacity}인 · ${r.location}`}
              onClick={() => setRoomId(r.id)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-bold transition", r.id === room.id ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2")}
            >
              <i className="size-2 rounded-full" style={{ background: roomColor(r.id) }} />
              {r.name.replace("회의실 ", "")}
            </button>
          ))}
        </div>
        <input type="date" className="input w-40" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="시작 날짜" />
      </Card>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm text-ink-2">
        <b className="text-ink">{room.name}</b>
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {room.location}</span>
        <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> 최대 {room.capacity}인 · {room.floor}층</span>
        {!room.active && <span className="font-bold text-zinc-500">운영 중지</span>}
      </p>
      <WeekAvailability room={room} from={date} idx={idx} onFree={(d, s, e) => onBook({ roomId: room.id, date: d, start: s, end: e })} onBusy={onDetail} />
    </div>
  );
}

function DetailModal({ r, rooms, onClose }: { r: MeetingReservation | null; rooms: Room[]; onClose: () => void }) {
  const room = r ? rooms.find((x) => x.id === r.room_id) : undefined;
  return (
    <Modal open={!!r} onClose={onClose} eyebrow="RESERVATION DETAIL" title="예약 상세" description="예약 현황판에서 선택한 일정입니다." tone="plain">
      {r && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["회의실", `${room?.floor}F · ${room?.name}`],
            ["상태", STATUS_TEXT[r.status]],
            ["예약일시", `${fmtDate(r.start_at)} ${fmtTime(r.start_at)}–${fmtTime(r.end_at)}`],
            ["유형", r.series_id ? `반복예약 (${r.recurrence_label?.replaceAll("-", ".")})` : "단일 예약"],
            ["부서", r.department],
            ["예약자", r.organizer_name],
            ["회의 제목", r.title],
            ["참석인원", `${r.attendee_count}명`],
          ].map(([k, v]) => (
            <div key={k} className={cn("rounded-2xl bg-canvas p-3", (k === "예약일시" || k === "유형") && "col-span-2")}>
              <p className="text-xs text-ink-3">{k}</p>
              <p className="mt-0.5 font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- 내 예약 ---------------- */
function Mine() {
  const { meeting, myMeeting, rooms, meetingManage, meetingCancelSeries, meetingFindByCode, notify, me } = useDemo();
  const now = useNow(15000);
  const [code, setCode] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const codeMap = useMemo(() => new Map(myMeeting.map((m) => [m.id, m.code])), [myMeeting]);
  const items = meeting.filter((r) => codeMap.has(r.id));

  const groups = useMemo(() => {
    const singles: { type: "single"; at: number; item: MeetingReservation }[] = [];
    const series = new Map<string, MeetingReservation[]>();
    items.forEach((r) => {
      if (!r.series_id) singles.push({ type: "single", at: new Date(r.start_at).getTime(), item: r });
      else series.set(r.series_id, [...(series.get(r.series_id) ?? []), r]);
    });
    const gs: ({ type: "series"; at: number; id: string; items: MeetingReservation[] } | (typeof singles)[number])[] = [...singles];
    series.forEach((arr, id) => {
      arr.sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
      const up = arr.filter((r) => isActive(r) && new Date(r.end_at).getTime() >= now);
      gs.push({ type: "series", id, items: arr, at: up.length ? +new Date(up[0].start_at) : +new Date(arr[arr.length - 1].start_at) });
    });
    return gs.sort((a, b) => {
      const af = a.at >= now;
      const bf = b.at >= now;
      if (af !== bf) return af ? -1 : 1;
      return af ? a.at - b.at : b.at - a.at;
    });
  }, [items, now]);

  const run = async (id: string, action: "checkin" | "cancel") => {
    const c = codeMap.get(id) ?? "";
    if (action === "cancel" && !confirm("이 예약을 취소할까요?")) return;
    const r = await meetingManage(id, c, action);
    notify(r.ok ? (action === "checkin" ? "사용 확인이 완료되었습니다." : "예약이 취소되었습니다.") : r.error, !r.ok);
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold">내 예약</h3>
          <p className="text-sm text-ink-3">{me ? "내 계정으로 예약한 내역은 어느 기기에서나 자동 표시됩니다. 로그인 전에 만든 예약은 예약코드로 불러오세요." : "이 기기에서 예약한 내역은 자동 표시됩니다. 다른 기기에서는 예약코드로 조회하세요."}</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (!c) return notify("예약코드를 입력해주세요.", true);
            const res = await meetingFindByCode(c);
            if (!res.ok) return notify(res.error, true);
            const n = res.data ?? 0;
            notify(n ? `예약 ${n}건을 이 기기에 불러왔습니다.` : "일치하는 예약코드가 없습니다.", !n);
            if (n) setCode("");
          }}
        >
          <input className="input w-44 font-mono uppercase" maxLength={10} placeholder="예약코드 입력" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button type="submit" variant="dark" className="h-[46px] rounded-[14px]">
            <Search className="size-4" /> 조회
          </Button>
        </form>
      </Card>
      <Notice tone="warn">단일 예약은 시작 시각부터 10분 동안 입실확인이 가능하며 미확인 시 자동취소됩니다. 반복·장기예약은 입실확인 대상이 아니며 종료 시간이 지나면 자동으로 사용 완료 처리됩니다.</Notice>
      {groups.length === 0 && (
        <Empty>
          이 기기에서 예약한 내역이 없습니다.
          <br />
          다른 기기에서 예약했다면 상단에 예약코드를 입력해주세요.
        </Empty>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((g) => {
          if (g.type === "single") {
            const r = g.item;
            const room = rooms.find((x) => x.id === r.room_id);
            const s = +new Date(r.start_at);
            const canCheck = r.status === "reserved" && now >= s && now <= s + MEETING_CONFIG.checkinGraceMinutes * 60000;
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-bold">
                      <i className="size-2.5 rounded-full" style={{ background: roomColor(r.room_id) }} />
                      {room?.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      {fmtDate(r.start_at)} {fmtTime(r.start_at)}–{fmtTime(r.end_at)} · {r.department} · {r.organizer_name}
                    </p>
                    <p className="text-sm text-ink-3">
                      {r.title} · {r.attendee_count}명
                    </p>
                    <span className="mt-2 inline-block rounded-lg bg-canvas px-2 py-1 font-mono text-xs font-bold">예약코드 {codeMap.get(r.id)}</span>
                  </div>
                  <Pill className={STATUS_STYLE[r.status]}>{STATUS_TEXT[r.status]}</Pill>
                </div>
                {isActive(r) && (
                  <div className="mt-4 flex gap-2">
                    {canCheck && (
                      <Button size="sm" className="flex-1" onClick={() => run(r.id, "checkin")}>
                        사용 확인
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="flex-1 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-700" onClick={() => run(r.id, "cancel")}>
                      예약 취소
                    </Button>
                  </div>
                )}
              </Card>
            );
          }
          const first = g.items[0];
          const room = rooms.find((x) => x.id === first.room_id);
          const active = g.items.filter((r) => isActive(r) && +new Date(r.end_at) >= now);
          const days = [...new Set(g.items.map((r) => "월화수목금토일"[isoDow(r.start_at.slice(0, 10)) - 1]))];
          const expanded = open.has(g.id);
          return (
            <Card key={g.id} className="p-5 lg:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <i className="size-2.5 rounded-full" style={{ background: roomColor(first.room_id) }} />
                    {room?.name}
                    <Pill className="bg-violet-50 text-violet-700">장기·반복예약</Pill>
                    <Pill className={active.length ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-500"}>{active.length ? `남은 일정 ${active.length}회` : "종료"}</Pill>
                  </p>
                  <p className="mt-1 text-sm text-ink-2">
                    <b>{first.recurrence_label?.replaceAll("-", ".")}</b> · 총 {g.items.length}회 · <b>{days.join("·")}</b> 반복 · {fmtTime(first.start_at)}–{fmtTime(first.end_at)}
                  </p>
                  <p className="text-sm text-ink-3">
                    {first.department} · {first.organizer_name} · {first.title} · {first.attendee_count}명 · 완료 {g.items.filter((r) => r.status === "completed").length} · 취소 {g.items.filter((r) => r.status === "cancelled").length}
                  </p>
                  <span className="mt-2 inline-block rounded-lg bg-canvas px-2 py-1 font-mono text-xs font-bold">예약코드 {codeMap.get(first.id)}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpen((p) => (p.has(g.id) ? (p.delete(g.id), new Set(p)) : new Set(p.add(g.id))))}>
                    일정 {expanded ? "접기" : "펼치기"} <ChevronDown className={cn("size-4 transition", expanded && "rotate-180")} />
                  </Button>
                  {active.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-700"
                      onClick={async () => {
                        if (!confirm(`남은 ${active.length}회 일정을 모두 취소할까요?`)) return;
                        const r = await meetingCancelSeries(g.id, codeMap.get(first.id) ?? "");
                        notify(r.ok ? `반복예약 ${r.data}회를 취소했습니다.` : r.error, !r.ok);
                      }}
                    >
                      남은 일정 전체 취소
                    </Button>
                  )}
                </div>
              </div>
              {expanded && (
                <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
                  {g.items.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span>
                        <b>
                          {fmtDate(r.start_at)} · {fmtTime(r.start_at)}–{fmtTime(r.end_at)}
                        </b>{" "}
                        <Pill className={cn("ml-1", STATUS_STYLE[r.status])}>{STATUS_TEXT[r.status]}</Pill>
                      </span>
                      {isActive(r) && (
                        <button className="text-xs font-bold text-rose-600" onClick={() => run(r.id, "cancel")}>
                          이 일정 취소
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 관리자 ---------------- */
function Admin() {
  const { meeting, rooms, meetingAdminCancel, meetingAdminCancelSeries, meetingSetRoomActive, notify } = useDemo();
  const now = useNow();
  const [date, setDate] = useState(todayStr());
  const idx = useIndexed(meeting);
  const day = (idx.byDate.get(date) ?? []).slice().sort((a, b) => a.__s - b.__s);
  const cut = now - 30 * 86400000;
  const recent = meeting.filter((r) => +new Date(r.start_at) >= cut && r.status !== "cancelled");
  const kpis = [
    ["선택일 전체 예약", day.filter((r) => r.status !== "cancelled").length],
    ["현재 사용 중", meeting.filter((r) => isActive(r) && +new Date(r.start_at) <= now && +new Date(r.end_at) > now).length],
    ["최근 30일 노쇼", meeting.filter((r) => r.status === "no_show" && +new Date(r.start_at) >= cut).length],
    ["활성 반복예약", new Set(meeting.filter((r) => r.series_id && isActive(r) && +new Date(r.end_at) >= now).map((r) => r.series_id)).size],
  ] as const;
  const usage = (key: (r: MeetingReservation) => string) => {
    const o: Record<string, number> = {};
    recent.forEach((r) => (o[key(r)] = (o[key(r)] || 0) + (+new Date(r.end_at) - +new Date(r.start_at)) / 3600000));
    return Object.entries(o).sort((a, b) => b[1] - a[1]);
  };
  const byRoom = usage((r) => rooms.find((x) => x.id === r.room_id)?.name ?? r.room_id);
  const byDept = usage((r) => r.department).slice(0, 8);
  const max = (arr: [string, number][]) => Math.max(1, ...arr.map((a) => a[1]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-brand-600">ADMIN CONSOLE</p>
          <h3 className="text-xl font-bold">운영 현황</h3>
        </div>
        <input type="date" className="input w-44" value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([l, v]) => (
          <Card key={l} className="p-5">
            <p className="text-sm text-ink-3">{l}</p>
            <p className="mt-1 text-3xl font-extrabold">
              <CountUp value={v} />
            </p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 md:p-6">
          <CardHeader title="예약 관리" description="강제취소 · 반복예약 전체취소" className="mb-4" />
          <div className="max-h-[520px] space-y-2 overflow-auto">
            {day.length === 0 && <Empty>선택한 날짜의 예약이 없습니다.</Empty>}
            {day.map((r) => (
              <AdminRow
                key={r.id}
                r={r}
                room={rooms.find((x) => x.id === r.room_id)}
                onCancel={async () => {
                  if (!confirm("이 예약을 강제취소할까요?")) return;
                  const res = await meetingAdminCancel(r.id);
                  notify(res.ok ? "예약을 강제취소했습니다." : res.error, !res.ok);
                }}
                onCancelSeries={async () => {
                  if (!confirm("이 반복예약의 남은 일정을 모두 취소할까요?")) return;
                  const res = await meetingAdminCancelSeries(r.series_id!);
                  notify(res.ok ? "반복예약 전체를 취소했습니다." : res.error, !res.ok);
                }}
              />
            ))}
          </div>
        </Card>
        <Card className="p-5 md:p-6">
          <CardHeader title="회의실 운영" description="운영중지 시 신규 예약이 막힙니다." className="mb-4" />
          <ul className="space-y-2">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5">
                <i className="size-2.5 shrink-0 rounded-full" style={{ background: roomColor(r.id) }} />
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">
                    {r.floor}F · {r.name}
                  </b>
                  <span className="block truncate text-xs text-ink-3">
                    {r.capacity}인 · {r.location}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={r.active ? "ghost" : "primary"}
                  className={r.active ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700" : ""}
                  onClick={async () => {
                    const res = await meetingSetRoomActive(r.id, !r.active);
                    notify(!res.ok ? res.error : r.active ? `${r.name} 운영을 중지했습니다.` : `${r.name} 운영을 재개했습니다.`, !res.ok);
                  }}
                >
                  {r.active ? "운영중지" : "운영재개"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <SeriesAdmin rooms={rooms} now={now} />
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          ["최근 30일 회의실 이용량", byRoom],
          ["최근 30일 부서별 예약", byDept],
        ].map(([t, arr]) => (
          <Reveal key={t as string}>
            <Card className="p-5 md:p-6">
              <CardHeader title={t as string} description="예약 시간 합계 (시간)" className="mb-4" />
              <ul className="space-y-2.5">
                {(arr as [string, number][]).map(([k, v]) => (
                  <li key={k}>
                    <div className="mb-1 flex justify-between text-sm">
                      <b>{k}</b>
                      <span className="tabular text-ink-2">{v.toFixed(1)}h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas">
                      <motion.div className="h-full rounded-full bg-[color:var(--color-mod-meeting)]" initial={{ width: 0 }} whileInView={{ width: `${(v / max(arr as [string, number][])) * 100}%` }} viewport={{ once: true }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* 장기(반복)예약 — 회차가 아니라 장기예약 1건 단위로 관리 */
const DOW = ["", "월", "화", "수", "목", "금", "토", "일"];
type SeriesRow = { id: string; first: MeetingReservation; items: MeetingReservation[]; upcoming: number; completed: number; cancelled: number; next?: MeetingReservation; status: "진행중" | "종료" | "취소" };

function SeriesAdmin({ rooms, now }: { rooms: Room[]; now: number }) {
  const { meeting, meetingAdminCancelSeries, notify } = useDemo();
  const [tab, setTab] = useState<"진행중" | "지난 예약">("진행중");
  const [q, setQ] = useState("");
  const [show, setShow] = useState(8);
  const all = useMemo(() => {
    const map = new Map<string, MeetingReservation[]>();
    meeting.forEach((r) => r.series_id && map.set(r.series_id, [...(map.get(r.series_id) ?? []), r]));
    const rows: SeriesRow[] = [];
    map.forEach((items, id) => {
      items.sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
      const live = items.filter((r) => isActive(r) && +new Date(r.end_at) > now);
      const completed = items.filter((r) => r.status === "completed").length;
      const cancelled = items.filter((r) => r.status === "cancelled" || r.status === "no_show").length;
      rows.push({ id, first: items[0], items, upcoming: live.length, completed, cancelled, next: live[0], status: live.length ? "진행중" : completed ? "종료" : "취소" });
    });
    return rows.sort((a, b) => (a.next && b.next ? +new Date(a.next.start_at) - +new Date(b.next.start_at) : +new Date(b.items[b.items.length - 1].start_at) - +new Date(a.items[a.items.length - 1].start_at)));
  }, [meeting, now]);
  const list = all.filter((r) => (tab === "진행중" ? r.status === "진행중" : r.status !== "진행중") && (!q.trim() || `${r.first.title} ${r.first.organizer_name} ${r.first.department}`.includes(q.trim())));
  const dows = (items: MeetingReservation[]) => [...new Set(items.map((r) => isoDow(seoulParts(r.start_at).date)))].sort((x, y) => x - y).map((d) => DOW[d]).join("·");

  return (
    <Card className="p-5 md:p-6">
      <CardHeader
        title="장기 · 반복예약 관리"
        description={`장기예약 1건 단위로 표시합니다 · 진행중 ${all.filter((r) => r.status === "진행중").length}건`}
        className="mb-4"
        action={
          <div className="flex gap-1 rounded-full bg-canvas p-1">
            {(["진행중", "지난 예약"] as const).map((t) => (
              <button key={t} onClick={() => (setTab(t), setShow(8))} className={cn("relative z-10 rounded-full px-3 py-1.5 text-xs font-bold transition-colors", tab === t ? "text-white" : "text-ink-2")}>
                {tab === t && <motion.span layoutId="series-tab" className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                {t}
              </button>
            ))}
          </div>
        }
      />
      <input className="input mb-3 h-10 text-sm" placeholder="제목 · 예약자 · 부서 검색" value={q} onChange={(e) => (setQ(e.target.value), setShow(8))} />
      {list.length === 0 && <Empty>{tab === "진행중" ? "진행 중인 장기예약이 없습니다." : "지난 장기예약이 없습니다."}</Empty>}
      <ul className="grid gap-2.5 lg:grid-cols-2">
        {list.slice(0, show).map((s) => {
          const room = rooms.find((x) => x.id === s.first.room_id);
          const total = s.items.length;
          const done = s.completed + s.cancelled;
          return (
            <motion.li key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <i className="size-2.5 shrink-0 rounded-full" style={{ background: roomColor(s.first.room_id) }} />
                    <span className="truncate">{s.first.title}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-3">
                    {room?.name ?? s.first.room_id} · {s.first.department} {s.first.organizer_name} · {s.first.attendee_count}명
                  </p>
                </div>
                <Pill className={s.status === "진행중" ? "bg-violet-50 text-violet-700" : s.status === "종료" ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-500"}>{s.status}</Pill>
              </div>
              <p className="mt-2 text-xs font-semibold text-ink-2 tabular">
                {fmtDate(s.items[0].start_at)} ~ {fmtDate(s.items[total - 1].start_at)} · 매주 {dows(s.items)} · {fmtTime(s.first.start_at)}–{fmtTime(s.first.end_at)}
              </p>
              <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-canvas" title={`완료 ${s.completed} · 취소 ${s.cancelled} · 남은 ${s.upcoming}`}>
                <span className="bg-brand-500" style={{ width: `${(s.completed / total) * 100}%` }} />
                <span className="bg-zinc-300" style={{ width: `${(s.cancelled / total) * 100}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-3">
                <span className="tabular">
                  총 {total}회 · 진행 {done}/{total} {s.next && <>· 다음 {fmtDate(s.next.start_at)}</>}
                </span>
                {s.status === "진행중" && (
                  <button
                    className="font-bold text-rose-600 hover:underline"
                    onClick={async () => {
                      if (!confirm(`'${s.first.title}' 장기예약의 남은 ${s.upcoming}회를 모두 취소할까요?`)) return;
                      const res = await meetingAdminCancelSeries(s.id);
                      notify(res.ok ? "장기예약의 남은 일정을 모두 취소했습니다." : res.error, !res.ok);
                    }}
                  >
                    남은 일정 전체 취소
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
      {list.length > show && (
        <Button variant="ghost" className="mt-3 w-full" onClick={() => setShow((v) => v + 8)}>
          더 보기 ({list.length - show}건)
        </Button>
      )}
    </Card>
  );
}

function AdminRow({ r, room, onCancel, onCancelSeries }: { r: Indexed; room?: Room; onCancel: () => void; onCancelSeries: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
          <i className="size-2 rounded-full" style={{ background: roomColor(r.room_id) }} />
          {fmtTime(r.start_at)}–{fmtTime(r.end_at)} · {room?.name}
          <Pill className={STATUS_STYLE[r.status]}>{STATUS_TEXT[r.status]}</Pill>
          {r.series_id && <Pill className="bg-violet-50 text-violet-700">반복</Pill>}
        </p>
        <p className="truncate text-xs text-ink-3">
          {r.department} · {r.organizer_name} · {r.title} · {r.attendee_count}명
        </p>
      </div>
      {isActive(r) && (
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={onCancel}>
            강제취소
          </Button>
          {r.series_id && (
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={onCancelSeries}>
              반복 전체취소
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- 이용 안내 ---------------- */
const GUIDES = [
  ["01 · RESERVE", "30분 단위 예약", "날짜·시간·참석인원을 먼저 입력하면 실제 예약 가능한 회의실만 표시됩니다. 이후 부서, 예약자, 사용목적을 입력해 예약합니다."],
  ["02 · CHECK-IN", "단일 예약만 10분 내 입실확인", "단일 예약은 시작 후 10분 내 ‘사용 확인’을 눌러주세요. 반복·장기예약은 입실확인 없이 예약이 유지되고 종료 후 자동으로 완료 처리됩니다."],
  ["03 · RELEASE", "사용하지 않으면 즉시 취소", "다른 직원이 회의실을 사용할 수 있도록 일정이 바뀌면 내 예약에서 바로 취소해주세요."],
  ["04 · CAPACITY", "인원에 맞는 공간 선택", "4~5인실, 8~12인실, 30인 대회의실로 구분해 적정 규모의 회의실을 선택하도록 설계했습니다."],
  ["05 · COLLISION", "중복예약 DB 차단", "화면의 사전검사와 별개로 Supabase PostgreSQL에서도 겹치는 시간의 예약을 차단합니다."],
  ["06 · LONG TERM", "반복·장기 예약", "종료일 제한 없이 원하는 기간과 요일을 선택해 동일 시간으로 반복예약할 수 있습니다. 기간 중 기존 예약과 1건이라도 겹치면 전체 장기예약이 생성되지 않으며, 충돌 예약의 일시·예약자·부서·회의제목을 신청 화면에서 확인할 수 있습니다."],
  ["07 · ADMIN", "관리자 운영 콘솔", "관리자는 예약 강제취소, 반복예약 전체취소, 회의실 운영중지, 최근 30일 이용량과 노쇼 현황을 확인할 수 있습니다."],
];

function Guide() {
  return (
    <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {GUIDES.map(([n, t, d]) => (
        <motion.div key={n} variants={staggerItem} whileHover={{ y: -4 }} className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <p className="text-xs font-extrabold tracking-widest text-[color:var(--color-mod-meeting)]">{n}</p>
          <h4 className="mt-2 text-lg font-bold">{t}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
        </motion.div>
      ))}
    </Stagger>
  );
}
