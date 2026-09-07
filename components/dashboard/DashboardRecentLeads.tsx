// components/dashboard/DashboardRecentLeads.tsx
"use client";

import Link from "next/link";
import { Users, ChevronRight, MessageSquare, Phone, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface DashboardLeadItem {
  id: string;
  name: string;
  property: string;
  phone: string;
  status: string | null;
  created_at: string | null;
}

interface DashboardRecentLeadsProps {
  leads: DashboardLeadItem[];
  loading?: boolean;
}

export function DashboardRecentLeads({ leads, loading = false }: DashboardRecentLeadsProps) {
  const { t } = useTranslation();

  const statusBadgeConfig: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: t("dashboard.stats.status.new"), color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
    contacted: { label: t("dashboard.stats.status.contacted"), color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
    qualified: { label: t("dashboard.stats.status.qualified"), color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
    survey_scheduled: { label: t("dashboard.stats.status.survey_scheduled"), color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
    negotiation: { label: t("dashboard.stats.status.negotiation"), color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-500/10 border-indigo-500/20" },
    deal: { label: t("dashboard.stats.status.deal"), color: "text-emerald-800 dark:text-emerald-200", bg: "bg-emerald-500/20 border-emerald-500/30" },
    lost: { label: t("dashboard.stats.status.lost"), color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
  };

  return (
    <Card className="bg-card border-border/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t("dashboard.stats.recentLeads")}</span>
        </CardTitle>

        <Link href="/crm/leads">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 h-8 px-2"
          >
            <span>{t("dashboard.stats.allLeads")}</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border/60">
        {leads.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              {t("dashboard.stats.noLeads")}
            </p>
          </div>
        ) : (
          leads.slice(0, 5).map((lead) => {
            const statusCfg = statusBadgeConfig[lead.status || "new"] || statusBadgeConfig.new;
            return (
              <div
                key={lead.id}
                className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {lead.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-semibold px-2 py-0.5 border ${statusCfg.color} ${statusCfg.bg}`}
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {t("dashboard.stats.interestedIn")}: <span className="font-medium text-foreground">{lead.property || t("dashboard.stats.generalProperty")}</span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Link href={`/crm/leads/${lead.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold border-border/80 text-foreground"
                    >
                      {t("dashboard.stats.detail")}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
