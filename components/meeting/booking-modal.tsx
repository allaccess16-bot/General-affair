"use client";

import { AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  conflictsFor,
  fmtDate,
  fmtTime,
  isoDow,
  localIso,
  recurrenceDates,
  roomColor,
  timeOptions,
  type MeetingReservation,
} from "@/lib/meeting";
import { addDays, DEPARTMENTS, todayStr } from "@/lib/shared";
import { cn } from "@/lib/utils";

export type BookingPreset = { roomId?: string; date?: string; start?: string; end?: string };

const OPTS = timeOptions();
const WEEKDAYS: [number, string][] = [[1, "월"], [2, "화"], [3, "수"], [4, "목"], [5, "금"], [6, "토"], [7, "일"]];

/**
 * 회의실 예약 — 기존 bookingModal 흐름 그대로:
 * 날짜·시간·인원 먼저 → 실제 예약 가능한 회의실만 표시 → 예약자·목적·부서 → 예약코드 발급
 * 반복·장기예약은 기간 중 1건이라도 겹치면 전체 미생성, 충돌 일정 상세 표시
 */
export function BookingModal({ open, preset, onClose }: { open: boolean; preset?: BookingPreset; onClose: () => void }) {
  const { rooms, meeting, meetingCreate, notify } = useDemo();
  const [mode, setMode] = useState<"single" | "recurring">("single");
  const [date, setDate] = useState(todayStr());
  const [repeatEnd, setRepeatEnd] = useState(addDays(todayStr(), 27));
  const [start, setStart] = useState(OPTS[2]);
  const [end, setEnd] = useState(OPTS[3]);
  const [count, setCount] = useState(2);
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("");
  const [result, setResult] = useState<{ code: string; count: number } | null>(null);
  const [serverConflicts, setServerConflicts] = useState<MeetingReservation[]>([]);

  useEffect(() => {
    if (!open) return;
    const d = preset?.date ?? todayStr();
    setMode("single");
    setDate(d);
    setRepeatEnd(addDays(d, 27));
    setStart(preset?.start ?? OPTS[2]);
    setEnd(preset?.end ?? OPTS[3]);
    setCount(2);
    setWeekdays(new Set([isoDow(d)]));
    setRoomId(preset?.roomId ?? "");
    setTitle("");
    setResult(null);
    setServerConflicts([]);
  }, [open, preset]);

  const dates = useMemo(
    () => (mode === "single" ? [date] : repeatEnd >= date && weekdays.size ? recurrenceDates(date, repeatEnd, weekdays, addDays) : []),
    [mode, date, repeatEnd, weekdays],
  );

  const evaluated = useMemo(
    () =>
      rooms
        .filter((r) => r.active)
        .map((room) => {
          const conflicts = end > start ? dates.flatMap((d) => conflictsFor(meeting, room.id, localIso(d, start), localIso(d, end))) : [];
          return { room, conflicts, fits: room.capacity >= count, available: room.capacity >= count && conflicts.length === 0 && dates.length > 0 && end > start };
        }),
    [rooms, meeting, dates, start, end, count],
  );
  const available = evaluated.filter((x) => x.available);
  const conflictRooms = evaluated.filter((x) => x.fits && x.conflicts.length);

  // 선택한 회의실이 조건 변경으로 불가해지면 선택 해제 (기존: 자동 변경하지 않음)
  useEffect(() => {
    if (roomId && !available.some((x) => x.room.id === roomId)) setRoomId("");
  }, [available, roomId]);

  const toggleDay = (n: number) =>
    setWeekdays((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (!roomId) return notify("선택한 날짜·시간에 예약 가능한 회의실을 선택해주세요.", true);
    if (!name.trim() || !title.trim() || !dept) return notify("필수 항목을 모두 입력해주세요.", true);
    setBusy(true);
    const r = await meetingCreate({ mode, room_id: roomId, title: title.trim(), organizer_name: name.trim(), department: dept, attendee_count: count, date, start, end, repeatEnd, weekdays: [...weekdays] });
    setBusy(false);
    if (!r.ok) {
      setServerConflicts(r.conflicts ?? []);
      return notify(r.error, true);
    }
    setResult(r.data!);
    notify(mode === "single" ? `예약 완료 · 예약코드 ${r.data!.code}` : `반복예약 ${r.data!.count}회 전체 완료 · 코드 ${r.data!.code}`);
  };

  const selectedRoom = rooms.find((r) => r.id === roomId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="MEETING ROOM"
      title={result ? "예약이 완료되었습니다" : "회의실 예약"}
      description={result ? undefined : "날짜와 시간을 먼저 선택하면 가능한 회의실만 표시됩니다."}
      width="max-w-3xl"
      footer={
        result ? (
          <Button className="w-full" onClick={onClose}>
            확인
          </Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
            <Button onClick={submit}>예약 확정</Button>
          </div>
        )
      }
    >
      {result ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-600">
            <CheckCircle2 className="size-9" />
          </span>
          <p className="mt-5 text-lg font-bold">
            {selectedRoom?.name} · {result.count > 1 ? `반복 ${result.count}회` : `${date} ${start}–${end}`}
          </p>
          <p className="mt-4 text-sm text-ink-3">예약코드 (입실확인·예약취소에 사용)</p>
          <button
            className="mx-auto mt-2 flex items-center gap-2 rounded-2xl bg-ink px-6 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-white"
            onClick={() => navigator.clipboard?.writeText(result.code).then(() => notify("예약코드를 복사했습니다."))}
          >
            {result.code} <Copy className="size-4 opacity-70" />
          </button>
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-3">현재 기기에는 자동 저장됩니다. 다른 기기에서 관리하려면 코드를 기억해주세요.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1">
            {(["single", "recurring"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn("rounded-xl py-2.5 text-sm font-bold transition", mode === m ? "bg-white text-brand-700 shadow-card" : "text-ink-3")}>
                {m === "single" ? "단일 예약" : "반복 · 장기 예약"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={mode === "recurring" ? "반복 시작일" : "예약일"} required>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (repeatEnd < e.target.value) setRepeatEnd(addDays(e.target.value, 27));
                }}
              />
            </Field>
            {mode === "recurring" && (
              <Field label="반복 종료일" required hint="기간 제한 없이 종료일을 선택할 수 있습니다.">
                <input type="date" className="input" min={date} value={repeatEnd} onChange={(e) => setRepeatEnd(e.target.value)} />
              </Field>
            )}
            <Field label="시간 (30분 단위)" required>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input"
                  value={start}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStart(v);
                    if (end <= v) setEnd(OPTS[Math.min(OPTS.indexOf(v) + 1, OPTS.length - 1)]);
                  }}
                >
                  {OPTS.slice(0, -1).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <select className="input" value={end} onChange={(e) => setEnd(e.target.value)}>
                  {OPTS.slice(1).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="참석인원" required>
              <input type="number" min={1} className="input" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
          </div>

          {mode === "recurring" && (
            <div>
              <p className="mb-2 text-[13px] font-bold text-ink-2">반복 요일</p>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map(([n, t]) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleDay(n)}
                    className={cn("rounded-xl border py-2.5 text-sm font-bold transition", weekdays.has(n) ? "border-brand-500 bg-brand-600 text-white" : "border-line text-ink-2 hover:border-brand-200")}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-3">
                {weekdays.size === 0 ? (
                  "반복할 요일을 1개 이상 선택해주세요."
                ) : repeatEnd < date ? (
                  "반복 종료일은 시작일 이후로 선택해주세요."
                ) : (
                  <>
                    예상 <b className="text-ink">{dates.length}회</b> · {date.replaceAll("-", ".")} ~ {repeatEnd.replaceAll("-", ".")} · <b className="text-rose-600">중간에 기존 예약이 1건이라도 있으면 전체 신청 불가</b>
                  </>
                )}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-bold text-ink-2">
              예약 가능한 회의실 <span className="text-rose-500">*</span>
            </p>
            <Notice tone={available.length ? "ok" : "warn"} className="mb-3">
              {available.length ? (
                <>
                  <b>{available.length}개 회의실 {mode === "recurring" ? "장기예약" : "예약"} 가능</b> · {date} {start}–{end} · {count}명 기준
                  {mode === "recurring" && ` · 반복 ${dates.length}회`}
                </>
              ) : (
                <>
                  선택한 <b>{date} {start}–{end}</b> 시간에 {count}명이 이용 가능한 회의실이 없습니다.
                </>
              )}
            </Notice>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {available.map(({ room }) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setRoomId(room.id)}
                  className={cn("flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition", roomId === room.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-line hover:border-brand-200")}
                >
                  <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: roomColor(room.id) }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {room.floor}F · {room.name}
                    </span>
                    <span className="block truncate text-xs text-ink-3">
                      {room.capacity}인 · {room.location}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {mode === "recurring" && (conflictRooms.length > 0 || serverConflicts.length > 0) && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
                  <AlertTriangle className="size-4" /> 기간 중 기존 예약과 겹치는 회의실
                </p>
                <ul className="mt-2 max-h-40 space-y-1.5 overflow-auto text-xs text-amber-900">
                  {(serverConflicts.length ? [{ room: rooms.find((r) => r.id === serverConflicts[0].room_id)!, conflicts: serverConflicts }] : conflictRooms).map(({ room, conflicts }) => (
                    <li key={room.id}>
                      <b>{room.name}</b> — {conflicts.length}건 충돌
                      {conflicts.slice(0, 3).map((c) => (
                        <span key={c.id} className="block pl-3">
                          · {fmtDate(c.start_at)} {fmtTime(c.start_at)}–{fmtTime(c.end_at)} · {c.department} {c.organizer_name} · {c.title}
                        </span>
                      ))}
                      {conflicts.length > 3 && <span className="block pl-3">· 외 {conflicts.length - 3}건</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="예약자 이름" required>
              <input className="input" maxLength={30} placeholder="예: 김용천" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="사용 목적" required>
              <input className="input" maxLength={60} placeholder="예: 주간 실무회의" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-bold text-ink-2">
              부서 선택 <span className="text-rose-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDept(d)}
                  className={cn("truncate rounded-xl border px-2 py-2 text-xs font-semibold transition", dept === d ? "border-brand-500 bg-brand-600 text-white" : "border-line text-ink-2 hover:border-brand-200")}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Notice>
            {mode === "recurring"
              ? "반복·장기예약은 입실확인 없이 유지되고 종료 후 자동 완료됩니다."
              : "예약 완료 후 발급되는 예약코드는 입실확인·예약취소에 사용됩니다. 단일 예약은 시작 후 10분 내 입실확인이 없으면 자동취소됩니다."}
          </Notice>
        </div>
      )}
    </Modal>
  );
}
