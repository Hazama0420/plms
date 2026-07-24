"use client";

import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";

interface OverviewChartProps {
  data: {
    month: string;
    properties: number;
    sold: number;
  }[];
  onYearChange?: (year: number) => void;
  className?: string;
}

const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"];
const SOLD_COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff"];

export function OverviewChart({ data, onYearChange, className }: OverviewChartProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar untuk penyesuaian tampilan
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleYearChange = (val: string) => {
    const newYear = Number(val);
    setYear(newYear);
    onYearChange?.(newYear);
  };

  // Jika data kosong, tampilkan pesan
  if (!data || data.length === 0) {
    return (
      <div className={cn("w-full h-[280px] flex items-center justify-center text-muted-foreground text-sm", className)}>
        Tidak ada data untuk tahun ini
      </div>
    );
  }

  // Custom tooltip yang lebih mobile-friendly
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg p-3 min-w-[140px]">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-sm gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name === "properties" ? "Total" : "Terjual"}</span>
            </span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
        <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>{total}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-end mb-3">
        <Select value={String(year)} onValueChange={(val) => handleYearChange(val || "")}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
        <BarChart
          data={data}
          margin={{ top: 10, right: isMobile ? 5 : 10, left: isMobile ? -5 : 0, bottom: 0 }}
          barGap={isMobile ? 4 : 8}
          barSize={isMobile ? 16 : 24}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.5} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12 }}
            interval={isMobile ? 1 : 0}
            angle={isMobile ? -30 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 40 : 30}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12 }}
            tickFormatter={(value) => `${value}`}
            width={isMobile ? 20 : 30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.05)" }} />
          <Bar dataKey="properties" radius={[4, 4, 0, 0]} fill="#3b82f6">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
          <Bar dataKey="sold" radius={[4, 4, 0, 0]} fill="#8b5cf6">
            {data.map((_, index) => (
              <Cell key={`cell-sold-${index}`} fill={SOLD_COLORS[index % SOLD_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}