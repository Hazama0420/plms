// components/dashboard/overview-chart.tsx

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OverviewChartProps {
  data: {
    month: string;
    properties: number;
    sold: number;
  }[];
}

const COLORS = ["#3b82f6", "#8b5cf6"];

export function OverviewChart({ data }: OverviewChartProps) {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: "13px",
            }}
            formatter={(value: number, name: string) => [
              value,
              name === "properties" ? "Total Properti" : "Terjual",
            ]}
          />
          <Bar dataKey="properties" radius={[4, 4, 0, 0]} fill="#3b82f6">
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index % 2 === 0 ? "#3b82f6" : "#60a5fa"}
              />
            ))}
          </Bar>
          <Bar dataKey="sold" radius={[4, 4, 0, 0]} fill="#8b5cf6">
            {data.map((_, index) => (
              <Cell
                key={`cell-sold-${index}`}
                fill={index % 2 === 0 ? "#8b5cf6" : "#a78bfa"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}