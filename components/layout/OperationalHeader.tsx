// components/layout/OperationalHeader.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { usePermissions } from "@/hooks/use-permissions";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface OperationalHeaderProps {
  onToggleMobileSidebar: () => void;
  onToggleCollapseSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Beranda",
  properties: "Direktori Properti",
  create: "Tambah Baru",
  edit: "Edit",
  "kpr-calculator": "Kalkulator KPR",
  crm: "CRM Pipeline",
  leads: "Leads",
  followups: "Follow-up",
  surveys: "Jadwal Survei",
  invoices: "Invoice & Keuangan",
  projects: "Proyek Konstruksi",
  reports: "Laporan & Analytics",
  admin: "Admin",
  users: "User Management",
  support: "Inbox Support",
  logs: "System Logs",
  ai: "AI Management",
  notifications: "Notifikasi",
  settings: "Pengaturan & Akun",
};

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400/20" },
  admin: { label: "Admin", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/20" },
  agent: { label: "Agen", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-400/20" },
  marketing: { label: "Marketing", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/20" },
  viewer: { label: "Viewer", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/20" },
};

export function OperationalHeader({
  onToggleMobileSidebar,
  onToggleCollapseSidebar,
  isSidebarCollapsed = false,
}: OperationalHeaderProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { userRole } = usePermissions();

  const [userName, setUserName] = useState<string>("Staf");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [dateTimeStr, setDateTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const time = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setDateTimeStr(`${date} • ${time}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (data?.full_name) {
          setUserName(data.full_name);
        } else if (user.email) {
          setUserName(user.email.split("@")[0]);
        }
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      } catch {
        // Fallback silently
      }
    }
    loadUserData();
  }, [user]);

  // Derive breadcrumb crumbs from pathname segments
  const breadcrumbs = useMemo(() => {
    if (!pathname || pathname === "/" || pathname === "/dashboard") {
      return [{ label: "Beranda", href: "/dashboard", isCurrent: true }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string; isCurrent: boolean }[] = [
      { label: "Beranda", href: "/dashboard", isCurrent: false },
    ];

    let currentHref = "";
    segments.forEach((segment, idx) => {
      currentHref += `/${segment}`;
      const isCurrent = idx === segments.length - 1;
      const mapped = ROUTE_LABELS[segment.toLowerCase()] || (segment.length > 16 ? `${segment.slice(0, 8)}...` : segment);
      crumbs.push({
        label: mapped,
        href: currentHref,
        isCurrent,
      });
    });

    return crumbs;
  }, [pathname]);

  const roleMeta = ROLE_DISPLAY[userRole] || { label: "Staf", color: "bg-slate-500/10 text-slate-700 border-slate-400/20" };

  return (
    <header className="sticky top-0 z-20 h-14 w-full border-b border-border/80 bg-background/95 backdrop-blur-md px-3 sm:px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 transition-all">
      {/* LEFT: Sidebar Toggles & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Hamburger (< lg, 44px touch target) */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
          onClick={onToggleMobileSidebar}
          title="Buka Navigasi Operasional"
          aria-label="Buka Navigasi Operasional"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop Sidebar Collapse Toggle (>= lg) */}
        {onToggleCollapseSidebar && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:flex h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onToggleCollapseSidebar}
            title={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            aria-label={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Vertical Divider */}
        <div className="hidden sm:block h-4 w-px bg-border/80 shrink-0" />

        {/* Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs truncate">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.href + idx} className="flex items-center gap-1.5 truncate">
              {idx > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              )}
              {crumb.isCurrent ? (
                <span className="font-semibold text-foreground truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* RIGHT: Live Clock, Notifications, Theme, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live Date/Time (Desktop only) */}
        {dateTimeStr && (
          <div className="hidden md:flex items-center text-[11px] font-mono text-muted-foreground/80 tabular-nums">
            <span>{dateTimeStr}</span>
          </div>
        )}

        {/* Notification Bell (Tier 2 density) */}
        <div className="scale-90">
          <NotificationBell />
        </div>

          {/* Language Switcher */}
          <div className="hidden sm:block scale-90">
            <LanguageSwitcher />
          </div>

          {/* Theme Toggle */}
          <div className="scale-90">
          <ThemeToggle />
        </div>

        {/* Vertical Divider */}
        <div className="hidden sm:block h-4 w-px bg-border/80" />

        {/* User Badge / Quick Link */}
        <Link
          href="/settings"
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-muted/60 transition-colors group cursor-pointer"
          title="Buka Pengaturan Akun"
        >
          <Avatar className="h-7 w-7 rounded-lg border border-border/60">
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt={userName} />
            ) : null}
            <AvatarFallback className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground line-clamp-1 max-w-[120px]">
              {userName}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/80 leading-none">
              {roleMeta.label}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
