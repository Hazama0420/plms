// components/dashboard/DashboardHeader.tsx
"use client";

import { Sparkles, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

interface DashboardHeaderProps {
  userName?: string | null;
  userRole?: string | null;
  onOpenAiSummary?: () => void;
  canCreateProperty?: boolean;
}

export function DashboardHeader({
  userName,
  userRole = "agent",
  onOpenAiSummary,
  canCreateProperty = true,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  // Sapaan ramah sesuai waktu
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return t("dashboard.goodMorning");
    if (hour >= 11 && hour < 15) return t("dashboard.goodAfternoon");
    if (hour >= 15 && hour < 18) return t("dashboard.goodEvening");
    return t("dashboard.goodNight");
  };

  const roleLabelMap: Record<string, string> = {
    super_admin: t("dashboard.roles.superAdmin"),
    superadmin: t("dashboard.roles.superAdmin"),
    admin: t("dashboard.roles.admin"),
    agent: t("dashboard.roles.agent"),
    commissioner: t("dashboard.roles.commissioner"),
    marketing: t("dashboard.roles.marketing"),
    viewer: t("dashboard.roles.viewer"),
  };

  const displayName = userName ? userName.trim().split(" ")[0] : t("dashboard.colleague");
  const roleLabel = roleLabelMap[userRole?.toLowerCase() || ""] || t("dashboard.roles.agent");

  return (
    <div className="bg-card border border-border/80 shadow-xs rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* LEFT: Greeting & Context */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-foreground">
            {getGreeting()}, {displayName}
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-md border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            {roleLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {t("dashboard.headerDesc")}
        </p>
      </div>

      {/* RIGHT: Operational Actions */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {onOpenAiSummary && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAiSummary}
            className="h-8.5 px-3 rounded-lg border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t("dashboard.aiSummaryBtn")}</span>
          </Button>
        )}

        <Link href="/crm/leads/create">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8.5 px-3 rounded-lg border-border/80 hover:bg-muted text-foreground text-xs font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t("dashboard.inputLeadBtn")}</span>
          </Button>
        </Link>

        {canCreateProperty && (
          <Link href="/properties/create">
            <Button
              type="button"
              size="sm"
              className="h-8.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("dashboard.addPropertyBtn")}</span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
