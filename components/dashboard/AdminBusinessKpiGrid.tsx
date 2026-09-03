// components/dashboard/AdminBusinessKpiGrid.tsx
"use client";

import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKprShort } from "@/lib/kpr";
import { useTranslation } from "@/hooks/use-translation";

interface AdminBusinessKpiGridProps {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  totalLeads: number;
  activeLeads: number;
  closedDealsCount: number;
  pipelineValue: number;
  activeAgentsCount: number;
}

export function AdminBusinessKpiGrid({
  totalProperties,
  publishedProperties,
  draftProperties,
  totalLeads,
  activeLeads,
  closedDealsCount,
  pipelineValue,
  activeAgentsCount,
}: AdminBusinessKpiGridProps) {
  const { t } = useTranslation();

  const kpis = [
    {
      title: t("dashboard.kpi.pipelineTitle"),
      value: formatKprShort(pipelineValue),
      subtext: t("dashboard.kpi.pipelineSub"),
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: t("dashboard.kpi.crmTitle"),
      value: totalLeads,
      subtext: `${activeLeads} ${t("dashboard.kpi.crmSub")}`,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("dashboard.kpi.dealsTitle"),
      value: closedDealsCount,
      subtext: `${activeAgentsCount} ${t("dashboard.kpi.dealsSub")}`,
      icon: CheckCircle2,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: t("dashboard.kpi.inventoryTitle"),
      value: publishedProperties,
      subtext: t("dashboard.kpi.inventorySub").replace("{total}", totalProperties.toString()).replace("draf", draftProperties.toString()).replace("drafts", draftProperties.toString()),
      icon: Building2,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={idx}
            className="rounded-2xl border-border/80 shadow-2xs bg-card hover:border-border transition-colors overflow-hidden"
          >
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  {kpi.title}
                </span>
                <p className="text-lg sm:text-2xl font-black tracking-tight text-foreground tabular-nums truncate">
                  {kpi.value}
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
                  {kpi.subtext}
                </p>
              </div>

              <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} ${kpi.border} border shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
