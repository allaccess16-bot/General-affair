"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Notice } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { GA_CATEGORIES, GA_URGENCY, type GaRequestInput } from "@/lib/ga";
import { DEPARTMENTS, todayStr, validContact, validFullName } from "@/lib/shared";

const EMPTY = (): GaRequestInput => ({
  request_date: todayStr(),
  title: "",
  description: "",
  requester_name: "",
  department: "",
  contact: "",
  edit_password: "",
  location: "",
  category: GA_CATEGORIES[0],
  urgency: GA_URGENCY[0],
});

/** 새 요청 등록 — 기존 reqForm 필드·필수값·검증 규칙과 동일 */
export function GaFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { gaCreate, notify } = useDemo();
  const [f, setF] = useState<GaRequestInput>(EMPTY);
  useEffect(() => {
    if (open) setF(EMPTY());
  }, [open]);
  const set = <K extends keyof GaRequestInput>(k: K, v: GaRequestInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const ok = useMemo(() => {
    const required = (Object.keys(f) as (keyof GaRequestInput)[]).every((k) => String(f[k] ?? "").trim().length > 0);
    return required && validFullName(f.requester_name) && validContact(f.contact);
  }, [f]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return notify("필수 항목을 모두 정확히 입력해주세요. 이름은 자음만 입력할 수 없습니다.", true);
    const r = await gaCreate(f);
    if (!r.ok) return notify(r.error, true);
    notify("등록되었습니다.");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="GENERAL AFFAIRS"
      title="새 요청 등록"
      description="시설, 비품, 행정, 보안 등 필요한 요청을 등록하세요."
      width="max-w-2xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={ok ? "text-xs font-semibold text-brand-700" : "text-xs font-semibold text-rose-600"}>
            {ok ? "요청 등록이 가능합니다." : "필수 항목을 모두 입력해주세요. 이름은 자음만 입력할 수 없습니다."}
          </p>
          <Button type="submit" form="ga-form" disabled={!ok}>
            요청 등록
          </Button>
        </div>
      }
    >
      <form id="ga-form" onSubmit={submit} className="space-y-4">
        <FormSection step="STEP 1" title="요청 내용" tone="brand">
          <Field label="요청일" required>
            <input type="date" className="input" value={f.request_date} onChange={(e) => set("request_date", e.target.value)} />
          </Field>
          <Field label="요청 위치" required>
            <input className="input" placeholder="예: 12층 회의실 12-3" value={f.location} onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="요청 제목" required className="sm:col-span-2">
            <input className="input" placeholder="요청 제목" value={f.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="상세 내용" required className="sm:col-span-2">
            <textarea className="input h-28 py-3" placeholder="상세 내용" value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="카테고리">
            <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>
              {GA_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="긴급도">
            <select className="input" value={f.urgency} onChange={(e) => set("urgency", e.target.value)}>
              {GA_URGENCY.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </FormSection>
        <FormSection step="STEP 2" title="요청자 정보">
          <Field label="요청자" required hint={f.requester_name && !validFullName(f.requester_name) ? "이름은 2자 이상, 자음만 입력할 수 없습니다." : undefined}>
            <input className="input" placeholder="요청자" value={f.requester_name} onChange={(e) => set("requester_name", e.target.value)} />
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
          <Field label="수정 비밀번호" required hint="내 요청을 수정할 때 사용합니다.">
            <input type="password" className="input" placeholder="수정 비밀번호" value={f.edit_password} onChange={(e) => set("edit_password", e.target.value)} />
          </Field>
        </FormSection>
        <Notice>등록 후 ‘내 요청 조회’에서 이름·부서·연락처로 진행 상태와 관리자 진행사항을 확인할 수 있습니다.</Notice>
      </form>
    </Modal>
  );
}
