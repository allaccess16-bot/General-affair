"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Siren } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import type { WorkRequest } from "@/lib/data";
import { MODULE_MAP } from "@/lib/modules";
import { cn, formatShortDate } from "@/lib/utils";

/** 신청 내역 테이블 — PC는 표, 모바일은 카드 리스트 */
export function RequestTable({
  rows,
  showModule = true,
  compact = false,
  empty = "조건에 맞는 신청 내역이 없습니다.",
  pageSize,
}: {
  rows: WorkRequest[];
  showModule?: boolean;
  compact?: boolean;
  empty?: string;
  /** 지정하면 이 개수씩 페이지로 나눠 표시 (15 / 20 전환 가능) */
  pageSize?: number;
}) {
  const [size, setSize] = useState(pageSize ?? 0);
  const [page, setPage] = useState(1);
  const pages = size ? Math.max(1, Math.ceil(rows.length / size)) : 1;
  // 조회 조건이 바뀌면 첫 페이지로
  useEffect(() => setPage(1), [rows.length, size]);
  const cur = Math.min(page, pages);
  const all = rows;
  rows = size ? all.slice((cur - 1) * size, cur * size) : all;

  if (all.length === 0) {
    return <div className="rounded-2xl bg-canvas px-6 py-14 text-center text-sm text-ink-3">{empty}</div>;
  }
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold text-ink-3">
              {showModule && <th className="py-3 pl-2 pr-3 font-semibold">업무</th>}
              <th className="px-3 py-3 font-semibold">신청 내용</th>
              <th className="px-3 py-3 font-semibold">신청자</th>
              {!compact && <th className="px-3 py-3 font-semibold">신청일</th>}
              {!compact && <th className="px-3 py-3 font-semibold">일정</th>}
              <th className="py-3 pl-3 pr-2 text-right font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((r) => {
                const m = MODULE_MAP[r.module];
                const Icon = m.icon;
                return (
                  <motion.tr
                    key={r.id}
                    layout
                    initial={{ opacity: 0, backgroundColor: "rgb(236 248 244)" }}
                    animate={{ opacity: 1, backgroundColor: "rgb(255 255 255 / 0)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="border-b border-line/70 last:border-0 hover:bg-canvas/70"
                  >
                    {showModule && (
                      <td className="py-3.5 pl-2 pr-3">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold" style={{ color: m.color }}>
                          <span className="grid size-8 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${m.color} 11%, white)` }}>
                            <Icon className="size-4" />
                          </span>
                          {m.shortName}
                        </span>
                      </td>
                    )}
                    <td className="max-w-[320px] px-3 py-3.5">
                      <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                        {r.urgent && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                            <Siren className="size-3" /> 긴급
                          </span>
                        )}
                        <span className="truncate">{r.title}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-3 tabular">
                        {r.no}
                        {compact && <> · {r.scheduledAt}</>}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
                      <p className="font-medium text-ink">{r.requester}</p>
                      <p className="text-xs text-ink-3">{r.dept}</p>
                    </td>
                    {!compact && <td className="whitespace-nowrap px-3 py-3.5 text-ink-2 tabular">{formatShortDate(r.requestedAt)}</td>}
                    {!compact && <td className="whitespace-nowrap px-3 py-3.5 text-ink-2 tabular">{r.scheduledAt}</td>}
                    <td className="py-3.5 pl-3 pr-2 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <ul className="space-y-2.5 md:hidden">
        {rows.map((r) => {
          const m = MODULE_MAP[r.module];
          const Icon = m.icon;
          return (
            <li key={r.id} className={cn("rounded-2xl border border-line bg-white p-4", r.urgent && "border-rose-200")}>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: m.color }}>
                  <Icon className="size-4" /> {m.shortName}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 font-semibold leading-snug">{r.title}</p>
              <p className="mt-1.5 text-xs text-ink-3 tabular">
                {r.requester} · {r.dept} · {r.scheduledAt}
              </p>
            </li>
          );
        })}
      </ul>

      {size > 0 && all.length > 0 && <Pager total={all.length} size={size} page={cur} pages={pages} onPage={setPage} onSize={setSize} />}
    </>
  );
}

function Pager({ total, size, page, pages, onPage, onSize }: { total: number; size: number; page: number; pages: number; onPage: (p: number) => void; onSize: (s: number) => void }) {
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  // 현재 페이지 주변 최대 5개 번호
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const btn = "grid size-9 place-items-center rounded-full text-sm font-bold transition disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-line pt-4 sm:flex-row">
      <p className="text-xs text-ink-3 tabular">
        전체 <b className="text-ink-2">{total}</b>건 중 {from}–{to}
      </p>
      <nav className="flex items-center gap-1" aria-label="페이지">
        <button className={cn(btn, "text-ink-2 hover:bg-canvas")} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="이전 페이지">
          <ChevronLeft className="size-4" />
        </button>
        {nums.map((n) => (
          <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, "relative tabular", n === page ? "text-white" : "text-ink-2 hover:bg-canvas")}>
            {n === page && <motion.span layoutId="pager-dot" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
            <span className="relative">{n}</span>
          </button>
        ))}
        <button className={cn(btn, "text-ink-2 hover:bg-canvas")} onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="다음 페이지">
          <ChevronRight className="size-4" />
        </button>
      </nav>
      <label className="flex items-center gap-2 text-xs text-ink-3">
        페이지당
        <select className="h-8 rounded-full border border-line bg-white px-2.5 text-xs font-bold text-ink-2" value={size} onChange={(e) => onSize(Number(e.target.value))}>
          {[15, 20].map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
