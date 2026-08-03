// app/(dashboard)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Tombol menu sekarang memicu sheet drawer untuk membuka sidebar dari kiri secara mulus di semua ukuran layar
  const handleMenuToggle = () => {
    setSidebarOpen(true);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">

      {/* 🟢 SHEET DRAWER TANPA TOMBOL X BAWAAN & TANPA SPACE PUTIH KOSONG */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
  <SheetContent
    side="left"
    className="p-0 w-64 max-w-64 border-r-0 shadow-2xl bg-card [&>button]:hidden"
  >
    <SheetTitle className="sr-only">Navigasi Sidebar</SheetTitle>
    <AppSidebar onClose={() => setSidebarOpen(false)} />
  </SheetContent>
</Sheet>

      {/* Area Utama (Layar Penuh / Clean View) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-16 border-b px-4 md:px-6 flex items-center justify-between bg-background shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              onClick={handleMenuToggle}
              title="Buka Menu Sidebar"
            >
              <Menu size={22} />
            </Button>
            
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight select-none flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
              <span className="text-slate-900 dark:text-white">Property</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground font-medium">
              <span>{dateStr}</span>
              <span className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
              <span>{timeStr}</span>
            </div>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Content Area (Lebar penuh optimal tanpa terpotong sidebar permanen) */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50",
            "pb-28 sm:pb-24 md:pb-6"
          )}
        >
          {children}
        </main>

        {/* Bottom Navigation Khusus Mobile */}
        <BottomNav />
      </div>
    </div>
  );
}