"use client";

import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MODULES, type ModuleKey } from "@/lib/modules";

/** 바로 신청 — 업무 선택 후 각 모듈의 전용 신청서로 이동 */
export function RequestModal({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (m: ModuleKey) => void }) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="NEW REQUEST" title="어떤 업무를 신청할까요?" description="업무를 고르면 해당 모듈의 신청서가 열립니다." width="max-w-xl">
      <div className="grid gap-2 sm:grid-cols-2">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.key} onClick={() => onNavigate(m.key)} className="group flex items-start gap-3 rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: m.color }}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block">{m.requestLabel}</b>
                <span className="block text-xs leading-relaxed text-ink-3">{m.tagline}</span>
              </span>
              <ArrowRight className="mt-1 size-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
