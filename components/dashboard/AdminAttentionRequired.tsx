// components/dashboard/AdminAttentionRequired.tsx
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  ChevronRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AttentionItem {
  id: string;
  title: string;
  count: number;
  hint: string;
  href: string;
  tone: "danger" | "warning" | "info";
}

interface AdminAttentionRequiredProps {
  overdueFollowupsCount?: number;
  upcomingSurveysCount?: number;
  draftPropertiesCount?: number;
  newLeadsCount?: number;
}

export function AdminAttentionRequired({
  overdueFollowupsCount = 0,
  upcomingSurveysCount = 0,
  draftPropertiesCount = 0,
  newLeadsCount = 0,
}: AdminAttentionRequiredProps) {
  const items: AttentionItem[] = [
    {
      id: "followups",
      title: "Follow-up Agen Terlambat",
      count: overdueFollowupsCount,
      hint: "Prospek belum dihubungi tepat waktu",
      href: "/crm/followups",
      tone: "danger" as const,
    },
    {
      id: "surveys",
      title: "Jadwal Survei Lapangan",
      count: upcomingSurveysCount,
      hint: "Kunjungan properti dalam antrean",
      href: "/surveys",
      tone: "info" as const,
    },
    {
      id: "drafts",
      title: "Listing Berstatus Draf",
      count: draftPropertiesCount,
      hint: "Perlu kelengkapan data & review",
      href: "/properties",
      tone: "warning" as const,
    },
    {
      id: "leads",
      title: "Prospek Masuk Baru",
      count: newLeadsCount,
      hint: "Menunggu kualifikasi awal agen",
      href: "/crm/leads",
      tone: "info" as const,
    },
  ].filter((item) => item.count > 0);

  const totalAlerts = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="rounded-2xl border-border/80 shadow-2xs bg-card overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0",
            totalAlerts > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}>
            {totalAlerts > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
              Perlu Perhatian Operasional
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {totalAlerts > 0
                ? `${totalAlerts} hal membutuhkan supervisi manajemen`
                : "Semua alur operasional dan jadwal terpantau lancar"}
            </p>
          </div>
        </div>

        {totalAlerts > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] font-bold px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            {totalAlerts} Catatan
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border/60">
        {items.length === 0 ? (
          <div className="p-5 text-center space-y-1">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Kondisi Operasional Prima
            </p>
            <p className="text-[11px] text-muted-foreground">
              Tidak ada follow-up terlambat maupun draf yang tertunda.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="p-3 sm:px-4 flex items-center justify-between hover:bg-muted/40 transition-colors group cursor-pointer"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-px rounded-md border",
                      item.tone === "danger"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : item.tone === "warning"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    )}
                  >
                    {item.count}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {item.hint}
                </p>
              </div>

              <div className="shrink-0 flex items-center text-muted-foreground group-hover:text-foreground">
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
