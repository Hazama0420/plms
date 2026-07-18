// components/dashboard/PropertyStatusSummary.tsx
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PropertyStatusSummaryProps {
  properties: any[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800",
    icon: "📝",
  },
  review: {
    label: "Review",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: "👀",
  },
  published: {
    label: "Published",
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: "🚀",
  },
  sold: {
    label: "Sold",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: "💰",
  },
  rented: {
    label: "Rented",
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    icon: "🔑",
  },
  archived: {
    label: "Archived",
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    icon: "📦",
  },
};

export function PropertyStatusSummary({ properties }: PropertyStatusSummaryProps) {
  const statusCounts = properties.reduce((acc: any, p) => {
    const status = p.status || "draft";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const total = properties.length || 0;

  const statuses = Object.entries(statusConfig).map(([key, config]) => ({
    key,
    ...config,
    count: statusCounts[key] || 0,
    percentage: total > 0 ? Math.round((statusCounts[key] || 0) / total * 100) : 0,
  }));

  return (
    <Card className="border-0 shadow-sm dark:bg-slate-800/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          📊 Status Properti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statuses.map((status, index) => (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-3 rounded-xl border dark:border-slate-700",
                status.bg
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{status.icon}</span>
                <span className="text-xl font-bold">{status.count}</span>
              </div>
              <p className={cn("text-xs font-medium", status.color)}>
                {status.label}
              </p>
              <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", status.bg)}
                  style={{ width: `${status.percentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{status.percentage}%</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}