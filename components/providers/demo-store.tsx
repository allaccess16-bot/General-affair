"use client";

/**
 * 업무 데이터 저장소
 *  - 실DB 모드: NEXT_PUBLIC_SUPABASE_URL·ANON_KEY 설정 시 새 통합 DB(Supabase)를 읽고 씁니다 (lib/db/live.ts).
 *    중복예약·상태 전이·신청번호는 DB가 검증하며, 20초마다 다시 읽어 다른 사용자의 변경을 반영합니다.
 *  - 데모 모드: 설정이 없으면 기존 3개 시스템의 구조·규칙을 브라우저(localStorage)에서 재현합니다.
 * 화면은 모드와 관계없이 같은 action(모두 Promise<Result>)을 호출합니다.
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
import * as live from "@/lib/db/live";

const LIVE_MINE_KEY = "hanaworks-live-my-meeting";

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

type P<T = unknown> = Promise<Result<T>>;

type Ctx = State & {
  ready: boolean;
  /** 새 통합 DB 연결 여부 (false면 데모 모드) */
  live: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  role: Role;
  setRole: (r: Role) => void;
  notify: (msg: string, error?: boolean) => void;
  resetDemo: () => void;
  gaCreate: (input: GaRequestInput) => P;
  gaUpdate: (id: string, patch: Partial<GaRequest>) => P;
  gaEdit: (id: string, password: string, patch: { title: string; description: string; location: string }) => P;
  gaRemove: (id: string) => P;
  vehicleCreate: (input: VehicleInput) => P;
  vehicleEdit: (id: string, password: string, patch: Partial<VehicleInput>) => P;
  vehicleSetStatus: (id: string, status: VehicleStatus) => P;
  vehicleComplete: (id: string, password: string, input: CompletionInput) => P;
  vehicleRemove: (id: string) => P;
  meetingCreate: (p: MeetingCreate) => P<{ code: string; count: number }>;
  meetingManage: (id: string, code: string, action: "checkin" | "cancel") => P;
  meetingCancelSeries: (seriesId: string, code: string) => P<number>;
  meetingFindByCode: (code: string) => P<number>;
  meetingAdminCancel: (id: string) => P;
  meetingAdminCancelSeries: (seriesId: string) => P;
  meetingSetRoomActive: (roomId: string, active: boolean) => P;
  /** 성공 시 data = 신청번호 */
  sealCreate: (input: SealInput) => P<string>;
  sealAct: (id: string, action: SealAction) => P;
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

  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!live.LIVE) return;
    try {
      const data = await live.loadAll();
      setState((s) => ({ ...s, ...data }));
      setLoadError(null);
    } catch (e) {
      setLoadError(live.friendly(e));
    }
  }, []);

  // 마운트 후 로드 (SSR 하이드레이션 불일치 방지)
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem(`${KEY}:role`);
      if (savedRole === "admin" || savedRole === "user") setRoleState(savedRole);
    } catch {}
    if (live.LIVE) {
      let mine: Mine[] = [];
      try {
        mine = JSON.parse(localStorage.getItem(LIVE_MINE_KEY) || "[]");
      } catch {}
      setState((s) => ({ ...s, myMeeting: Array.isArray(mine) ? mine : [] }));
      reload().finally(() => setReady(true));
      return;
    }
    let loaded: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {}
    const s = loaded && Array.isArray(loaded.ga) && Array.isArray(loaded.seal) ? loaded : initial();
    setState({ ...s, meeting: sweepStatuses(s.meeting) });
    setReady(true);
  }, [reload]);

  // 저장: 데모는 전체, 실DB는 '내 예약 코드'만 이 기기에 보관
  useEffect(() => {
    if (!ready) return;
    try {
      if (live.LIVE) localStorage.setItem(LIVE_MINE_KEY, JSON.stringify(state.myMeeting.slice(0, 2000)));
      else localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  // 데모: 회의실 자동취소·사용완료 (30초) / 실DB: 다른 사용자 변경 반영 (20초, 서버 pg_cron이 상태 전환)
  useEffect(() => {
    if (!ready) return;
    const t = live.LIVE
      ? setInterval(() => !document.hidden && reload(), 20000)
      : setInterval(() => setState((s) => {
          const m = sweepStatuses(s.meeting);
          return m === s.meeting ? s : { ...s, meeting: m };
        }), 30000);
    return () => clearInterval(t);
  }, [ready, reload]);

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
  const d_gaCreate = useCallback((input: GaRequestInput) => {
    const row: GaRequest = { ...input, id: uid(), status: "접수", assignee: null, admin_memo: null, completed_at: null, created_at: nowIso(), updated_at: nowIso() };
    setState((s) => ({ ...s, ga: [row, ...s.ga] }));
    return row;
  }, []);
  const d_gaUpdate = useCallback((id: string, patch: Partial<GaRequest>) => {
    setState((s) => ({ ...s, ga: s.ga.map((r) => (r.id === id ? { ...r, ...patch, updated_at: nowIso() } : r)) }));
  }, []);
  const d_gaRemove = useCallback((id: string) => setState((s) => ({ ...s, ga: s.ga.filter((r) => r.id !== id) })), []);

  /* ---------- 법인차량 ---------- */
  const d_vehicleCreate = useCallback((input: VehicleInput): Result<VehicleReservation> => {
    const start = new Date(`${input.start_date}T${input.start_time}`);
    const end = new Date(`${input.end_date}T${input.end_time}`);
    if (!(start < end)) return { ok: false, error: "반납 예정일시는 사용 시작일시보다 이후여야 합니다." };
    if (findConflicts(stateRef.current.vehicles, input.vehicle_number, start, end).length)
      return { ok: false, error: "선택한 차량의 기존 예약 시간과 겹칩니다. 다른 시간대를 선택해주세요." };
    const row: VehicleReservation = { ...input, id: uid(), vehicle_name: "K5", use_date: input.start_date, status: "신청", created_at: nowIso(), updated_at: nowIso() };
    setState((s) => ({ ...s, vehicles: [row, ...s.vehicles] }));
    return { ok: true, data: row };
  }, []);

  const d_vehicleEdit = useCallback((id: string, password: string, patch: Partial<VehicleInput>): Result => {
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

  const d_vehicleSetStatus = useCallback((id: string, status: VehicleStatus) => {
    setState((s) => ({ ...s, vehicles: s.vehicles.map((x) => (x.id === id ? { ...x, status, updated_at: nowIso() } : x)) }));
  }, []);

  const d_vehicleComplete = useCallback((id: string, password: string, input: CompletionInput): Result => {
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

  const d_vehicleRemove = useCallback((id: string) => setState((s) => ({ ...s, vehicles: s.vehicles.filter((x) => x.id !== id) })), []);

  /* ---------- 회의실 ---------- */
  const d_meetingCreate = useCallback((p: MeetingCreate): Result<{ code: string; count: number }> => {
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

  const d_meetingManage = useCallback((id: string, code: string, action: "checkin" | "cancel"): Result => {
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

  const d_meetingCancelSeries = useCallback((seriesId: string, code: string): Result<number> => {
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

  const d_meetingFindByCode = useCallback((code: string) => {
    const found = stateRef.current.meeting.filter((r) => r._code === code);
    if (found.length)
      setState((st) => {
        const ids = new Set(st.myMeeting.map((m) => m.id));
        return { ...st, myMeeting: [...found.filter((f) => !ids.has(f.id)).map((f) => ({ id: f.id, code })), ...st.myMeeting] };
      });
    return found.length;
  }, []);

  const d_meetingAdminCancel = useCallback((id: string) => {
    setState((st) => ({ ...st, meeting: st.meeting.map((x) => (x.id === id ? { ...x, status: "cancelled", cancelled_at: nowIso(), cancel_reason: "admin_cancelled", updated_at: nowIso() } : x)) }));
  }, []);
  const d_meetingAdminCancelSeries = useCallback((seriesId: string) => {
    const now = Date.now();
    setState((st) => ({
      ...st,
      meeting: st.meeting.map((x) =>
        x.series_id === seriesId && isActive(x) && new Date(x.end_at).getTime() > now ? { ...x, status: "cancelled", cancelled_at: nowIso(), cancel_reason: "admin_series_cancelled", updated_at: nowIso() } : x,
      ),
    }));
  }, []);
  const d_meetingSetRoomActive = useCallback((roomId: string, active: boolean) => {
    setState((st) => ({ ...st, rooms: st.rooms.map((r) => (r.id === roomId ? { ...r, active } : r)) }));
  }, []);

  /* ---------- 인장 날인 ---------- */
  const d_sealCreate = useCallback((input: SealInput) => {
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
  const d_sealAct = useCallback((id: string, a: SealAction): Result => {
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

  /* ======================= 공개 action (데모 / 실DB) ======================= */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<Result<T>> => {
      try {
        const data = await fn();
        await reload();
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: live.friendly(e) };
      }
    },
    [reload],
  );
  const done = <T = unknown,>(data?: T): Promise<Result<T>> => Promise.resolve({ ok: true, data });
  const addMine = useCallback((ids: string[], code: string) => setState((s) => ({ ...s, myMeeting: [...ids.map((id) => ({ id, code })), ...s.myMeeting.filter((m) => !ids.includes(m.id))] })), []);

  const api = useMemo(() => {
    if (!live.LIVE)
      return {
        gaCreate: (i: GaRequestInput) => (d_gaCreate(i), done()),
        gaUpdate: (id: string, p: Partial<GaRequest>) => (d_gaUpdate(id, p), done()),
        gaEdit: (id: string, pw: string, p: { title: string; description: string; location: string }) => {
          const r = stateRef.current.ga.find((x) => x.id === id);
          if (!r) return Promise.resolve<Result>({ ok: false, error: "요청 정보를 찾을 수 없습니다." });
          if ((r.edit_password || "") !== pw) return Promise.resolve<Result>({ ok: false, error: "비밀번호가 일치하지 않습니다." });
          d_gaUpdate(id, p);
          return done();
        },
        gaRemove: (id: string) => (d_gaRemove(id), done()),
        vehicleCreate: async (i: VehicleInput): Promise<Result> => {
          const r = d_vehicleCreate(i);
          return r.ok ? { ok: true } : r;
        },
        vehicleEdit: async (id: string, pw: string, p: Partial<VehicleInput>) => d_vehicleEdit(id, pw, p),
        vehicleSetStatus: (id: string, st: VehicleStatus) => (d_vehicleSetStatus(id, st), done()),
        vehicleComplete: async (id: string, pw: string, c: CompletionInput) => d_vehicleComplete(id, pw, c),
        vehicleRemove: (id: string) => (d_vehicleRemove(id), done()),
        meetingCreate: async (p: MeetingCreate) => d_meetingCreate(p),
        meetingManage: async (id: string, code: string, a: "checkin" | "cancel") => d_meetingManage(id, code, a),
        meetingCancelSeries: async (sid: string, code: string) => d_meetingCancelSeries(sid, code),
        meetingFindByCode: (code: string) => done(d_meetingFindByCode(code)),
        meetingAdminCancel: (id: string) => (d_meetingAdminCancel(id), done()),
        meetingAdminCancelSeries: (sid: string) => (d_meetingAdminCancelSeries(sid), done()),
        meetingSetRoomActive: (rid: string, a: boolean) => (d_meetingSetRoomActive(rid, a), done()),
        sealCreate: (i: SealInput) => done(d_sealCreate(i).request_no),
        sealAct: async (id: string, a: SealAction) => d_sealAct(id, a),
      };
    return {
      gaCreate: (i: GaRequestInput) => run(() => live.gaCreate(i)),
      gaUpdate: (id: string, p: Partial<GaRequest>) => run(() => live.gaUpdate(id, p)),
      gaEdit: (id: string, pw: string, p: { title: string; description: string; location: string }) => run(() => live.gaEdit(id, pw, p)),
      gaRemove: (id: string) => run(() => live.gaRemove(id)),
      vehicleCreate: (i: VehicleInput) => run(() => live.vehicleCreate(i)),
      vehicleEdit: (id: string, pw: string, p: Partial<VehicleInput>) => run(() => live.vehicleEdit(id, pw, p)),
      vehicleSetStatus: (id: string, st: VehicleStatus) => run(() => live.vehicleSetStatus(id, st)),
      vehicleComplete: (id: string, pw: string, c: CompletionInput) => run(() => live.vehicleComplete(id, pw, c)),
      vehicleRemove: (id: string) => run(() => live.vehicleRemove(id)),
      meetingCreate: async (p: MeetingCreate): Promise<Result<{ code: string; count: number }>> => {
        const room = stateRef.current.rooms.find((r) => r.id === p.room_id && r.active);
        if (!room) return { ok: false, error: "선택한 날짜·시간에 예약 가능한 회의실을 선택해주세요." };
        if (p.attendee_count > room.capacity) return { ok: false, error: `이 회의실은 최대 ${room.capacity}명까지 이용 가능합니다.` };
        const code = randCode();
        const base = { room_id: p.room_id, title: p.title, organizer_name: p.organizer_name, department: p.department, attendee_count: p.attendee_count };
        try {
          if (p.mode === "single") {
            const ids = await live.meetingCreateSingle(base, p.date, p.start, p.end, code);
            addMine(ids, code);
            await reload();
            return { ok: true, data: { code, count: 1 } };
          }
          const r = await live.meetingCreateRecurring(base, p.date, p.repeatEnd ?? p.date, p.weekdays ?? [], p.start, p.end, code);
          if (r.status === "conflict") {
            const conflicts = r.conflicts.map((c, i) => ({ ...c, id: `conflict-${i}`, room_id: p.room_id, attendee_count: 0, status: "reserved" as const, series_id: null, recurrence_label: null, created_at: "", updated_at: "", _code: "" }));
            return { ok: false, error: `기간 중 기존 예약 ${r.conflict_count}건과 겹쳐 장기예약 전체가 생성되지 않았습니다.`, conflicts };
          }
          addMine(r.created_ids, code);
          await reload();
          return { ok: true, data: { code, count: r.created_count } };
        } catch (e) {
          return { ok: false, error: live.friendly(e) };
        }
      },
      meetingManage: (id: string, code: string, a: "checkin" | "cancel") => run(() => live.meetingManage(id, code, a)),
      meetingCancelSeries: (sid: string, code: string) => run(() => live.meetingCancelSeries(sid, code)),
      meetingFindByCode: (code: string) =>
        run(async () => {
          const ids = await live.meetingFindByCode(code);
          if (ids.length) addMine(ids, code);
          return ids.length;
        }),
      meetingAdminCancel: (id: string) => run(() => live.meetingAdminCancel(id)),
      meetingAdminCancelSeries: (sid: string) => run(() => live.meetingAdminCancelSeries(sid)),
      meetingSetRoomActive: (rid: string, a: boolean) => run(() => live.meetingSetRoomActive(rid, a)),
      sealCreate: (i: SealInput) => run(() => live.sealCreate(i)),
      sealAct: (id: string, a: SealAction) =>
        run(() =>
          live.sealTransition(id, a.type, a.actor, {
            reason: a.type === "reject" ? a.reason : undefined,
            sealed_date: a.type === "seal" ? a.sealed_date : undefined,
            sealed_by: a.type === "seal" ? a.sealed_by : undefined,
            certificates_issued: a.type === "seal" ? a.certificates_issued : undefined,
          }),
        ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, reload, addMine]);

  const value = useMemo<Ctx>(
    () => ({ ...state, ready, live: live.LIVE, loadError, reload, role, setRole, notify, resetDemo, ...api }),
    [state, ready, loadError, reload, role, setRole, notify, resetDemo, api],
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
