// components/dashboard/AdminStatsGrid.tsx
"use client";

import {
  Building2,
  Users,
  TrendingUp,
  BriefcaseBusiness,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKprShort } from "@/lib/kpr";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface AdminStatsGridProps {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  totalLeads: number;
  activeLeads: number;
  closedDealsCount: number;
  pipelineValue: number;
  activeAgentsCount: number;
}

export function AdminStatsGrid({
  totalProperties,
  publishedProperties,
  draftProperties,
  totalLeads,
  activeLeads,
  closedDealsCount,
  pipelineValue,
  activeAgentsCount,
}: AdminStatsGridProps) {
  const { t } = useTranslation();
  
  const stats = [
    {
      title: t("dashboard.stats.totalInventory"),
      value: totalProperties,
      subValue: `${publishedProperties} ${t("dashboard.stats.published")} • ${draftProperties} ${t("dashboard.stats.draft")}`,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("dashboard.stats.totalCrm"),
      value: totalLeads,
      subValue: `${activeLeads} ${t("dashboard.stats.activeLeads")}`,
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: t("dashboard.stats.pipelineValue"),
      value: formatKprShort(pipelineValue),
      subValue: t("dashboard.stats.activeTransaction"),
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: t("dashboard.stats.closingDeals"),
      value: closedDealsCount,
      subValue: `${activeAgentsCount} ${t("dashboard.stats.activeStaff")}`,
      icon: CheckCircle2,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Card
            key={idx}
            className="bg-card border-border/80 shadow-xs hover:border-emerald-500/40 transition-all rounded-2xl overflow-hidden"
          >
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                  {item.title}
                </span>
                <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  {item.subValue}
                </p>
              </div>

              <div className={`p-3 rounded-2xl ${item.bg} ${item.color} ${item.border} border shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
