"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Paperclip, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, type WorkRequest } from "@/lib/data";
import { MODULES, MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";

type Submit = (r: Pick<WorkRequest, "module" | "title" | "dept" | "scheduledAt" | "urgent">) => WorkRequest;

const TITLE_HINT: Record<ModuleKey, string> = {
  ga: "예) 4층 복합기 토너 교체",
  vehicle: "예) 카니발 · 고객사 방문",
  meeting: "예) 중회의실 A · 주간 회의",
  seal: "예) 법인인감 · 용역 계약서",
};

export function RequestModal({
  open,
  initialModule,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialModule?: ModuleKey;
  onClose: () => void;
  onSubmit: Submit;
}) {
  const [module, setModule] = useState<ModuleKey>(initialModule ?? "ga");
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [date, setDate] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [done, setDone] = useState<WorkRequest | null>(null);

  useEffect(() => {
    if (!open) return;
    setModule(initialModule ?? "ga");
    setTitle("");
    setDate("");
    setUrgent(false);
    setDone(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, initialModule, onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const [, m, d] = date.split("-");
    setDone(onSubmit({ module, title: title.trim(), dept, scheduledAt: `${m}.${d}`, urgent }));
  };

  const mod = MODULE_MAP[module];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
            className="relative w-full max-w-lg overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 px-6 pb-6 pt-6 text-white">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <p className="text-xs font-semibold tracking-widest text-brand-100">NEW REQUEST</p>
              <h2 id="request-modal-title" className="mt-1 text-xl font-bold">
                {done ? "신청이 접수되었습니다" : "새 업무 신청"}
              </h2>
              <button
                onClick={onClose}
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center">
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-600"
                >
                  <CheckCircle2 className="size-9" />
                </motion.div>
                <p className="mt-5 text-lg font-bold">{done.title}</p>
                <p className="mt-1 text-sm text-ink-3">
                  신청번호 <span className="font-semibold text-ink tabular">{done.no}</span> · 현재 상태 {done.status}
                </p>
                <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-xs text-ink-3">
                  데모 화면입니다. 신청 내용은 이 브라우저 메모리에만 저장되며 새로고침하면 사라집니다.
                </p>
                <Button className="mt-6 w-full" onClick={onClose}>
                  확인
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5 px-6 py-6">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-ink">업무 구분</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {MODULES.map((m) => {
                      const Icon = m.icon;
                      const active = m.key === module;
                      return (
                        <button
                          type="button"
                          key={m.key}
                          onClick={() => setModule(m.key)}
                          aria-pressed={active}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-semibold transition",
                            active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-brand-200",
                          )}
                        >
                          <Icon className="size-5" style={{ color: m.color }} />
                          {m.shortName}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <Field label={mod.key === "seal" ? "대상 문서 및 인장" : "신청 제목"}>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={TITLE_HINT[module]}
                    className="input"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="소속 부서">
                    <select value={dept} onChange={(e) => setDept(e.target.value)} className="input">
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={module === "seal" ? "필요 일자" : "희망 일자"}>
                    <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                  </Field>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-2">
                    <input
                      type="checkbox"
                      checked={urgent}
                      onChange={(e) => setUrgent(e.target.checked)}
                      className="size-4 accent-brand-600"
                    />
                    긴급 처리 요청
                  </label>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-3">
                    <Paperclip className="size-3.5" /> 첨부는 실서비스에서 지원
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                    취소
                  </Button>
                  <Button type="submit" className="flex-[2]">
                    {mod.requestLabel} 제출
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
