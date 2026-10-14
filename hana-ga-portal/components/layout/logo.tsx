import Link from "next/link";
import { cn } from "@/lib/utils";

/** HANA WORKS 임시 심벌 — 공식 로고 파일 수령 시 교체 */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="HANA WORKS 홈">
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-[0_6px_16px_-6px_rgb(0_119_95/0.7)] transition-transform group-hover:rotate-6">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
          <path d="M7 24V8h4v6.2h10V8h4v16h-4v-6h-10v6z" fill="#fff" />
          <circle cx="25" cy="7" r="3" fill="#b9f3df" />
        </svg>
      </span>
      <span className="whitespace-nowrap leading-none">
        <span className={cn("block text-[17px] font-extrabold tracking-tight", inverted ? "text-white" : "text-ink")}>
          HANA WORKS
        </span>
        <span className={cn("mt-1 block text-[11px] font-medium tracking-wide", inverted ? "text-brand-100" : "text-ink-3")}>
          총무 통합 업무 지원 시스템
        </span>
      </span>
    </Link>
  );
}
