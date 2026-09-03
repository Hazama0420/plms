// components/layout/bottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  Calculator,
  LogIn,
  CalendarDays,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { userRole } = usePermissions();

  const isGuest = !user;
  const isAgentOrAdmin = userRole && ["super_admin", "admin", "agent", "marketing"].includes(userRole);
  const isViewer = !!user && !isAgentOrAdmin;

  // Daftar item navigasi dinamis berdasarkan status login / role
  const NAV_ITEMS = [
    {
      icon: LayoutDashboard,
      label: "Beranda",
      href: "/dashboard",
      exact: true,
    },
    {
      icon: Building2,
      label: "Properti",
      href: "/properties",
    },
    // Jika agen/admin tampilkan CRM Leads, jika guest/viewer tampilkan Kalkulator KPR
    isAgentOrAdmin
      ? { icon: Users, label: "Leads", href: "/crm/leads" }
      : { icon: Calculator, label: "KPR", href: "/kpr-calculator" },
    // Invoice hanya untuk agen/admin; viewer dan guest melihat Survei
    (isGuest || isViewer)
      ? { icon: CalendarDays, label: "Survei", href: "/surveys" }
      : { icon: FileText, label: "Invoice", href: "/invoices" },
    // Jika belum login tampilkan "Login", jika sudah tampilkan "Pengaturan"
    isGuest
      ? { icon: LogIn, label: "Login", href: "/login" }
      : { icon: Settings, label: "Pengaturan", href: "/settings" },
  ];

  return (
    <nav aria-label="Menu navigasi utama" className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-lg border-t border-border/60 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-15 px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, href, exact }) => {
          const isActive = exact
            ? pathname === href || pathname === "/"
            : pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-all duration-200 select-none cursor-pointer",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              {/* Indicator Garis Aktif Atas */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-b-full shadow-xs shadow-emerald-500/50" />
              )}

              <div
                className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive && "bg-emerald-500/10 dark:bg-emerald-500/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isActive ? "stroke-[2.5]" : "stroke-[1.75]"
                  )}
                />
              </div>

              <span className="truncate max-w-[64px] text-center leading-none mt-0.5">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}