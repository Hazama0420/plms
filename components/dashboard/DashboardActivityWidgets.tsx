// components/dashboard/DashboardActivityWidgets.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarClock,
  CalendarCheck,
  X,
  ChevronRight,
  ArrowRight,
  Clock,
  MapPin,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardLeadItem } from "./DashboardRecentLeads";
import type { Survey } from "@/types/survey.types";

export type ActivityWidgetType = "crm" | "followup" | "survey";

export interface DashboardFollowupSummary {
  id: string;
  name: string;
  scheduled_at: string;
  status?: string;
  priority?: string;
}

interface DashboardActivityWidgetsProps {
  leads: DashboardLeadItem[];
  surveys: Survey[];
  followups?: DashboardFollowupSummary[];
  totalLeadsCount?: number;
  scheduledFollowupsCount?: number;
  overdueFollowupsCount?: number;
  upcomingSurveysCount?: number;
}

const statusBadgeConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Baru", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
  contacted: { label: "Dihubungi", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  qualified: { label: "Kualifikasi", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  proposal: { label: "Proposal", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  won: { label: "Closing", color: "text-emerald-800 dark:text-emerald-200", bg: "bg-emerald-500/20 border-emerald-500/30" },
  lost: { label: "Batal", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
};

export function DashboardActivityWidgets({
  leads = [],
  surveys = [],
  followups = [],
  totalLeadsCount,
  scheduledFollowupsCount = 0,
  overdueFollowupsCount = 0,
  upcomingSurveysCount,
}: DashboardActivityWidgetsProps) {
  const [activeWidget, setActiveWidget] = useState<ActivityWidgetType | null>(null);

  const effectiveLeadsCount = totalLeadsCount ?? leads.length;
  const effectiveSurveysCount = upcomingSurveysCount ?? surveys.length;

  const toggleWidget = (type: ActivityWidgetType) => {
    setActiveWidget((prev) => (prev === type ? null : type));
  };

  return (
    <div className="space-y-3">
      {/* 1. THREE COMPACT INTERACTIVE WIDGET CONTROLS */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3" role="tablist" aria-label="Widget Aktivitas Cepat">
        {/* Widget A: Prospek CRM */}
        <button
          type="button"
          role="tab"
          aria-selected={activeWidget === "crm"}
          aria-expanded={activeWidget === "crm"}
          onClick={() => toggleWidget("crm")}
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border transition-all duration-150 min-h-[52px] sm:min-h-[58px] cursor-pointer text-left select-none",
            activeWidget === "crm"
              ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/40 shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              activeWidget === "crm"
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Users className="w-4 h-4" />
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <span className="text-[11px] font-bold text-foreground block truncate">
              CRM
            </span>
            <span className="text-[10px] text-muted-foreground font-medium block truncate tabular-nums">
              {effectiveLeadsCount} Prospek
            </span>
          </div>
        </button>

        {/* Widget B: Follow Up */}
        <button
          type="button"
          role="tab"
          aria-selected={activeWidget === "followup"}
          aria-expanded={activeWidget === "followup"}
          onClick={() => toggleWidget("followup")}
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border transition-all duration-150 min-h-[52px] sm:min-h-[58px] cursor-pointer text-left select-none relative",
            activeWidget === "followup"
              ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/40 shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors relative",
              activeWidget === "followup"
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            <CalendarClock className="w-4 h-4" />
            {overdueFollowupsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-card" />
            )}
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <span className="text-[11px] font-bold text-foreground block truncate">
              Follow Up
            </span>
            <span className="text-[10px] text-muted-foreground font-medium block truncate tabular-nums">
              {overdueFollowupsCount > 0
                ? `${overdueFollowupsCount} Terlambat`
                : `${scheduledFollowupsCount} Terjadwal`}
            </span>
          </div>
        </button>

        {/* Widget C: Survei */}
        <button
          type="button"
          role="tab"
          aria-selected={activeWidget === "survey"}
          aria-expanded={activeWidget === "survey"}
          onClick={() => toggleWidget("survey")}
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border transition-all duration-150 min-h-[52px] sm:min-h-[58px] cursor-pointer text-left select-none",
            activeWidget === "survey"
              ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/40 shadow-xs"
              : "border-border/80 bg-card hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              activeWidget === "survey"
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            <CalendarCheck className="w-4 h-4" />
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <span className="text-[11px] font-bold text-foreground block truncate">
              Survei
            </span>
            <span className="text-[10px] text-muted-foreground font-medium block truncate tabular-nums">
              {effectiveSurveysCount} Agenda
            </span>
          </div>
        </button>
      </div>

      {/* 2. ANIMATED INLINE EXPANDABLE DETAIL PANEL */}
      {activeWidget !== null && (
        <div
          role="tabpanel"
          className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden transition-all duration-200 ease-out motion-reduce:transition-none"
        >
          {/* Panel Header */}
          <div className="p-3.5 sm:px-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeWidget === "crm" && "Detail Prospek CRM Terbaru"}
                {activeWidget === "followup" && "Detail Jadwal Follow-up"}
                {activeWidget === "survey" && "Detail Agenda Kunjungan Survei"}
              </h3>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setActiveWidget(null)}
              className="h-8 w-8 min-h-[36px] min-w-[36px] rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Tutup panel"
              aria-label="Tutup panel aktivitas"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel Body: CRM Leads */}
          {activeWidget === "crm" && (
            <div>
              <div className="divide-y divide-border/60">
                {leads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Belum ada prospek tercatat saat ini.
                  </div>
                ) : (
                  leads.slice(0, 4).map((lead) => {
                    const statusCfg = statusBadgeConfig[lead.status || "new"] || statusBadgeConfig.new;
                    return (
                      <div
                        key={lead.id}
                        className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground truncate">
                              {lead.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] font-semibold px-2 py-px border", statusCfg.color, statusCfg.bg)}
                            >
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Minat: <span className="text-foreground font-medium">{lead.property || "Properti Umum"}</span>
                          </p>
                        </div>

                        <Link href={`/crm/leads/${lead.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border-border/80"
                          >
                            Buka
                          </Button>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Menampilkan {Math.min(leads.length, 4)} dari {effectiveLeadsCount} prospek
                </span>
                <Link
                  href="/crm/leads"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua Prospek</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Panel Body: Follow Up */}
          {activeWidget === "followup" && (
            <div>
              <div className="divide-y divide-border/60">
                {followups.length === 0 ? (
                  <div className="p-6 text-center space-y-1">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Tidak ada follow-up mendesak
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Semua prospek telah dihubungi sesuai jadwal.
                    </p>
                  </div>
                ) : (
                  followups.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {item.scheduled_at}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Status: <span className="text-foreground font-medium">{item.status || "Terjadwal"}</span>
                        </p>
                      </div>

                      <Link href="/crm/followups">
                        <Button
                          size="sm"
                          className="h-7.5 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          Hubungi
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {overdueFollowupsCount > 0
                    ? `⚠️ ${overdueFollowupsCount} interaksi melewati tenggat`
                    : "Semua follow-up dalam rentang waktu aman"}
                </span>
                <Link
                  href="/crm/followups"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Lihat Agenda Follow-up</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Panel Body: Survei */}
          {activeWidget === "survey" && (
            <div>
              <div className="divide-y divide-border/60">
                {surveys.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Belum ada jadwal survei properti yang akan datang.
                  </div>
                ) : (
                  surveys.slice(0, 4).map((survey) => (
                    <div
                      key={survey.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground truncate">
                            {survey.client_name || "Klien Survei"}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {new Date(survey.scheduled_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{survey.property?.title || "Properti Kunjungan"}</span>
                        </p>
                      </div>

                      <Link href="/surveys">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border-border/80"
                        >
                          Agenda
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Total {effectiveSurveysCount} kunjungan terdaftar
                </span>
                <Link
                  href="/surveys"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua Survei</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
