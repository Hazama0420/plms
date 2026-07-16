"use client";

import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils"; // atau pakai clsx/tailwind-merge
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: number; // persentase naik/turun
  trendLabel?: string;
  className?: string;
  color?: "blue" | "green" | "purple" | "orange" | "pink";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
  green: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
  purple: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  orange: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
  pink: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
};

const borderColorMap = {
  blue: "hover:border-blue-300",
  green: "hover:border-emerald-300",
  purple: "hover:border-violet-300",
  orange: "hover:border-amber-300",
  pink: "hover:border-rose-300",
};

export function StatsCard({
  title,
  value,
  icon,
  trend,
  trendLabel = "from last month",
  className,
  color = "blue",
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Animasi angka naik
    const num = typeof value === "number" ? value : parseInt(String(value)) || 0;
    const duration = 800;
    const steps = 30;
    const increment = num / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= num) {
        setDisplayValue(num);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  const TrendIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        borderColorMap[color],
        className
      )}
    >
      {/* Background decorative */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-800">
            {typeof value === "number" ? displayValue.toLocaleString() : value}
          </p>
          {trend && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  isPositive ? "text-emerald-600" : isNegative ? "text-rose-600" : "text-slate-400"
                )}
              >
                {TrendIcon && <TrendIcon size={14} />}
                {Math.abs(trend)}%
              </span>
              <span className="text-slate-400">{trendLabel}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
            colorMap[color]
          )}
        >
          {icon}
        </div>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-100">
        <div
          className={cn(
            "h-full transition-all duration-700 ease-out",
            color === "blue" && "bg-blue-500",
            color === "green" && "bg-emerald-500",
            color === "purple" && "bg-violet-500",
            color === "orange" && "bg-amber-500",
            color === "pink" && "bg-rose-500"
          )}
          style={{ width: "70%" }}
        />
      </div>
    </div>
  );
}