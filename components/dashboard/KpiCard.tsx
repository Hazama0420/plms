"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  badge?: string;
  trendUp?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  trend,
  badge,
  trendUp = true,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          {icon && <div className="text-muted-foreground/70">{icon}</div>}
        </div>
        <div className="flex items-end justify-between mt-1">
          <span className="text-xl font-bold tracking-tight">{value}</span>
          {trend && (
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                trendUp
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
              )}
            >
              {trend}
            </span>
          )}
          {badge && !trend && (
            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}