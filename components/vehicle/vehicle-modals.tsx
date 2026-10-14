"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Notice } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { DEPARTMENTS, todayStr, validContact, validFullName } from "@/lib/shared";
import { findConflicts, vehicleLabel, VEHICLES, type CompletionInput, type VehicleInput, type VehicleReservation } from "@/lib/vehicle";

const emptyInput = (date?: string, vehicle?: string): VehicleInput => ({
  vehicle_number: vehicle || VEHICLES[0].number,
  start_date: date || todayStr(),
  start_time: "",
  end_date: date || todayStr(),
  end_time: "",
  applicant: "",
  department: "",
  contact: "",
  driver: "",
  reservation_password: "",
  purpose: "",
  destination: "",
});

/** 일정 검사 — 기존 checkCarDateOnForm 규칙 */
function useScheduleCheck(f: Pick<VehicleInput, "vehicle_number" | "start_date" | "start_time" | "end_date" | "end_time">, excludeId?: string) {
  const { vehicles } = useDemo();
  return useMemo(() => {
    const { start_date: sd, start_time: st, end_date: ed, end_time: et } = f;
    if (!sd || !st || !ed || !et) return { state: "idle" as const, msg: "차량 사용 시작일시와 반납 예정일시를 입력해주세요.", conflicts: [] as VehicleReservation[] };
    const start = new Date(`${sd}T${st}`);
    const end = new Date(`${ed}T${et}`);
    if (!(start < end)) return { state: "invalid" as const, msg: "반납 예정일시는 사용 시작일시보다 이후여야 합니다.", conflicts: [] };
    const conflicts = findConflicts(vehicles, f.vehicle_number, start, end, excludeId);
    if (conflicts.length) return { state: "blocked" as const, msg: "선택한 차량은 입력한 사용시간과 겹치는 예약이 있습니다.", conflicts };
    return { state: "ok" as const, msg: "선택한 차량은 해당 시간대에 예약 신청이 가능합니다.", conflicts: [] };
  }, [f, vehicles, excludeId]);
}

function ScheduleNotice({ check }: { check: ReturnType<typeof useScheduleCheck> }) {
  const tone = check.state === "ok" ? "ok" : check.state === "idle" ? "info" : "error";
  return (
    <Notice tone={tone} className="sm:col-span-2">
      <b>{check.msg}</b>
      {check.conflicts.map((c) => (
        <span key={c.id} className="mt-1 block text-xs">
          · {c.start_date} {c.start_time} ~ {c.end_date} {c.end_time} · {c.department} {c.applicant} ({c.status})
        </span>
      ))}
    </Notice>
  );
}

/** 차량 예약 신청 — 기존 carForm의 3단계 구성과 필수값·검증 규칙 동일 */
export function VehicleFormModal({ open, onClose, initialDate, initialVehicle }: { open: boolean; onClose: () => void; initialDate?: string; initialVehicle?: string }) {
  const { vehicleCreate, notify } = useDemo();
  const [f, setF] = useState<VehicleInput>(emptyInput());
  useEffect(() => {
    if (open) setF(emptyInput(initialDate, initialVehicle));
  }, [open, initialDate, initialVehicle]);
  const set = <K extends keyof VehicleInput>(k: K, v: VehicleInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const check = useScheduleCheck(f);
  const ok =
    (Object.keys(f) as (keyof VehicleInput)[]).every((k) => String(f[k] ?? "").trim().length > 0) &&
    validFullName(f.applicant) &&
    validFullName(f.driver) &&
    validContact(f.contact) &&
    check.state === "ok";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return notify("필수 항목을 모두 정확히 입력해주세요. 이름은 자음만 입력할 수 없습니다.", true);
    const r = await vehicleCreate(f);
    if (!r.ok) return notify(r.error, true);
    notify("차량 배차 신청이 접수되었습니다.");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="COMPANY CAR"
      title="차량 예약 신청"
      description="차량을 선택해 예약하세요. 신청 후 관리자 승인이 필요합니다."
      width="max-w-2xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={ok ? "text-xs font-semibold text-brand-700" : "text-xs font-semibold text-rose-600"}>
            {ok ? "배차 신청이 가능합니다." : "필수 항목을 모두 입력해주세요. 이름은 자음만 입력할 수 없습니다."}
          </p>
          <Button type="submit" form="vehicle-form" disabled={!ok}>
            배차 신청
          </Button>
        </div>
      }
    >
      <form id="vehicle-form" onSubmit={submit} className="space-y-4">
        <FormSection step="STEP 1" title="사용 일정" tone="brand">
          <Field label="차량 선택" required className="sm:col-span-2">
            <select className="input" value={f.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)}>
              {VEHICLES.map((v) => (
                <option key={v.number} value={v.number}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="차량 사용 시작일" required>
            <input type="date" className="input" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </Field>
          <Field label="차량 사용 시작시간" required>
            <input type="time" className="input" value={f.start_time} onChange={(e) => set("start_time", e.target.value)} />
          </Field>
          <Field label="차량 반납 예정일" required>
            <input type="date" className="input" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </Field>
          <Field label="차량 반납 예정시간" required>
            <input type="time" className="input" value={f.end_time} onChange={(e) => set("end_time", e.target.value)} />
          </Field>
          <ScheduleNotice check={check} />
        </FormSection>
        <FormSection step="STEP 2" title="신청자 정보">
          <Field label="신청자" required>
            <input className="input" placeholder="신청자" value={f.applicant} onChange={(e) => set("applicant", e.target.value)} />
          </Field>
          <Field label="부서" required>
            <select className="input" value={f.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">부서 선택</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="연락처/내선" required>
            <input className="input" placeholder="연락처 또는 내선번호" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
          </Field>
          <Field label="운전자" required>
            <input className="input" placeholder="운전자 성명" value={f.driver} onChange={(e) => set("driver", e.target.value)} />
          </Field>
          <Field label="운행기록 작성용 비밀번호" required hint="운행 완료 기록·신청 수정 시 사용합니다." className="sm:col-span-2">
            <input type="password" className="input" placeholder="운행 완료 기록 작성 시 사용" value={f.reservation_password} onChange={(e) => set("reservation_password", e.target.value)} />
          </Field>
        </FormSection>
        <FormSection step="STEP 3" title="사용 정보">
          <Field label="사용 목적" required>
            <input className="input" placeholder="예: 고객사 방문, 외근" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} />
          </Field>
          <Field label="행선지" required>
            <input className="input" placeholder="예: 서울시 중구" value={f.destination} onChange={(e) => set("destination", e.target.value)} />
          </Field>
        </FormSection>
        <Notice tone="warn">같은 시간대에 이미 신청 또는 승인된 예약이 있으면 선택한 차량의 추가 신청이 제한됩니다. 기존 반납시간 이후에는 같은 날에도 신청할 수 있습니다.</Notice>
      </form>
    </Modal>
  );
}

/** 차량 예약 수정 — 승인 전(신청) 건만, 예약 비밀번호 확인 */
export function VehicleEditModal({ c, onClose }: { c: VehicleReservation | null; onClose: () => void }) {
  const { vehicleEdit, notify, live } = useDemo();
  const [f, setF] = useState<VehicleInput>(emptyInput());
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (!c) return;
    setPw("");
    setF({
      vehicle_number: c.vehicle_number,
      start_date: c.start_date || c.use_date,
      start_time: c.start_time,
      end_date: c.end_date || c.use_date,
      end_time: c.end_time,
      applicant: c.applicant,
      department: c.department,
      contact: c.contact,
      driver: c.driver,
      reservation_password: c.reservation_password,
      purpose: c.purpose,
      destination: c.destination,
    });
  }, [c]);
  const set = <K extends keyof VehicleInput>(k: K, v: VehicleInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const check = useScheduleCheck(f, c?.id);
  const submit = async () => {
    if (!c) return;
    if (!f.purpose.trim() || !f.destination.trim() || !f.driver.trim() || !f.contact.trim()) return notify("모든 항목을 입력해주세요.", true);
    const { reservation_password: _omit, ...patch } = f;
    void _omit;
    const r = await vehicleEdit(c.id, pw, patch);
    if (!r.ok) return notify(r.error, true);
    notify("차량 예약 신청 내용이 수정되었습니다.");
    onClose();
  };
  return (
    <Modal open={!!c} onClose={onClose} eyebrow="EDIT" title="차량 예약 수정" description="승인 전 신청 건만 수정할 수 있습니다." tone="plain" width="max-w-2xl" footer={<Button className="w-full" onClick={submit}>수정 반영</Button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="차량" className="sm:col-span-2">
          <select className="input" value={f.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)}>
            {VEHICLES.map((v) => (
              <option key={v.number} value={v.number}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="시작일">
          <input type="date" className="input" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} />
        </Field>
        <Field label="시작시간">
          <input type="time" className="input" value={f.start_time} onChange={(e) => set("start_time", e.target.value)} />
        </Field>
        <Field label="반납일">
          <input type="date" className="input" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </Field>
        <Field label="반납시간">
          <input type="time" className="input" value={f.end_time} onChange={(e) => set("end_time", e.target.value)} />
        </Field>
        <ScheduleNotice check={check} />
        <Field label="사용 목적">
          <input className="input" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} />
        </Field>
        <Field label="행선지">
          <input className="input" value={f.destination} onChange={(e) => set("destination", e.target.value)} />
        </Field>
        <Field label="운전자">
          <input className="input" value={f.driver} onChange={(e) => set("driver", e.target.value)} />
        </Field>
        <Field label="연락처/내선">
          <input className="input" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
        </Field>
        <Field label="예약 시 입력한 비밀번호" required hint={live ? undefined : "데모 데이터의 비밀번호는 1234 입니다."} className="sm:col-span-2">
          <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** 운행 완료 기록 — 차량 사용자가 승인 건에 대해 직접 작성 */
export function VehicleCompleteModal({ c, onClose }: { c: VehicleReservation | null; onClose: () => void }) {
  const { vehicleComplete, notify, live } = useDemo();
  const [f, setF] = useState<CompletionInput>({});
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (!c) return;
    setPw("");
    setF({
      complete_department: c.department,
      complete_name: c.applicant,
      odometer_before: c.odometer_before ?? null,
      odometer_after: c.odometer_after ?? null,
      fuel_cost: c.fuel_cost ?? 0,
      parking_cost: c.parking_cost ?? 0,
      etc_cost: c.etc_cost ?? 0,
      complete_memo: c.complete_memo ?? "",
    });
  }, [c]);
  const set = <K extends keyof CompletionInput>(k: K, v: CompletionInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const dist = Math.max(0, Number(f.odometer_after || 0) - Number(f.odometer_before || 0));
  const num = (v: string) => (v === "" ? null : Number(v));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!c) return;
    if (!f.complete_department || !f.complete_name || f.odometer_before == null || f.odometer_after == null || !pw) return notify("필수 항목을 모두 입력해주세요.", true);
    const r = await vehicleComplete(c.id, pw, { ...f, fuel_cost: Number(f.fuel_cost || 0), parking_cost: Number(f.parking_cost || 0), etc_cost: Number(f.etc_cost || 0) });
    if (!r.ok) return notify(r.error, true);
    notify("운행기록이 저장되었습니다.");
    onClose();
  };
  return (
    <Modal
      open={!!c}
      onClose={onClose}
      eyebrow="DRIVING LOG"
      title="운행 완료 기록"
      description="차량 사용자가 운행 완료 후 직접 작성합니다. 예약 시 입력한 비밀번호가 필요합니다."
      width="max-w-xl"
      footer={
        <Button type="submit" form="complete-form" className="w-full">
          운행기록 저장
        </Button>
      }
    >
      {c && (
        <form id="complete-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Notice className="sm:col-span-2">
            <b>{vehicleLabel(c)}</b> · {c.start_date} {c.start_time} ~ {c.end_date} {c.end_time} · {c.destination}
          </Notice>
          <Field label="부서" required>
            <select className="input" value={f.complete_department ?? ""} onChange={(e) => set("complete_department", e.target.value)}>
              <option value="">부서 선택</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="성명" required>
            <input className="input" value={f.complete_name ?? ""} onChange={(e) => set("complete_name", e.target.value)} />
          </Field>
          <Field label="주행 전 km" required>
            <input type="number" className="input" value={f.odometer_before ?? ""} onChange={(e) => set("odometer_before", num(e.target.value))} />
          </Field>
          <Field label="주행 후 km" required>
            <input type="number" className="input" value={f.odometer_after ?? ""} onChange={(e) => set("odometer_after", num(e.target.value))} />
          </Field>
          <div className="rounded-2xl bg-brand-50 p-4 sm:col-span-2">
            <p className="text-xs text-brand-700">총 주행거리</p>
            <p className="text-3xl font-extrabold text-brand-700 tabular">{dist.toLocaleString("ko-KR")} km</p>
          </div>
          <Field label="유류비">
            <input type="number" className="input" value={f.fuel_cost ?? 0} onChange={(e) => set("fuel_cost", Number(e.target.value))} />
          </Field>
          <Field label="주차비">
            <input type="number" className="input" value={f.parking_cost ?? 0} onChange={(e) => set("parking_cost", Number(e.target.value))} />
          </Field>
          <Field label="기타 비용" className="sm:col-span-2">
            <input type="number" className="input" value={f.etc_cost ?? 0} onChange={(e) => set("etc_cost", Number(e.target.value))} />
          </Field>
          <Field label="비고" className="sm:col-span-2">
            <textarea className="input h-20 py-3" value={f.complete_memo ?? ""} onChange={(e) => set("complete_memo", e.target.value)} />
          </Field>
          <Field label="예약 시 입력한 비밀번호" required hint={live ? undefined : "데모 데이터의 비밀번호는 1234 입니다."} className="sm:col-span-2">
            <input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
        </form>
      )}
    </Modal>
  );
}
