"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTHLY } from "@/lib/data";
import { MODULES } from "@/lib/modules";
import { AXIS, ChartTooltip, InView } from "./chart-frame";

const HEX: Record<string, string> = { ga: "#00876c", vehicle: "#2f6fdb", meeting: "#e08a1e", seal: "#8a5ce6" };
const NAMES = Object.fromEntries(MODULES.map((m) => [m.key, m.shortName]));

export function MonthlyStacked({ height = 280 }: { height?: number }) {
  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="범례">
        {MODULES.map((m) => (
          <li key={m.key} className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
            <span className="size-2.5 rounded-sm" style={{ background: HEX[m.key] }} /> {m.shortName}
          </li>
        ))}
      </ul>
      <InView height={height}>
        <ResponsiveContainer>
          <BarChart data={MONTHLY} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#edf2f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS} width={48} />
            <Tooltip cursor={{ fill: "rgb(0 135 108 / 0.06)", radius: 8 }} content={<ChartTooltip names={NAMES} />} />
            {MODULES.map((m, i) => (
              <Bar
                key={m.key}
                dataKey={m.key}
                stackId="a"
                fill={HEX[m.key]}
                stroke="#fff"
                strokeWidth={2}
                radius={i === MODULES.length - 1 ? [6, 6, 0, 0] : 0}
                animationDuration={900}
                animationBegin={i * 120}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </InView>
    </div>
  );
}
