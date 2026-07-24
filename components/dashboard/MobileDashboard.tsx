"use client";

import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { QuickAction } from "@/components/dashboard/QuickAction";
import RecentActivities from "@/components/dashboard/RecentActivities";
import { Plus, FileText, Users, Home, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function MobileDashboard() {
  // Data dummy sementara – nanti bisa dihubungkan ke service
  const [stats, setStats] = useState({
    userName: "Admin",
    revenueFormatted: "Rp 12.4B",
    revenueTrend: "+12%",
    activeProjects: 8,
    newLeads: 24,
    todaySchedule: 3,
  });
  const [loading, setLoading] = useState(false);

  // Jika ingin pakai data real, aktifkan ini:
  // useEffect(() => {
  //   dashboardService.getStats().then(setStats).catch(() => setLoading(false));
  // }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-20 md:pb-0 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Selamat pagi,</p>
          <h2 className="text-2xl font-bold tracking-tight">
            {stats?.userName || "Admin"}
          </h2>
        </div>
      </div>

      {/* KPI Grid 2 Kolom */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Revenue Bulan Ini"
          value={stats?.revenueFormatted || "Rp 0"}
          trend={stats?.revenueTrend}
          icon={<Building2 className="w-4 h-4" />}
        />
        <KpiCard
          label="Proyek Aktif"
          value={stats?.activeProjects || 0}
          icon={<Home className="w-4 h-4" />}
        />
        <KpiCard
          label="Leads Baru"
          value={stats?.newLeads || 0}
          badge="+5%"
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          label="Jadwal Hari Ini"
          value={stats?.todaySchedule || 0}
          icon={<FileText className="w-4 h-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Aksi Cepat
        </p>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            <QuickAction icon={Plus} label="Lead" href="/crm/leads/create" />
            <QuickAction icon={FileText} label="Survei" href="/surveys" />
            <QuickAction icon={FileText} label="Invoice" href="/invoices/create" />
            <QuickAction icon={Home} label="Properti" href="/properties/create" />
            <QuickAction icon={Users} label="Follow-up" href="/crm/followups/create" />
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Widget Tambahan */}
      <div className="space-y-4">
        <RecentActivities />
      </div>
    </div>
  );
}