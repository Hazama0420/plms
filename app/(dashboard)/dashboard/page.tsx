// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import DashboardHero from "@/components/dashboard/DashboardHero";
import { DashboardToolbar } from "@/components/dashboard/DashboardToolbar"; // <-- tambah
import KPICards from "@/components/dashboard/KPICards";
import PropertyStatusCards from "@/components/dashboard/PropertyStatusCards";
import LeadPipeline from "@/components/dashboard/LeadPipeline";
import ConstructionProgress from "@/components/dashboard/ConstructionProgress";
import RecentProperties from "@/components/dashboard/RecentProperties";
import RecentProjects from "@/components/dashboard/RecentProjects";
import MaterialInventory from "@/components/dashboard/MaterialInventory";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import RecentActivities from "@/components/dashboard/RecentActivities";
import FinancialOverview from "@/components/dashboard/FinancialOverview";
import CalendarWidget from "@/components/dashboard/CalendarWidget";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-12">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* HERO */}
        <DashboardHero />

        {/* TOOLBAR AKSI CEPAT DI ATAS */}
        <DashboardToolbar />

        {/* KPI CARDS */}
        <KPICards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <PropertyStatusCards />
          </div>
          <div>
            <WeatherWidget />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <LeadPipeline />
          <ConstructionProgress />
        </div>

        <FinancialOverview />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <RecentProperties />
          </div>
          <div>
            <RecentActivities />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <RecentProjects />
          <MaterialInventory />
        </div>

        <div className="mt-6">
          <CalendarWidget />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-12">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}