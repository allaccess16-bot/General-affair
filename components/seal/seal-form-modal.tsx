"use client";

import { FileUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Notice } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { APPROVAL_METHODS, SEAL_KINDS, type SealInput } from "@/lib/seal";
import { addDays, DEPARTMENTS, todayStr, validContact, validFullName } from "@/lib/shared";
import { cn } from "@/lib/utils";

const empty = (): SealInput => ({
  requester_name: "",
  department: "",
  contact: "",
  seal_kind: "법인인감",
  purpose: "",
  document_name: "",
  submit_to: "",
  needed_date: addDays(todayStr(), 1),
  quantity: 1,
  approval_method: "전자결재",
  approval_doc_no: "",
  approver_name: "",
  approval_date: todayStr(),
  approval_note: "",
  need_seal_certificate: false,
  seal_certificate_count: 1,
  need_usage_seal_form: false,
  usage_seal_form_count: 1,
  remarks: "",
});

/** 인장 날인 신청서 */
export function SealFormModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (no: string) => void }) {
  const { sealCreate, notify } = useDemo();
  const [f, setF] = useState<SealInput>(empty);
  useEffect(() => {
    if (open) setF(empty());
  }, [open]);
  const set = <K extends keyof SealInput>(k: K, v: SealInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!validFullName(f.requester_name)) m.push("신청자");
    if (!f.department) m.push("소속 부서");
    if (!validContact(f.contact)) m.push("연락처");
    if (!f.purpose.trim()) m.push("날인 목적");
    if (!f.document_name.trim()) m.push("대상 문서명");
    if (!f.submit_to.trim()) m.push("사용처·제출처");
    if (!f.needed_date) m.push("필요 일자");
    if (!(f.quantity >= 1)) m.push("날인 수량");
    if (!f.approver_name.trim()) m.push("승인권자");
    if (!f.approval_date) m.push("승인일");
    if (!f.approval_doc_no.trim() && !f.approval_note.trim()) m.push("결재문서번호 또는 승인 증빙 내용");
    return m;
  }, [f]);
  const ok = missing.length === 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return notify(`필수 항목을 입력해주세요: ${missing.join(", ")}`, true);
    const row = sealCreate({
      ...f,
      seal_certificate_count: f.need_seal_certificate ? f.seal_certificate_count : 0,
      usage_seal_form_count: f.need_usage_seal_form ? f.usage_seal_form_count : 0,
    });
    notify(`날인 신청이 접수되었습니다 · ${row.request_no}`);
    onCreated?.(row.request_no);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="SEAL REQUEST"
      title="인장 날인 신청서"
      description="신청 후 담당자 검토 → 승인 → 실제 날인 순서로 진행됩니다. 신청번호는 자동으로 발급됩니다."
      width="max-w-3xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn("text-xs font-semibold", ok ? "text-brand-700" : "text-rose-600")}>{ok ? "신청이 가능합니다." : `미입력: ${missing.join(", ")}`}</p>
          <Button type="submit" form="seal-form" disabled={!ok}>
            날인 신청
          </Button>
        </div>
      }
    >
      <form id="seal-form" onSubmit={submit} className="space-y-4">
        <FormSection step="STEP 1" title="신청자 정보">
          <Field label="신청자" required>
            <input className="input" placeholder="성명" value={f.requester_name} onChange={(e) => set("requester_name", e.target.value)} />
          </Field>
          <Field label="소속 부서" required>
            <select className="input" value={f.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">부서 선택</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="연락처/내선" required className="sm:col-span-2">
            <input className="input" placeholder="연락처 또는 내선번호" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
          </Field>
        </FormSection>

        <FormSection step="STEP 2" title="날인 내용" tone="brand">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-bold text-ink-2">
              인장 종류<span className="ml-0.5 text-rose-500">*</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEAL_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => set("seal_kind", k.value)}
                  aria-pressed={f.seal_kind === k.value}
                  className={cn("flex items-center gap-3 rounded-2xl border bg-white p-4 text-left transition", f.seal_kind === k.value ? "ring-2" : "border-line hover:border-brand-200")}
                  style={f.seal_kind === k.value ? { borderColor: k.color, boxShadow: `0 0 0 2px ${k.color}33` } : undefined}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 text-sm font-extrabold" style={{ borderColor: k.color, color: k.color }}>
                    {k.value === "법인인감" ? "印" : "職"}
                  </span>
                  <span>
                    <b className="block">{k.value}</b>
                    <span className="text-xs text-ink-3">{k.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <Field label="날인 목적" required className="sm:col-span-2">
            <input className="input" placeholder="예: 본사 사무실 임대차 계약 체결" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} />
          </Field>
          <Field label="대상 문서명" required>
            <input className="input" placeholder="예: 임대차 계약서" value={f.document_name} onChange={(e) => set("document_name", e.target.value)} />
          </Field>
          <Field label="사용처 · 제출처" required>
            <input className="input" placeholder="예: ㈜한빛빌딩" value={f.submit_to} onChange={(e) => set("submit_to", e.target.value)} />
          </Field>
          <Field label="필요 일자" required>
            <input type="date" className="input" min={todayStr()} value={f.needed_date} onChange={(e) => set("needed_date", e.target.value)} />
          </Field>
          <Field label="날인 수량 (부)" required>
            <input type="number" min={1} className="input" value={f.quantity} onChange={(e) => set("quantity", Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </FormSection>

        <FormSection step="STEP 3" title="사전 승인 증빙">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-bold text-ink-2">승인 방식</p>
            <div className="flex flex-wrap gap-1.5">
              {APPROVAL_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("approval_method", m)}
                  className={cn("rounded-full border px-3.5 py-2 text-sm font-semibold", f.approval_method === m ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2")}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Field label="결재문서 번호" hint="전자결재·서면결재 문서번호">
            <input className="input" placeholder="예: 재무-2026-0457" value={f.approval_doc_no} onChange={(e) => set("approval_doc_no", e.target.value)} />
          </Field>
          <Field label="승인권자" required>
            <input className="input" placeholder="예: 김재무 부장" value={f.approver_name} onChange={(e) => set("approver_name", e.target.value)} />
          </Field>
          <Field label="승인일" required>
            <input type="date" className="input" value={f.approval_date} onChange={(e) => set("approval_date", e.target.value)} />
          </Field>
          <Field label="승인 증빙 내용" hint="문서번호가 없으면 승인 경위를 적어주세요 (예: 10/12 이메일로 부서장 승인)." className="sm:col-span-2">
            <textarea className="input h-20 py-3" value={f.approval_note} onChange={(e) => set("approval_note", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-white px-4 py-4 text-sm text-ink-3">
              <FileUp className="size-5 shrink-0" />
              <span>
                <b className="text-ink-2">첨부파일 (추후 지원 예정)</b>
                <br />
                결재문서 사본·대상 문서를 첨부할 수 있도록 준비 중입니다. 첨부파일은 권한 확인 후에만 열람됩니다.
              </span>
            </div>
          </div>
        </FormSection>

        <FormSection step="STEP 4" title="증명서 발급 희망">
          {(
            [
              ["need_seal_certificate", "seal_certificate_count", "법인 인감증명서", "등기소 발급 인감증명서"],
              ["need_usage_seal_form", "usage_seal_form_count", "사용인감계", "사용인감 신고서"],
            ] as const
          ).map(([flag, cnt, label, desc]) => (
            <div key={flag} className={cn("rounded-2xl border bg-white p-4 transition", f[flag] ? "border-brand-400 ring-2 ring-brand-100" : "border-line")}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4 accent-brand-600" checked={f[flag]} onChange={(e) => set(flag, e.target.checked)} />
                <span>
                  <b>{label} 발급 희망</b>
                  <span className="block text-xs text-ink-3">{desc}</span>
                </span>
              </label>
              {f[flag] && (
                <label className="mt-3 flex items-center gap-2 pl-7 text-sm">
                  발급 부수
                  <input type="number" min={1} className="input h-10 w-20" value={f[cnt]} onChange={(e) => set(cnt, Math.max(1, Number(e.target.value) || 1))} />부
                </label>
              )}
            </div>
          ))}
          <Field label="기타 요청사항" className="sm:col-span-2">
            <textarea className="input h-20 py-3" placeholder="간인 필요 여부, 원본 반환 방법 등" value={f.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </Field>
        </FormSection>
        <Notice tone="warn">승인 완료 후 인장 관리자가 실제 날인을 진행합니다. 시스템은 인장 이미지를 문서에 자동 합성하지 않습니다.</Notice>
      </form>
    </Modal>
  );
}
