"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_BREAKDOWN } from "@/lib/data";
import { ChartTooltip, InView } from "./chart-frame";

const COLORS: Record<string, string> = {
  접수: "#94a3b8",
  진행중: "#3b82c4",
  승인대기: "#d99a1b",
  완료: "#00876c",
  "반려·취소": "#e0566f",
};

export function StatusDonut() {
  const total = STATUS_BREAKDOWN.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-44 shrink-0">
        <InView height={176}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={STATUS_BREAKDOWN}
                dataKey="value"
                nameKey="status"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={2}
                cornerRadius={6}
                stroke="#fff"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
                animationDuration={1100}
              >
                {STATUS_BREAKDOWN.map((d) => (
                  <Cell key={d.status} fill={COLORS[d.status]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </InView>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[11px] font-semibold text-ink-3">이번 달 전체</p>
            <p className="text-2xl font-extrabold tracking-tight tabular">{total.toLocaleString("ko-KR")}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {STATUS_BREAKDOWN.map((d) => (
          <li key={d.status} className="flex items-center gap-3 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORS[d.status] }} />
            <span className="flex-1 text-ink-2">{d.status}</span>
            <span className="font-bold tabular">{d.value}</span>
            <span className="w-11 text-right text-xs text-ink-3 tabular">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
