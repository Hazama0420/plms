// components/dashboard/AgentTodayPriority.tsx
"use client";

import Link from "next/link";
import {
  CalendarClock,
  Clock,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

interface AgentTodayPriorityProps {
  userName?: string | null;
  overdueFollowupsCount: number;
  scheduledFollowupsCount: number;
  newLeadsCount: number;
  upcomingSurveysCount: number;
}

export function AgentTodayPriority({
  userName,
  overdueFollowupsCount,
  scheduledFollowupsCount,
  newLeadsCount,
  upcomingSurveysCount,
}: AgentTodayPriorityProps) {
  const { t } = useTranslation();
  const displayName = userName ? userName.trim().split(" ")[0] : t("dashboard.colleague");
  const hasUrgentWork = overdueFollowupsCount > 0 || newLeadsCount > 0;
  const totalTasks = overdueFollowupsCount + scheduledFollowupsCount + upcomingSurveysCount;

  return (
    <Card className="rounded-2xl border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Summary & Greeting Context */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t("dashboard.priority.title")}
            </span>
            {hasUrgentWork ? (
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
              >
                {t("dashboard.priority.urgent")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                {t("dashboard.priority.allClear")}
              </Badge>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
            {t("dashboard.priority.greeting")}, {displayName}.
          </h2>

          <p className="text-xs text-muted-foreground font-medium max-w-xl">
            {totalTasks > 0
              ? t("dashboard.priority.taskSummary").replace("{count}", totalTasks.toString())
              : t("dashboard.priority.noTasks")}
          </p>
        </div>

        {/* Center: 3 Dense Priority Metric Chips */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0 py-1">
          {/* 1. Overdue / Scheduled Follow-ups */}
          <Link
            href="/crm/followups"
            aria-label={t("dashboard.priority.followup")}
            className="group flex flex-col items-center justify-center p-2.5 sm:px-3.5 rounded-xl border border-border/80 bg-background/60 hover:bg-muted/60 transition-colors text-center cursor-pointer min-w-[85px] sm:min-w-[100px]"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Clock className={cn("w-3.5 h-3.5", overdueFollowupsCount > 0 ? "text-rose-500" : "text-blue-500")} />
              <span className="hidden sm:inline">{t("dashboard.priority.followup")}</span>
            </div>
            <span
              className={cn(
                "text-lg sm:text-xl font-black tabular-nums tracking-tight mt-0.5",
                overdueFollowupsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              )}
            >
              {scheduledFollowupsCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {overdueFollowupsCount > 0 ? `${overdueFollowupsCount} ${t("dashboard.priority.overdue")}` : t("dashboard.priority.scheduled")}
            </span>
          </Link>

          {/* 2. Upcoming Surveys */}
          <Link
            href="/surveys"
            aria-label={t("dashboard.priority.surveys")}
            className="group flex flex-col items-center justify-center p-2.5 sm:px-3.5 rounded-xl border border-border/80 bg-background/60 hover:bg-muted/60 transition-colors text-center cursor-pointer min-w-[85px] sm:min-w-[100px]"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span className="hidden sm:inline">{t("dashboard.priority.surveys")}</span>
            </div>
            <span className="text-lg sm:text-xl font-black text-foreground tabular-nums tracking-tight mt-0.5">
              {upcomingSurveysCount}
            </span>
            <span className="text-[10px] text-muted-foreground">{t("dashboard.priority.visits")}</span>
          </Link>

          {/* 3. New Uncontacted Leads */}
          <Link
            href="/crm/leads"
            aria-label={t("dashboard.priority.newLeads")}
            className="group flex flex-col items-center justify-center p-2.5 sm:px-3.5 rounded-xl border border-border/80 bg-background/60 hover:bg-muted/60 transition-colors text-center cursor-pointer min-w-[85px] sm:min-w-[100px]"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <UserPlus className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t("dashboard.priority.newLeads")}</span>
            </div>
            <span className="text-lg sm:text-xl font-black text-foreground tabular-nums tracking-tight mt-0.5">
              {newLeadsCount}
            </span>
            <span className="text-[10px] text-muted-foreground">{t("dashboard.priority.prospects")}</span>
          </Link>
        </div>

        {/* Right: Primary Action CTA */}
        <div className="shrink-0 flex items-center gap-2">
          <Link href="/crm/followups" className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>{t("dashboard.priority.startFollowupBtn")}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
