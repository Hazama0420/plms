// app/(dashboard)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, CalendarCheck, LogIn } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeStr, setTimeStr] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      setDateStr(now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleTitipProperti = () => {
    // Coming soon — belum functional
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* SHEET DRAWER */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="p-0 w-64 max-w-64 border-r-0 shadow-2xl bg-card [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigasi Sidebar</SheetTitle>
          <AppSidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Area Utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar — 3 zona: kiri | tengah | kanan */}
        <header className="h-16 border-b px-4 md:px-6 flex items-center justify-between gap-2 bg-background shrink-0 z-20">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* KIRI: Menu + Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              title="Buka Menu Sidebar"
            >
              <Menu size={22} />
            </Button>

            <Link
              href="/dashboard"
              className="text-lg sm:text-xl font-extrabold tracking-tight select-none flex items-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer"
              title="Kembali ke Beranda Dashboard"
            >
              <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
              <span className="text-slate-900 dark:text-white">Property</span>
            </Link>
          </div>

          {/* TENGAH: Quick Access — hanya desktop */}
          <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
            {/* KPR */}
            <button
              type="button"
              onClick={() => router.push("/kpr-calculator")}
              className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              KPR
            </button>

            {/* Titip Properti (Soon) */}
            <button
              type="button"
              onClick={handleTitipProperti}
              className="relative text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2.5 py-1 rounded-lg cursor-not-allowed whitespace-nowrap"
              title="Segera Hadir"
            >
              Titip Properti
              <span className="absolute -top-1 -right-0.5 bg-emerald-600 text-[7px] text-white font-bold px-1 py-0.5 rounded-full uppercase leading-none">
                Soon
              </span>
            </button>

            {/* Jadwal Survey — emerald pill */}
            <button
              type="button"
              onClick={() => router.push("/surveys")}
              className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-full transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              <CalendarCheck size={12} />
              Jadwal Survey
            </button>
          </div>

          {/* KANAN: Date/Time + Bell + Theme + Login */}
          <div className="flex items-center gap-2 shrink-0">
            {timeStr && (
              <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground font-medium">
                <span>{dateStr}</span>
                <span className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                <span>{timeStr}</span>
              </div>
            )}
            <NotificationBell />
            <ThemeToggle />
            {!isLoggedIn && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/login")}
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold h-8 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer"
              >
                <LogIn size={13} />
                Login
              </Button>
            )}
          </div>
          </div>
        </header>

        {/* Content Area — key=pathname untuk trigger fade-in per navigasi */}
        <main
          key={pathname}
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 fade-in-up",
            "pb-28 sm:pb-24 md:pb-6"
          )}
        >
          {children}

          <SiteFooter className="mt-6 -mx-4 -mb-28 pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:mt-8 sm:-mb-24 md:-mx-6 md:-mb-6 md:pb-0" />
        </main>

        {/* Bottom Navigation Khusus Mobile */}
        <BottomNav />
      </div>
    </div>
  );
}
