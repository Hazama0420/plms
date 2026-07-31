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
    // Update jam otomatis setiap 1 menit
    const interval = setInterval(updateDateTime, 1000 * 60);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar (Fleksibel mengikuti ukuran collapsed AppSidebar) */}
      <div className="hidden md:flex shrink-0">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar (Sheet Drawer) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SheetTitle className="sr-only">Navigasi Sidebar</SheetTitle>
          <AppSidebar onClose={() => setSidebarOpen(false)} />
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
              className="md:hidden text-slate-600 dark:text-slate-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </Button>
            
            {/* BRAND HEADER: Inland (Hijau) Property (Putih/Gelap) */}
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