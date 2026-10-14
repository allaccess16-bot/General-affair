"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { VEHICLE_USAGE } from "@/lib/data";
import { AXIS, ChartTooltip, InView } from "./chart-frame";

export function VehicleBars({ height = 200 }: { height?: number }) {
  return (
    <InView height={height}>
      <ResponsiveContainer>
        <BarChart data={VEHICLE_USAGE} margin={{ top: 20, right: 4, left: -10, bottom: 0 }} barCategoryGap="34%">
          <CartesianGrid vertical={false} stroke="#edf2f0" />
          <XAxis dataKey="vehicle" tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
          <Tooltip cursor={{ fill: "rgb(47 111 219 / 0.06)", radius: 8 }} content={<ChartTooltip names={{ trips: "운행 횟수" }} unit="회" />} />
          <Bar dataKey="trips" fill="#2f6fdb" radius={[6, 6, 0, 0]} animationDuration={1000}>
            <LabelList dataKey="trips" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#4b5a56" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </InView>
  );
}
