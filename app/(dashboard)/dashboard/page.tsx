// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Home, Building2, Users, TrendingUp, Sparkles } from "lucide-react";
import { dashboardService, type DashboardStats } from "@/services/dashboard.service";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== FETCH STATS =====
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
        setError(err.message || "Gagal memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ===== AMBIL WAKTU =====
  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  // ===== ERROR =====
  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-slate-700">Gagal Memuat Dashboard</h2>
        <p className="text-slate-500 mt-2">{error || "Data tidak tersedia."}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6 pb-8">
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
              <Sparkles size={16} />
              <span>Dashboard</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Selamat datang di PLMS 👋
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Property Listing Management System
            </p>
          </div>
          <div className="flex flex-col items-end text-sm">
            <span className="text-slate-300">{timeStr}</span>
            <span className="text-xs text-slate-400">{dateStr}</span>
          </div>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Property"
          value={stats.totalProperties}
          icon={<Home size={22} />}
          trend={12}
          color="blue"
        />
        <StatsCard
          title="Active Listing"
          value={stats.activeListings}
          icon={<Building2 size={22} />}
          trend={8}
          color="green"
        />
        <StatsCard
          title="Today's Leads"
          value={stats.todayLeads}
          icon={<Users size={22} />}
          trend={-3}
          color="orange"
        />
        <StatsCard
          title="Registered Agent"
          value={stats.registeredAgents}
          icon={<TrendingUp size={22} />}
          trend={5}
          color="purple"
        />
      </div>

      {/* ===== CHART + ACTIVITY ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              📊 Statistik Properti
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Tahun {new Date().getFullYear()}
            </span>
          </div>
          <OverviewChart data={stats.monthlyData} />
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              🕐 Aktivitas Terbaru
            </h3>
            <span className="text-xs text-blue-500 hover:underline cursor-pointer">
              Lihat semua
            </span>
          </div>
          <RecentActivity activities={stats.recentActivities} />
        </div>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            ⚡ Aksi Cepat
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Klik untuk tindakan
          </span>
        </div>
        <QuickActions />
      </div>
    </div>
  );
}