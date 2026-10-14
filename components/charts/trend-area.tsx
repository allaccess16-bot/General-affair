"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTHLY } from "@/lib/data";
import { AXIS, ChartTooltip, InView } from "./chart-frame";

export function TrendArea({ height = 220 }: { height?: number }) {
  return (
    <InView height={height}>
      <ResponsiveContainer>
        <AreaChart data={MONTHLY} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00876c" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#00876c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#edf2f0" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={48} />
          <Tooltip
            cursor={{ stroke: "#00876c", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<ChartTooltip names={{ total: "전체 신청" }} />}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#00876c"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={{ r: 4, fill: "#fff", stroke: "#00876c", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#00876c", stroke: "#fff", strokeWidth: 2 }}
            animationDuration={1300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </InView>
  );
}
