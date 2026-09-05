// components/dashboard/AgentStatsGrid.tsx
"use client";

import {
  Users,
  CalendarCheck,
  Building2,
  Trophy,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKprShort } from "@/lib/kpr";

interface AgentStatsGridProps {
  myLeadsCount: number;
  newLeadsCount: number;
  scheduledFollowupsCount: number;
  overdueFollowupsCount: number;
  myPropertiesCount: number;
  myPublishedCount: number;
  dealsWonCount: number;
}

export function AgentStatsGrid({
  myLeadsCount,
  newLeadsCount,
  scheduledFollowupsCount,
  overdueFollowupsCount,
  myPropertiesCount,
  myPublishedCount,
  dealsWonCount,
}: AgentStatsGridProps) {
  const stats = [
    {
      title: "Prospek CRM Saya",
      value: myLeadsCount,
      subValue: `${newLeadsCount} Prospek Baru`,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Follow-Up Terjadwal",
      value: scheduledFollowupsCount,
      subValue: overdueFollowupsCount > 0 ? `⚠️ ${overdueFollowupsCount} Menunggu Aksi` : "Semua Tepat Waktu",
      icon: CalendarCheck,
      color: overdueFollowupsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400",
      bg: overdueFollowupsCount > 0 ? "bg-rose-500/10" : "bg-blue-500/10",
      border: overdueFollowupsCount > 0 ? "border-rose-500/20" : "border-blue-500/20",
    },
    {
      title: "Listing Portofolio",
      value: myPropertiesCount,
      subValue: `${myPublishedCount} Tayang Aktif`,
      icon: Building2,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Pencapaian Closing",
      value: dealsWonCount,
      subValue: "Kesepakatan Berhasil",
      icon: Trophy,
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
