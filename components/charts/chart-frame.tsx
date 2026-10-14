"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";

/** 화면에 들어왔을 때 차트를 마운트해 등장 애니메이션이 보이도록 함 */
export function InView({ height, children }: { height: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div ref={ref} style={{ height }} className="w-full">
      {inView && children}
    </div>
  );
}

type TipRow = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "건",
  names,
}: {
  active?: boolean;
  payload?: readonly TipRow[];
  label?: string | number;
  unit?: string;
  names?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-2xl border border-line bg-white/95 px-3.5 py-3 text-xs shadow-[0_16px_40px_-16px_rgb(15_31_27/0.35)] backdrop-blur">
      {label !== undefined && <p className="mb-2 font-bold text-ink">{label}</p>}
      <ul className="space-y-1.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-2.5 rounded-full" style={{ background: p.color }} />
              {names?.[String(p.dataKey)] ?? p.name}
            </span>
            <span className="font-bold text-ink tabular">
              {typeof p.value === "number" ? p.value.toLocaleString("ko-KR") : p.value}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const AXIS = { fontSize: 12, fill: "#7d8b87" };
