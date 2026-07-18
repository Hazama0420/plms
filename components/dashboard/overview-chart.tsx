// components/dashboard/overview-chart.tsx
"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OverviewChartProps {
  data: {
    month: string;
    properties: number;
    sold: number;
  }[];
}

const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"];
const YEARS = [2024, 2025, 2026, 2027]; // bisa dibuat dinamis dari data

export function OverviewChart({ data }: OverviewChartProps) {
  const [year, setYear] = useState(new Date().getFullYear());

  // Filter data based on year (jika data sudah per tahun, kita filter)
  // Karena data dikembalikan per bulan tanpa tahun, kita asumsikan data untuk tahun yang dipilih
  // Tapi service kita mengembalikan data tahun berjalan. Untuk demo, kita pakai data yang ada.
  // Untuk tahun lain, kita bisa fetch ulang atau filter. Kita akan implementasikan dengan year selector.

  // Untuk saat ini, karena data dari service hanya untuk tahun berjalan, kita tidak filter.
  // Tapi jika nanti kita perlu, kita bisa ubah service untuk menerima tahun.
  // Kita tetap tampilkan selector dan kita bisa trigger refetch dengan year.
  // Dalam implementasi nyata, kita bisa memanggil dashboardService dengan parameter year.
  // Untuk sekarang, kita hanya tampilkan selector visual.

  // Kita akan menggunakan data yang diberikan.

  return (
    <div className="w-full h-[280px]">
      <div className="flex justify-end mb-2">
        <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
              background: "white",
            }}
            formatter={(value: any, name: any) => {
              const numValue = typeof value === 'number' ? value : 0;
              const label = name === "properties" ? "Total Properti" : "Terjual";
              return [numValue, label];
            }}
          />
          <Bar dataKey="properties" radius={[6, 6, 0, 0]} fill="#3b82f6">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
          <Bar dataKey="sold" radius={[6, 6, 0, 0]} fill="#8b5cf6">
            {data.map((_, index) => (
              <Cell key={`cell-sold-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}