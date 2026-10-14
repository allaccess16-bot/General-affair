"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** 공통 모달 — 모바일은 하단 시트, PC는 중앙 카드 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  width = "max-w-lg",
  tone = "brand",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  tone?: "brand" | "plain";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn("relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]", width)}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            <div className={cn("relative shrink-0 px-6 pb-5 pt-6", tone === "brand" ? "bg-gradient-to-br from-brand-600 to-brand-800 text-white" : "border-b border-line")}>
              {tone === "brand" && <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />}
              {eyebrow && <p className={cn("text-xs font-semibold tracking-widest", tone === "brand" ? "text-brand-100" : "text-brand-600")}>{eyebrow}</p>}
              <h2 className="mt-1 pr-10 text-xl font-bold">{title}</h2>
              {description && <p className={cn("mt-1 text-sm", tone === "brand" ? "text-brand-50/85" : "text-ink-3")}>{description}</p>}
              <button
                onClick={onClose}
                className={cn("absolute right-4 top-4 grid size-9 place-items-center rounded-full transition", tone === "brand" ? "bg-white/15 hover:bg-white/25" : "bg-canvas hover:bg-line")}
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-white px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
