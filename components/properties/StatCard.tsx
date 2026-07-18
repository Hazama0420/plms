// components/properties/StatCard.tsx
"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: "emerald" | "blue" | "amber" | "rose";
  trend: string;
  trendUp: boolean;
}

const colorMap = {
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
};

export function StatCard({ label, value, icon: Icon, color, trend, trendUp }: StatCardProps) {
  return (
    <Card className="border-0 shadow-md dark:bg-slate-800/80 hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
          </div>
          <div className={cn("p-2.5 rounded-xl", colorMap[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {trend}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">vs bulan lalu</span>
        </div>
      </CardContent>
    </Card>
  );
}