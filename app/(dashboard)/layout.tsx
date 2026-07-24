"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
    const now = new Date();
    setTimeStr(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    setDateStr(now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }, []);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r bg-card shrink-0 overflow-y-auto">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <AppSidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b px-4 md:px-6 flex items-center justify-between bg-background shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </Button>
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
              <span>{dateStr}</span>
              <span className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
              <span>{timeStr}</span>
            </div>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50",
          "pb-20 md:pb-6"
        )}>
          {children}
        </main>

        {/* Bottom Navigation - Mobile */}
        <BottomNav />
      </div>
    </div>
  );
}