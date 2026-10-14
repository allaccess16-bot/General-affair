"use client";

/**
 * 데모 데이터 저장소 — 기존 3개 시스템의 데이터 구조·업무 규칙을 브라우저에서 재현합니다.
 * 데이터는 이 브라우저의 localStorage에만 저장됩니다(운영 DB와 연결되지 않음).
 *
 * 실데이터 연결 시: 각 action을 기존 Supabase 호출로 교체합니다.
 *  - 총무:  from('requests').insert/update/delete
 *  - 차량:  from('vehicle_reservations').insert/update/delete
 *  - 회의실: rpc('create_reservation' | 'create_recurring_reservations' | 'manage_reservation' | ...)
 */
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { GaRequest, GaRequestInput } from "@/lib/ga";
import {
  conflictsFor,
  isActive,
  localIso,
  MEETING_CONFIG,
  randCode,
  recurrenceDates,
  sweepStatuses,
  type MeetingReservation,
  type Room,
} from "@/lib/meeting";
import { nextRequestNo, type SealInput, type SealRequest, type SealStatus } from "@/lib/seal";
import { seedGa, seedMeeting, seedRooms, seedSeal, seedVehicles } from "@/lib/seed";
import { addDays, nowIso, todayStr, uid } from "@/lib/shared";
import { findConflicts, resEnd, resStart, type CompletionInput, type VehicleInput, type VehicleReservation, type VehicleStatus } from "@/lib/vehicle";

const KEY = "hanaworks-demo-v4";

type Role = "user" | "admin";
type Mine = { id: string; code: string };

type State = {
  ga: GaRequest[];
  vehicles: VehicleReservation[];
  meeting: MeetingReservation[];
  rooms: Room[];
  myMeeting: Mine[];
  seal: SealRequest[];
};

export type SealAction =
  | { type: "review"; actor: string }
  | { type: "approve"; actor: string; note?: string }
  | { type: "reject"; actor: string; reason: string }
  | { type: "seal"; actor: string; sealed_date: string; sealed_by: string; certificates_issued: boolean }
  | { type: "cancel"; actor: string };

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; conflicts?: MeetingReservation[] };

type Ctx = State & {
  ready: boolean;
  role: Role;
  setRole: (r: Role) => void;
  notify: (msg: string, error?: boolean) => void;
  resetDemo: () => void;
  ga: GaRequest[];
  gaCreate: (input: GaRequestInput) => GaRequest;
  gaUpdate: (id: string, patch: Partial<GaRequest>) => void;
  gaRemove: (id: string) => void;
  vehicleCreate: (input: VehicleInput) => Result<VehicleReservation>;
  vehicleEdit: (id: string, password: string, patch: Partial<VehicleInput>) => Result;
  vehicleSetStatus: (id: string, status: VehicleStatus) => void;
  vehicleComplete: (id: string, password: string, input: CompletionInput) => Result;
  vehicleRemove: (id: string) => void;
  meetingCreate: (p: MeetingCreate) => Result<{ code: string; count: number }>;
  meetingManage: (id: string, code: string, action: "checkin" | "cancel") => Result;
  meetingCancelSeries: (seriesId: string, code: string) => Result<number>;
  meetingFindByCode: (code: string) => number;
  meetingAdminCancel: (id: string) => void;
  meetingAdminCancelSeries: (seriesId: string) => void;
  meetingSetRoomActive: (roomId: string, active: boolean) => void;
  sealCreate: (input: SealInput) => SealRequest;
  sealAct: (id: string, action: SealAction) => Result;
};

export type MeetingCreate = {
  mode: "single" | "recurring";
  room_id: string;
  title: string;
  organizer_name: string;
  department: string;
  attendee_count: number;
  date: string;
  start: string;
  end: string;
  repeatEnd?: string;
  weekdays?: number[];
};

const StoreContext = createContext<Ctx | null>(null);

function initial(): State {
  const m = seedMeeting();
  return { ga: seedGa(), vehicles: seedVehicles(), meeting: m.list, rooms: seedRooms(), myMeeting: m.mine, seal: seedSeal() };
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ ga: [], vehicles: [], meeting: [], rooms: [], myMeeting: [], seal: [] });
  const [ready, setReady] = useState(false);
  const [role, setRoleState] = useState<Role>("user");
  const [toast, setToast] = useState<{ msg: string; error: boolean; key: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 마운트 후 로드 (SSR 하이드레이션 불일치 방지)
  useEffect(() => {
    let loaded: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw);
      const savedRole = localStorage.getItem(`${KEY}:role`);
      if (savedRole === "admin" || savedRole === "user") setRoleState(savedRole);
    } catch {}
    const s = loaded && Array.isArray(loaded.ga) && Array.isArray(loaded.seal) ? loaded : initial();
    setState({ ...s, meeting: sweepStatuses(s.meeting) });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  // 회의실 자동취소·사용완료 처리 (30초 주기)
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => setState((s) => {
      const m = sweepStatuses(s.meeting);
      return m === s.meeting ? s : { ...s, meeting: m };
    }), 30000);
    return () => clearInterval(t);
  }, [ready]);

  const notify = useCallback((msg: string, error = false) => setToast({ msg, error, key: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      localStorage.setItem(`${KEY}:role`, r);
    } catch {}
  }, []);

  const resetDemo = useCallback(() => setState(initial()), []);

  /* ---------- 총무 업무요청 ---------- */
  const gaCreate = useCallback((input: GaRequestInput) => {
    const row: GaRequest = { ...input, id: uid(), status: "접수", assignee: null, admin_memo: null, completed_at: null, created_at: nowIso(), updated_at: nowIso() };
    setState((s) => ({ ...s, ga: [row, ...s.ga] }));
    return row;
  }, []);
  const gaUpdate = useCallback((id: string, patch: Partial<GaRequest>) => {
    setState((s) => ({ ...s, ga: s.ga.map((r) => (r.id === id ? { ...r, ...patch, updated_at: nowIso() } : r)) }));
  }, []);
  const gaRemove = useCallback((id: string) => setState((s) => ({ ...s, ga: s.ga.filter((r) => r.id !== id) })), []);

  /* ---------- 법인차량 ---------- */
  const vehicleCreate = useCallback((input: VehicleInput): Result<VehicleReservation> => {
    const start = new Date(`${input.start_date}T${input.start_time}`);
    const end = new Date(`${input.end_date}T${input.end_time}`);
    if (!(start < end)) return { ok: false, error: "반납 예정일시는 사용 시작일시보다 이후여야 합니다." };
    if (findConflicts(stateRef.current.vehicles, input.vehicle_number, start, end).length)
      return { ok: false, error: "선택한 차량의 기존 예약 시간과 겹칩니다. 다른 시간대를 선택해주세요." };
    const row: VehicleReservation = { ...input, id: uid(), vehicle_name: "K5", use_date: input.start_date, status: "신청", created_at: nowIso(), updated_at: nowIso() };
    setState((s) => ({ ...s, vehicles: [row, ...s.vehicles] }));
    return { ok: true, data: row };
  }, []);

  const vehicleEdit = useCallback((id: string, password: string, patch: Partial<VehicleInput>): Result => {
    const c = stateRef.current.vehicles.find((x) => x.id === id);
    if (!c || c.status !== "신청") return { ok: false, error: "이미 승인 또는 처리된 예약은 수정할 수 없습니다." };
    if ((c.reservation_password || "") !== password) return { ok: false, error: "비밀번호가 일치하지 않습니다." };
    const next = { ...c, ...patch };
    const start = resStart(next);
    const end = resEnd(next);
    if (!start || !end || !(start < end)) return { ok: false, error: "반납 예정일시는 사용 시작일시보다 이후여야 합니다." };
    if (findConflicts(stateRef.current.vehicles, next.vehicle_number, start, end, id).length) return { ok: false, error: "선택한 차량의 기존 예약 시간과 겹칩니다." };
    setState((s) => ({ ...s, vehicles: s.vehicles.map((x) => (x.id === id ? { ...next, use_date: next.start_date, updated_at: nowIso() } : x)) }));
    return { ok: true };
  }, []);

  const vehicleSetStatus = useCallback((id: string, status: VehicleStatus) => {
    setState((s) => ({ ...s, vehicles: s.vehicles.map((x) => (x.id === id ? { ...x, status, updated_at: nowIso() } : x)) }));
  }, []);

  const vehicleComplete = useCallback((id: string, password: string, input: CompletionInput): Result => {
    const c = stateRef.current.vehicles.find((x) => x.id === id);
    if (!c) return { ok: false, error: "예약 정보를 찾을 수 없습니다." };
    if (c.reservation_password && c.reservation_password !== password) return { ok: false, error: "비밀번호가 일치하지 않습니다." };
    const total = Math.max(0, Number(input.odometer_after || 0) - Number(input.odometer_before || 0));
    setState((s) => ({
      ...s,
      vehicles: s.vehicles.map((x) => (x.id === id ? { ...x, ...input, total_distance: total, status: "사용완료", completed_at: nowIso(), updated_at: nowIso() } : x)),
    }));
    return { ok: true };
  }, []);

  const vehicleRemove = useCallback((id: string) => setState((s) => ({ ...s, vehicles: s.vehicles.filter((x) => x.id !== id) })), []);

  /* ---------- 회의실 ---------- */
  const meetingCreate = useCallback((p: MeetingCreate): Result<{ code: string; count: number }> => {
    const s = stateRef.current;
    const room = s.rooms.find((r) => r.id === p.room_id && r.active);
    if (!room) return { ok: false, error: "선택한 날짜·시간에 예약 가능한 회의실을 선택해주세요." };
    if (p.attendee_count < 1 || p.attendee_count > room.capacity) return { ok: false, error: `이 회의실은 최대 ${room.capacity}명까지 이용 가능합니다.` };
    if (p.end <= p.start) return { ok: false, error: "종료시간은 시작시간보다 늦어야 합니다." };
    const code = randCode();
    const base = { room_id: room.id, title: p.title, organizer_name: p.organizer_name, department: p.department, attendee_count: p.attendee_count, status: "reserved" as const, created_at: nowIso(), updated_at: nowIso(), _code: code };

    if (p.mode === "single") {
      const startIso = localIso(p.date, p.start);
      const endIso = localIso(p.date, p.end);
      const conflicts = conflictsFor(s.meeting, room.id, startIso, endIso);
      if (conflicts.length) return { ok: false, error: "이미 예약된 시간입니다. 다른 시간이나 회의실을 선택해주세요.", conflicts };
      const row: MeetingReservation = { ...base, id: uid(), start_at: startIso, end_at: endIso, series_id: null, recurrence_label: null };
      setState((st) => ({ ...st, meeting: [...st.meeting, row], myMeeting: [{ id: row.id, code }, ...st.myMeeting] }));
      return { ok: true, data: { code, count: 1 } };
    }

    const weekdays = new Set(p.weekdays ?? []);
    if (!p.repeatEnd || weekdays.size === 0) return { ok: false, error: "반복 종료일과 요일을 선택해주세요." };
    if (p.repeatEnd < p.date) return { ok: false, error: "반복 종료일은 시작일 이후로 선택해주세요." };
    const dates = recurrenceDates(p.date, p.repeatEnd, weekdays, addDays);
    if (!dates.length) return { ok: false, error: "선택한 기간에 해당 요일이 없습니다." };
    const conflicts = dates.flatMap((d) => conflictsFor(s.meeting, room.id, localIso(d, p.start), localIso(d, p.end)));
    if (conflicts.length) return { ok: false, error: `기간 중 기존 예약 ${conflicts.length}건과 겹쳐 장기예약 전체가 생성되지 않았습니다.`, conflicts };
    const seriesId = uid();
    const rows: MeetingReservation[] = dates.map((d) => ({ ...base, id: uid(), start_at: localIso(d, p.start), end_at: localIso(d, p.end), series_id: seriesId, recurrence_label: `${p.date} ~ ${p.repeatEnd}` }));
    setState((st) => ({ ...st, meeting: [...st.meeting, ...rows], myMeeting: [...rows.map((r) => ({ id: r.id, code })), ...st.myMeeting] }));
    return { ok: true, data: { code, count: rows.length } };
  }, []);

  const meetingManage = useCallback((id: string, code: string, action: "checkin" | "cancel"): Result => {
    const r = stateRef.current.meeting.find((x) => x.id === id);
    if (!r || r._code !== code) return { ok: false, error: "예약코드가 일치하지 않습니다." };
    if (!isActive(r)) return { ok: false, error: "처리할 수 없습니다. 예약 상태를 확인해주세요." };
    const now = Date.now();
    const s = new Date(r.start_at).getTime();
    if (action === "checkin") {
      if (r.status !== "reserved") return { ok: false, error: "이미 사용 확인된 예약입니다." };
      if (now < s) return { ok: false, error: "예약 시작 시각부터 사용 확인이 가능합니다." };
      if (now > s + MEETING_CONFIG.checkinGraceMinutes * 60000) return { ok: false, error: "사용 확인 가능 시간이 지났습니다." };
    }
    setState((st) => ({
      ...st,
      meeting: st.meeting.map((x) =>
        x.id === id
          ? action === "checkin"
            ? { ...x, status: "checked_in", checked_in_at: nowIso(), updated_at: nowIso() }
            : { ...x, status: "cancelled", cancelled_at: nowIso(), cancel_reason: "user_cancelled", updated_at: nowIso() }
          : x,
      ),
    }));
    return { ok: true };
  }, []);

  const meetingCancelSeries = useCallback((seriesId: string, code: string): Result<number> => {
    const items = stateRef.current.meeting.filter((x) => x.series_id === seriesId);
    if (!items.length || items[0]._code !== code) return { ok: false, error: "예약코드가 일치하지 않습니다." };
    const now = Date.now();
    const targets = items.filter((x) => isActive(x) && new Date(x.end_at).getTime() > now).map((x) => x.id);
    setState((st) => ({
      ...st,
      meeting: st.meeting.map((x) => (targets.includes(x.id) ? { ...x, status: "cancelled", cancelled_at: nowIso(), cancel_reason: "series_cancelled", updated_at: nowIso() } : x)),
    }));
    return { ok: true, data: targets.length };
  }, []);

  const meetingFindByCode = useCallback((code: string) => {
    const found = stateRef.current.meeting.filter((r) => r._code === code);
    if (found.length)
      setState((st) => {
        const ids = new Set(st.myMeeting.map((m) => m.id));
        return { ...st, myMeeting: [...found.filter((f) => !ids.has(f.id)).map((f) => ({ id: f.id, code })), ...st.myMeeting] };
      });
    return found.length;
  }, []);

  const meetingAdminCancel = useCallback((id: string) => {
    setState((st) => ({ ...st, meeting: st.meeting.map((x) => (x.id === id ? { ...x, status: "cancelled", cancelled_at: nowIso(), cancel_reason: "admin_cancelled", updated_at: nowIso() } : x)) }));
  }, []);
  const meetingAdminCancelSeries = useCallback((seriesId: string) => {
    const now = Date.now();
    setState((st) => ({
      ...st,
      meeting: st.meeting.map((x) =>
        x.series_id === seriesId && isActive(x) && new Date(x.end_at).getTime() > now ? { ...x, status: "cancelled", cancelled_at: nowIso(), cancel_reason: "admin_series_cancelled", updated_at: nowIso() } : x,
      ),
    }));
  }, []);
  const meetingSetRoomActive = useCallback((roomId: string, active: boolean) => {
    setState((st) => ({ ...st, rooms: st.rooms.map((r) => (r.id === roomId ? { ...r, active } : r)) }));
  }, []);

  /* ---------- 인장 날인 ---------- */
  const sealCreate = useCallback((input: SealInput) => {
    const today = todayStr();
    const at = nowIso();
    const row: SealRequest = {
      ...input,
      id: uid(),
      request_no: nextRequestNo(stateRef.current.seal, today),
      requested_at: today,
      attachments: [],
      status: "접수",
      history: [{ at, action: "신청 접수", actor: input.requester_name }],
      created_at: at,
      updated_at: at,
    };
    setState((s) => ({ ...s, seal: [row, ...s.seal] }));
    return row;
  }, []);

  /** 상태 전이 규칙 — 승인(결재 완료)과 날인완료(실제 날인)는 별도 단계 */
  const sealAct = useCallback((id: string, a: SealAction): Result => {
    const r = stateRef.current.seal.find((x) => x.id === id);
    if (!r) return { ok: false, error: "신청 정보를 찾을 수 없습니다." };
    const allowed: Record<SealAction["type"], SealStatus[]> = {
      review: ["접수"],
      approve: ["접수", "검토중"],
      reject: ["접수", "검토중"],
      seal: ["승인"],
      cancel: ["접수", "검토중", "승인"],
    };
    if (!allowed[a.type].includes(r.status)) return { ok: false, error: `현재 상태(${r.status})에서는 처리할 수 없습니다.` };
    if (a.type === "reject" && !a.reason.trim()) return { ok: false, error: "반려 사유를 입력해주세요." };
    if (a.type === "seal" && (!a.sealed_date || !a.sealed_by.trim())) return { ok: false, error: "실제 날인 일자와 처리자를 입력해주세요." };
    const at = nowIso();
    const patch: Partial<SealRequest> =
      a.type === "review"
        ? { status: "검토중", handler: a.actor }
        : a.type === "approve"
          ? { status: "승인", approved_at: at, handler: r.handler ?? a.actor }
          : a.type === "reject"
            ? { status: "반려", reject_reason: a.reason.trim() }
            : a.type === "seal"
              ? { status: "날인완료", sealed_date: a.sealed_date, sealed_by: a.sealed_by.trim(), certificates_issued: a.certificates_issued }
              : { status: "취소" };
    const label = { review: "검토 시작", approve: "승인", reject: "반려", seal: "날인 완료", cancel: "신청 취소" }[a.type];
    const note = a.type === "reject" ? a.reason.trim() : a.type === "approve" ? a.note : a.type === "seal" ? `날인일 ${a.sealed_date}${a.certificates_issued ? " · 증명서 발급 완료" : ""}` : undefined;
    setState((s) => ({
      ...s,
      // 이력은 추가만 가능 (수정·삭제 없음)
      seal: s.seal.map((x) => (x.id === id ? { ...x, ...patch, history: [...x.history, { at, action: label, actor: a.actor, note }], updated_at: at } : x)),
    }));
    return { ok: true };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      role,
      setRole,
      notify,
      resetDemo,
      gaCreate,
      gaUpdate,
      gaRemove,
      vehicleCreate,
      vehicleEdit,
      vehicleSetStatus,
      vehicleComplete,
      vehicleRemove,
      meetingCreate,
      meetingManage,
      meetingCancelSeries,
      meetingFindByCode,
      meetingAdminCancel,
      meetingAdminCancelSeries,
      meetingSetRoomActive,
      sealCreate,
      sealAct,
    }),
    [state, ready, role, setRole, notify, resetDemo, gaCreate, gaUpdate, gaRemove, vehicleCreate, vehicleEdit, vehicleSetStatus, vehicleComplete, vehicleRemove, meetingCreate, meetingManage, meetingCancelSeries, meetingFindByCode, meetingAdminCancel, meetingAdminCancelSeries, meetingSetRoomActive, sealCreate, sealAct],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex justify-center px-4 md:bottom-8" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              className={`pointer-events-auto max-w-md rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_40px_-16px_rgb(15_31_27/0.5)] ${toast.error ? "bg-rose-600" : "bg-ink"}`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StoreContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useDemo must be used within DemoStoreProvider");
  return ctx;
}
