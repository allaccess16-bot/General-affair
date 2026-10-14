/**
 * 새 통합 DB(Supabase) 연결 계층
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되면 화면이 이 계층을 통해 실제 DB를 사용합니다.
 * 설정이 없으면 브라우저 데모 저장소로 동작합니다 (components/providers/demo-store.tsx).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GaRequest, GaRequestInput } from "@/lib/ga";
import { localIso, type MeetingReservation, type Room } from "@/lib/meeting";
import type { SealHistory, SealInput, SealRequest } from "@/lib/seal";
import type { CompletionInput, VehicleInput, VehicleReservation, VehicleStatus } from "@/lib/vehicle";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const LIVE = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
export function db() {
  // 로그인 세션은 브라우저에 보관하고 자동 갱신 → 모든 조회·저장이 로그인한 직원 권한(RLS)으로 실행
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "hanaworks-auth" } });
  return client;
}

export type LiveData = { ga: GaRequest[]; vehicles: VehicleReservation[]; meeting: MeetingReservation[]; rooms: Room[]; seal: SealRequest[] };

/** DB 오류 → 사용자 메시지 */
const FRIENDLY: [RegExp, string][] = [
  [/Invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않습니다."],
  [/User already registered|already been registered/i, "이미 가입된 이메일입니다. 로그인해주세요."],
  [/Password should be at least (\d+)/i, "비밀번호는 $1자 이상이어야 합니다."],
  [/Email not confirmed/i, "메일 인증이 완료되지 않았습니다. 받은 메일의 인증 링크를 눌러주세요."],
  [/EMAIL_DOMAIN_NOT_ALLOWED|Database error saving new user/i, "가입할 수 없는 메일 주소입니다. 회사 메일로 가입해주세요."],
  [/rate limit/i, "요청이 많아 잠시 후 다시 시도해주세요."],
  [/Unable to validate email address|invalid format/i, "이메일 형식이 올바르지 않습니다."],
  [/NOT_AUTHORIZED|JWT expired|permission denied/i, "로그인 후 관리자 승인을 받은 직원만 이용할 수 있습니다. 다시 로그인해주세요."],
  [/NOT_ADMIN/, "이 업무의 관리자 권한이 필요합니다."],
  [/NOT_OWNER: (.*)/, "$1"],
  [/LAST_ADMIN: (.*)/, "$1"],
  [/PROFILE_REQUIRED: (.*)/, "$1"],
  [/row-level security/i, "권한이 없어 저장할 수 없습니다."],
  [/meeting_no_overlap|RESERVATION_CONFLICT/, "이미 예약된 시간입니다. 다른 시간이나 회의실을 선택해주세요."],
  [/RECURRING_CONFLICT/, "기간 중 다른 예약이 먼저 등록되어 장기예약 전체가 생성되지 않았습니다."],
  [/vehicle_no_overlap|VEHICLE_CONFLICT/, "선택한 차량의 기존 예약 시간과 겹칩니다. 다른 시간대를 선택해주세요."],
  [/meeting_slot_unit/, "예약은 30분 단위로만 가능합니다."],
  [/meeting_business_hours/, "운영시간(08:00–20:00) 안에서만 예약할 수 있습니다."],
  [/CAPACITY_EXCEEDED: (.*)/, "$1"],
  [/ROOM_INACTIVE/, "운영 중지된 회의실입니다."],
  [/INVALID_CODE/, "예약코드가 일치하지 않습니다."],
  [/CHECKIN_TOO_EARLY/, "예약 시작 시각부터 사용 확인이 가능합니다."],
  [/CHECKIN_EXPIRED/, "사용 확인 가능 시간이 지났습니다."],
  [/ALREADY_CHECKED_IN/, "이미 사용 확인된 예약입니다."],
  [/NOT_ACTIVE/, "처리할 수 없습니다. 예약 상태를 확인해주세요."],
  [/seal_approval_evidence/, "사전 승인 증빙(결재문서 번호 또는 승인 증빙 내용)을 입력해주세요."],
  [/seal_reject_reason/, "반려 사유를 입력해주세요."],
  [/seal_sealed_info/, "실제 날인 일자와 처리자를 입력해주세요."],
  [/NOT_APPROVED/, "승인 완료 건만 날인 처리할 수 있습니다."],
  [/INVALID_STATE: (.*)/, "현재 상태($1)에서는 처리할 수 없습니다."],
  [/vehicle_time_order|meeting_time_order/, "종료(반납) 시각은 시작 시각보다 늦어야 합니다."],
  [/Failed to fetch|NetworkError|fetch failed/i, "DB 서버에 연결할 수 없습니다. 네트워크를 확인해주세요."],
];

export function friendly(e: unknown) {
  const msg = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  for (const [re, text] of FRIENDLY) {
    const m = msg.match(re);
    if (m) return text.replace("$1", m[1] ?? "");
  }
  const tail = msg.match(/^[A-Z_]+: (.+)$/);
  return tail ? tail[1] : msg || "처리 중 오류가 발생했습니다.";
}

async function q<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

/** Supabase API는 한 번에 최대 1,000건만 돌려주므로 1,000건씩 나눠 끝까지 읽는다 */
const PAGE = 1000;
type Ranged<T> = { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> };
async function all<T>(build: () => Ranged<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await q<T[]>(build().range(from, from + PAGE - 1));
    out.push(...(rows ?? []));
    if (!rows || rows.length < PAGE) return out;
  }
}

/* ------------------------------ 조회 ------------------------------ */
export async function loadAll(): Promise<LiveData> {
  const s = db();
  const [ga, vehicles, meeting, rooms, seal, history] = await Promise.all([
    all(() =>
      s
        .schema("ga")
        .from("requests")
        .select("id,request_date,title,description,requester_name,department,contact,location,category,urgency,status,assignee,admin_memo,completed_at,created_by,created_at,updated_at")
        .order("created_at", { ascending: false })
        .order("id"),
    ),
    all(() =>
      s
        .schema("vehicle")
        .from("reservations_legacy")
        .select(
          "id,vehicle_name,vehicle_number,use_date,start_date,start_time,end_date,end_time,applicant,department,contact,driver,purpose,destination,status,complete_department,complete_name,odometer_before,odometer_after,total_distance,fuel_cost,parking_cost,etc_cost,complete_memo,completed_at,created_by,created_at,updated_at",
        )
        .order("start_at", { ascending: false })
        .order("id"),
    ),
    all(() =>
      s
        .schema("meeting")
        .from("reservations_public")
        .select("id,room_id,title,organizer_name,department,attendee_count,start_at,end_at,status,series_id,recurrence_label,checked_in_at,cancelled_at,cancel_reason,created_at,updated_at")
        .order("start_at")
        .order("id"),
    ),
    q(s.schema("meeting").from("rooms").select("id,floor,name,capacity,location,sort_order,active").order("floor").order("sort_order")),
    all(() => s.schema("seal").from("requests").select("*").order("created_at", { ascending: false }).order("id")),
    all(() => s.schema("seal").from("request_history").select("request_id,at,action,actor,note").order("at").order("id")),
  ]);

  const hist = new Map<string, SealHistory[]>();
  for (const h of history as { request_id: string; at: string; action: string; actor: string; note: string | null }[]) {
    if (!hist.has(h.request_id)) hist.set(h.request_id, []);
    hist.get(h.request_id)!.push({ at: h.at, action: h.action, actor: h.actor, note: h.note ?? undefined });
  }

  return {
    ga: (ga as Omit<GaRequest, "edit_password">[]).map((r) => ({ ...r, edit_password: "" })),
    vehicles: (vehicles as Omit<VehicleReservation, "reservation_password">[]).map((r) => ({ ...r, reservation_password: "" })),
    meeting: (meeting as Omit<MeetingReservation, "_code">[]).map((r) => ({ ...r, _code: "" })),
    rooms: rooms as Room[],
    seal: (seal as Omit<SealRequest, "attachments" | "history">[]).map((r) => ({ ...r, attachments: [], history: hist.get(r.id) ?? [] })),
  };
}

/* ------------------------------ 총무 ------------------------------ */
export async function gaCreate(input: GaRequestInput) {
  await q(s().schema("ga").from("requests").insert({ ...input, status: "접수" }));
}
export async function gaUpdate(id: string, patch: Partial<GaRequest>) {
  const { status, assignee, admin_memo, completed_at } = patch;
  await q(s().schema("ga").from("requests").update({ status, assignee, admin_memo, completed_at }).eq("id", id));
}
export async function gaEdit(id: string, password: string, p: { title: string; description: string; location: string }) {
  await q(s().schema("ga").rpc("edit_request", { p_id: id, p_password: password, p_title: p.title, p_description: p.description, p_location: p.location }));
}
export async function gaRemove(id: string) {
  await q(s().schema("ga").from("requests").delete().eq("id", id));
}

/* ------------------------------ 차량 ------------------------------ */
const seoulTs = (date: string, time: string) => `${date}T${time}:00+09:00`;

export async function vehicleCreate(f: VehicleInput) {
  await q(
    s()
      .schema("vehicle")
      .rpc("create_reservation", {
        p_vehicle_number: f.vehicle_number,
        p_start_at: seoulTs(f.start_date, f.start_time),
        p_end_at: seoulTs(f.end_date, f.end_time),
        p_applicant: f.applicant,
        p_department: f.department,
        p_contact: f.contact,
        p_driver: f.driver,
        p_password: f.reservation_password,
        p_purpose: f.purpose,
        p_destination: f.destination,
      }),
  );
}
export async function vehicleEdit(id: string, password: string, f: Partial<VehicleInput>) {
  await q(
    s()
      .schema("vehicle")
      .rpc("update_reservation", {
        p_id: id,
        p_password: password,
        p_vehicle_number: f.vehicle_number,
        p_start_at: seoulTs(f.start_date!, f.start_time!),
        p_end_at: seoulTs(f.end_date!, f.end_time!),
        p_purpose: f.purpose,
        p_destination: f.destination,
        p_driver: f.driver,
        p_contact: f.contact,
      }),
  );
}
export async function vehicleSetStatus(id: string, status: VehicleStatus) {
  await q(s().schema("vehicle").from("reservations").update({ status }).eq("id", id));
}
export async function vehicleComplete(id: string, password: string, c: CompletionInput) {
  await q(
    s()
      .schema("vehicle")
      .rpc("complete_reservation", {
        p_id: id,
        p_password: password,
        p_complete_department: c.complete_department,
        p_complete_name: c.complete_name,
        p_odometer_before: c.odometer_before,
        p_odometer_after: c.odometer_after,
        p_fuel_cost: c.fuel_cost ?? 0,
        p_parking_cost: c.parking_cost ?? 0,
        p_etc_cost: c.etc_cost ?? 0,
        p_memo: c.complete_memo ?? "",
      }),
  );
}
export async function vehicleRemove(id: string) {
  await q(s().schema("vehicle").from("reservations").delete().eq("id", id));
}

/* ------------------------------ 회의실 ------------------------------ */
type Base = { room_id: string; title: string; organizer_name: string; department: string; attendee_count: number };

export async function meetingCreateSingle(b: Base, date: string, start: string, end: string, code: string) {
  const id = await q<string>(
    s()
      .schema("meeting")
      .rpc("create_reservation", {
        p_room_id: b.room_id,
        p_title: b.title,
        p_organizer_name: b.organizer_name,
        p_department: b.department,
        p_attendee_count: b.attendee_count,
        p_start_at: localIso(date, start),
        p_end_at: localIso(date, end),
        p_manage_code: code,
      }),
  );
  return [id];
}

type RecurringResult =
  | { status: "created"; created_ids: string[]; created_count: number }
  | { status: "conflict"; conflict_count: number; conflicts: { start_at: string; end_at: string; department: string; organizer_name: string; title: string }[] };

export async function meetingCreateRecurring(b: Base, date: string, repeatEnd: string, weekdays: number[], start: string, end: string, code: string) {
  return q<RecurringResult>(
    s()
      .schema("meeting")
      .rpc("create_recurring_reservations", {
        p_room_id: b.room_id,
        p_title: b.title,
        p_organizer_name: b.organizer_name,
        p_department: b.department,
        p_attendee_count: b.attendee_count,
        p_start_date: date,
        p_end_date: repeatEnd,
        p_weekdays: weekdays,
        p_start_time: start,
        p_end_time: end,
        p_manage_code: code,
      }),
  );
}

export async function meetingManage(id: string, code: string, action: "checkin" | "cancel") {
  await q(s().schema("meeting").rpc("manage_reservation", { p_reservation_id: id, p_manage_code: code, p_action: action }));
}
export async function meetingCancelSeries(seriesId: string, code: string) {
  return q<number>(s().schema("meeting").rpc("manage_reservation_series", { p_series_id: seriesId, p_manage_code: code }));
}
export async function meetingFindByCode(code: string) {
  return q<string[]>(s().schema("meeting").rpc("find_reservations_by_code", { p_manage_code: code }));
}
export async function meetingAdminCancel(id: string) {
  await q(s().schema("meeting").rpc("admin_cancel_reservation", { p_reservation_id: id }));
}
export async function meetingAdminCancelSeries(seriesId: string) {
  await q(s().schema("meeting").rpc("admin_cancel_series", { p_series_id: seriesId }));
}
export async function meetingSetRoomActive(roomId: string, active: boolean) {
  await q(s().schema("meeting").from("rooms").update({ active }).eq("id", roomId));
}

/* ------------------------------ 인장 ------------------------------ */
export async function sealCreate(input: SealInput) {
  const rows = await q<{ request_no: string }[]>(s().schema("seal").from("requests").insert(input).select("request_no"));
  return rows[0]?.request_no ?? "";
}

export async function sealTransition(
  id: string,
  action: string,
  actor: string,
  extra: { reason?: string; sealed_date?: string; sealed_by?: string; certificates_issued?: boolean } = {},
) {
  await q(
    s()
      .schema("seal")
      .rpc("transition", {
        p_id: id,
        p_action: action,
        p_actor: actor,
        p_reason: extra.reason ?? null,
        p_sealed_date: extra.sealed_date ?? null,
        p_sealed_by: extra.sealed_by ?? null,
        p_certificates_issued: extra.certificates_issued ?? false,
      }),
  );
}

function s() {
  return db();
}

/* ------------------------------ 로그인 · 직원 ------------------------------ */
export type ModuleKeyDb = "ga" | "vehicle" | "meeting" | "seal";
export type Profile = {
  id: string;
  email: string;
  name: string;
  department: string;
  contact: string;
  role: "user" | "admin";
  /** 비어 있으면 전 모듈 관리자(최고관리자) */
  admin_modules: ModuleKeyDb[];
  status: "pending" | "active" | "disabled";
  approved_at: string | null;
  created_at: string;
};
export type SignUpInput = { email: string; password: string; name: string; department: string; contact: string };
const PROFILE_COLS = "id,email,name,department,contact,role,admin_modules,status,approved_at,created_at";

export async function authSession() {
  const { data } = await s().auth.getSession();
  return data.session;
}
export function onAuthChange(cb: () => void) {
  const { data } = s().auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}
export async function signIn(email: string, password: string) {
  const { error } = await s().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
/** 반환: 바로 로그인되면 true, 메일 인증이 필요하면 false */
export async function signUp(i: SignUpInput) {
  const { data, error } = await s().auth.signUp({
    email: i.email.trim(),
    password: i.password,
    options: { data: { name: i.name.trim(), department: i.department, contact: i.contact.trim() } },
  });
  if (error) throw error;
  return Boolean(data.session);
}
export async function signOut() {
  await s().auth.signOut();
}
export async function myProfile(): Promise<Profile | null> {
  const session = await authSession();
  if (!session) return null;
  const rows = await q<Profile[]>(s().schema("core").from("profiles").select(PROFILE_COLS).eq("id", session.user.id));
  return rows[0] ?? null;
}
export async function updateMyProfile(name: string, department: string, contact: string) {
  await q(s().schema("core").rpc("update_my_profile", { p_name: name, p_department: department, p_contact: contact }));
}
export async function listProfiles() {
  return q<Profile[]>(s().schema("core").from("profiles").select(PROFILE_COLS).order("created_at", { ascending: false }));
}
export async function adminUpdateProfile(id: string, status: Profile["status"], role: Profile["role"], modules: ModuleKeyDb[]) {
  await q(s().schema("core").rpc("admin_update_profile", { p_id: id, p_status: status, p_role: role, p_admin_modules: modules }));
}
export type AuthSettings = { auto_approve: boolean; allowed_email_domains: string[] };
export async function getSettings(): Promise<AuthSettings> {
  const rows = await q<{ key: string; value: unknown }[]>(s().schema("core").from("settings").select("key,value"));
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { auto_approve: m.auto_approve === true, allowed_email_domains: Array.isArray(m.allowed_email_domains) ? (m.allowed_email_domains as string[]) : [] };
}
export async function setSetting(key: keyof AuthSettings, value: unknown) {
  await q(s().schema("core").rpc("admin_set_setting", { p_key: key, p_value: value }));
}
/** 가입 화면용 부서 목록 (로그인 전 조회 가능) */
export async function listDepartments() {
  const rows = await q<{ name: string }[]>(s().schema("core").from("departments").select("name").order("sort_order"));
  return rows.map((r) => r.name);
}
/** 로그인 직원 본인이 만든 회의실 예약 */
export async function myMeetingIds() {
  return q<string[]>(s().schema("meeting").rpc("my_reservation_ids"));
}
