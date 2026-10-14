"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { DEPARTMENTS, validContact, validFullName } from "@/lib/shared";

/** 내 정보(이름·부서·연락처) 수정 — 신청서 자동 입력에 사용 */
export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, updateProfile } = useAuth();
  const { notify } = useDemo();
  const [f, setF] = useState({ name: "", department: "", contact: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && profile) setF({ name: profile.name, department: profile.department, contact: profile.contact });
  }, [open, profile]);
  const ok = validFullName(f.name) && Boolean(f.department) && validContact(f.contact);

  const save = async () => {
    setBusy(true);
    const err = await updateProfile(f.name, f.department, f.contact);
    setBusy(false);
    if (err) return notify(err, true);
    notify("내 정보가 저장되었습니다.");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="MY ACCOUNT"
      title="내 정보 수정"
      description="신청서의 신청자 정보에 자동으로 채워집니다."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save} disabled={!ok || busy}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label="이메일">
          <input className="input bg-canvas" value={profile?.email ?? ""} disabled />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="이름" required>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="연락처/내선" required>
            <input className="input" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
          </Field>
        </div>
        <Field label="부서" required>
          <select className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}>
            <option value="">부서 선택</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
