// app/(dashboard)/layout.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageLoader } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Mobile State: default false (tertutup)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 2. Desktop State: default false (melebar/terbuka)
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000 * 60);

    return () => clearInterval(interval);
  }, []);

  // Handler klik tombol menu hamburger
  const handleMenuToggle = () => {
    if (window.innerWidth < 768) {
      // Di Mobile: Buka Drawer
      setSidebarOpen(true);
    } else {
      // Di Desktop: Ciutkan / Melebarkan Sidebar
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Global Page Loading Overlay */}
      <Suspense fallback={null}>
        <PageLoader />
      </Suspense>

      {/* 🟢 DESKTOP SIDEBAR:
          Otomatis tampil & melebar di desktop karena `isCollapsed = false`.
          Class `hidden md:flex` membuat komponen ini tersembunyi di HP. */}
      <div className="hidden md:flex shrink-0 transition-all duration-300">
        <AppSidebar isCollapsed={isCollapsed} />
      </div>

      {/* 🟢 MOBILE SIDEBAR (Drawer Sheet):
          Otomatis tertutup di HP karena `sidebarOpen = false`.
          Baru muncul sebagai slide-over saat tombol hamburger diklik. */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SheetTitle className="sr-only">Navigasi Sidebar</SheetTitle>
          <AppSidebar onClose={() => setSidebarOpen(false)} isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 border-b px-4 md:px-6 flex items-center justify-between bg-background shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              onClick={handleMenuToggle}
              title="Buka / Tutup Sidebar"
            >
              <Menu size={22} />
            </Button>
            
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight select-none flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
              <span className="text-slate-900 dark:text-white">Property</span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground font-medium">
              <span>{dateStr}</span>
              <span className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
              <span>{timeStr}</span>
            </div>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Main View Area */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50",
            "pb-20 md:pb-6"
          )}
        >
          {children}
        </main>

        {/* Bottom Navigation - Mobile */}
        <BottomNav />
      </div>
    </div>
  );
}