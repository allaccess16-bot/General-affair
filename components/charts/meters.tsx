"use client";

import { motion } from "framer-motion";

/** 가로 막대 미터 — 항목별 값 + 라벨을 직접 표기 */
export function Meters({
  items,
  color,
  max,
  unit,
}: {
  items: { label: string; sub?: string; value: number }[];
  color: string;
  max: number;
  unit: string;
}) {
  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-ink">
              {it.label}
              {it.sub && <span className="ml-1.5 text-xs font-medium text-ink-3">{it.sub}</span>}
            </span>
            <span className="font-bold text-ink tabular">
              {it.value}
              <span className="ml-0.5 text-xs font-medium text-ink-3">{unit}</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(it.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
