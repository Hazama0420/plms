// app/(dashboard)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StorefrontNavbar } from "@/components/layout/StorefrontNavbar";
import { ERPSidebar } from "@/components/layout/ERPSidebar";
import { OperationalHeader } from "@/components/layout/OperationalHeader";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isAgent, isAdmin, isSuperAdmin, isMarketing, isLoading } = usePermissions();
  const isStaff = isAgent || isAdmin || isSuperAdmin || isMarketing;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("plms_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("plms_sidebar_collapsed", String(next));
      } catch {
        // Non-blocking
      }
      return next;
    });
  };

  // Close mobile drawer on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // =========================================================================
  // 1. PUBLIC STOREFRONT SHELL (Guests & Viewers)
  // =========================================================================
  if (!isStaff && !isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background">
        {/* Public Storefront Navbar */}
        <StorefrontNavbar isLoggedIn={isLoggedIn} showStaffMenu={false} />

        {/* Public Content Surface */}
        <main
          key={pathname}
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 fade-in-up",
            "pb-28 sm:pb-24 md:pb-6"
          )}
        >
          {children}

          <SiteFooter className="mt-8 -mx-4 -mb-28 pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:mt-10 sm:-mb-24 md:-mx-6 md:-mb-6 md:pb-0" />
        </main>

        {/* Public Mobile Bottom Nav */}
        <BottomNav />
      </div>
    );
  }

  // =========================================================================
  // 2. ERP OPERATIONAL SHELL (Staff: Agent, Marketing, Admin, Super Admin)
  // =========================================================================
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* MOBILE SHEET DRAWER FOR ERP SIDEBAR (< lg) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 w-64 max-w-64 border-r-0 shadow-2xl bg-card"
        >
          <SheetTitle className="sr-only">Navigasi Operasional PLMS</SheetTitle>
          <ERPSidebar onCloseMobile={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* DESKTOP PERSISTENT COLLAPSIBLE SIDEBAR (>= lg) */}
      <ERPSidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        className="hidden lg:flex"
      />

      {/* FLUID MAIN OPERATIONAL AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tier 2 Operational Header */}
        <OperationalHeader
          onToggleMobileSidebar={() => setSidebarOpen(true)}
          onToggleCollapseSidebar={handleToggleCollapse}
          isSidebarCollapsed={sidebarCollapsed}
        />

        {/* Operational Content Scroll Viewport */}
        <main
          key={pathname}
          className={cn(
            "flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 fade-in-up scrollbar-thin",
            "pb-28 sm:pb-24 md:pb-6"
          )}
        >
          {children}
        </main>

        {/* Staff Bottom Nav for Mobile */}
        <BottomNav />
      </div>
    </div>
  );
}
