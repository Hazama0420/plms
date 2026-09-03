// components/layout/ERPSidebar.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Building2,
  Building,
  Calculator,
  Users2,
  CalendarDays,
  CalendarCheck,
  Receipt,
  BarChart3,
  ShieldCheck,
  BellRing,
  Sliders,
  LogOut,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  ActivitySquare,
  Plus,
  UserCheck2,
  LayoutGrid,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePermissions } from "@/hooks/use-permissions";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface ERPSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  className?: string;
}

interface NavItem {
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  href: string;
  exact?: boolean;
  createHref?: string;
  roles?: ("super_admin" | "admin" | "agent" | "marketing" | "viewer")[];
  children?: NavItem[];
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: "Operasional",
    items: [
      {
        label: "Beranda",
        shortLabel: "Beranda",
        icon: Compass,
        href: "/dashboard",
        exact: true,
      },
      {
        label: "Direktori Properti",
        shortLabel: "Properti",
        icon: Building2,
        href: "/properties",
        createHref: "/properties/create",
        roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
      },
      {
        label: "Kalkulator KPR",
        shortLabel: "KPR",
        icon: Calculator,
        href: "/kpr-calculator",
        roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
      },
      {
        label: "CRM Pipeline",
        shortLabel: "CRM",
        icon: Users2,
        href: "/crm",
        roles: ["super_admin", "admin", "agent", "marketing"],
        children: [
          { label: "Pipeline Kanban", icon: LayoutGrid, href: "/crm", exact: true, roles: ["super_admin", "admin", "agent", "marketing"] },
          { label: "Leads", icon: UserCheck2, href: "/crm/leads", roles: ["super_admin", "admin", "agent", "marketing"] },
          { label: "Jadwal Follow-up", icon: CalendarDays, href: "/crm/followups", roles: ["super_admin", "admin", "agent", "marketing"] },
        ],
      },
      {
        label: "Jadwal Survei",
        shortLabel: "Survei",
        icon: CalendarCheck,
        href: "/surveys",
        roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
      },
    ],
  },
  {
    groupTitle: "Manajemen",
    items: [
      {
        label: "Invoice & Keuangan",
        shortLabel: "Invoice",
        icon: Receipt,
        href: "/invoices",
        createHref: "/invoices/create",
        roles: ["super_admin", "admin"],
      },
      {
        label: "Proyek Konstruksi",
        shortLabel: "Proyek",
        icon: Building,
        href: "/projects",
        createHref: "/projects/create",
        roles: ["super_admin", "admin", "agent", "marketing"],
      },
      {
        label: "Laporan & Analytics",
        shortLabel: "Laporan",
        icon: BarChart3,
        href: "/reports",
        roles: ["super_admin", "admin", "agent", "marketing"],
      },
      {
        label: "Admin Panel",
        shortLabel: "Admin",
        icon: ShieldCheck,
        href: "/admin",
        roles: ["super_admin", "admin"],
        children: [
          { label: "User Management", icon: Users2, href: "/admin/users", roles: ["super_admin", "admin"] },
          { label: "Inbox Support", icon: MessageSquareText, href: "/admin/support", roles: ["super_admin", "admin"] },
          { label: "System Logs", icon: ActivitySquare, href: "/admin/logs", roles: ["super_admin", "admin"] },
          { label: "AI Management", icon: Bot, href: "/admin/ai", roles: ["super_admin"] },
        ],
      },
    ],
  },
  {
    groupTitle: "Sistem",
    items: [
      {
        label: "Notifikasi",
        shortLabel: "Notifikasi",
        icon: BellRing,
        href: "/notifications",
        roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
      },
      {
        label: "Pengaturan & Akun",
        shortLabel: "Pengaturan",
        icon: Sliders,
        href: "/settings",
      },
    ],
  },
];

export function ERPSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
  className,
}: ERPSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { userRole } = usePermissions();

  const [userName, setUserName] = useState("Staf");
  const [userAvatar, setUserAvatar] = useState("");
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    crm_pipeline: true,
  });

  const isMobileDrawer = !!onCloseMobile;

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
        // Fallback
      }
    }
    loadUserData();
  }, [user]);

  // Pending survey requests badge
  useEffect(() => {
    if (!user || !userRole) return;
    if (!["super_admin", "admin", "agent"].includes(userRole)) {
      setPendingRequestCount(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/surveys/requests");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const pending = (json.data ?? []).filter(
          (r: { status: string }) => r.status === "pending"
        );
        setPendingRequestCount(pending.length);
      } catch {
        // Non-blocking
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userRole, pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar dari sistem PLMS");
      router.push("/login");
      if (onCloseMobile) onCloseMobile();
    } catch {
      toast.error("Gagal logout");
    }
  };

  const navigateItem = (href: string) => {
    router.push(href);
    if (onCloseMobile) onCloseMobile();
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return item.roles.includes("viewer");
    if (!userRole) return true;
    return item.roles.includes(userRole as any);
  };

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href) ?? false;
  };

  const hasActiveChild = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) =>
      child.exact ? pathname === child.href : pathname?.startsWith(child.href)
    );
  };

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Determine width based on collapse state (forced full in mobile drawer)
  const sidebarWidth = isMobileDrawer
    ? "w-64"
    : isCollapsed
    ? "w-16"
    : "w-64";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border/80 select-none transition-[width] duration-200 shrink-0 z-20",
        sidebarWidth,
        className
      )}
    >
      {/* 1. BRAND HEADER */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-border/80 px-3 shrink-0",
          isCollapsed && !isMobileDrawer ? "justify-center" : "justify-between"
        )}
      >
        {isCollapsed && !isMobileDrawer ? (
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/80 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm transition-colors cursor-pointer"
            title="Inland Property — Klik untuk memperluas sidebar"
            aria-label="Perluas Sidebar"
          >
            IP
          </button>
        ) : (
          <>
            <Link
              href="/dashboard"
              onClick={() => onCloseMobile?.()}
              className="flex items-center gap-1.5 text-base font-extrabold tracking-tight hover:opacity-90 transition-opacity cursor-pointer pl-1"
              title="Inland Property PLMS"
            >
              <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
              <span className="text-foreground">Property</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded ml-1">
                ERP
              </span>
            </Link>

            {isMobileDrawer ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onCloseMobile}
                className="h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
                title="Tutup menu"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </Button>
            ) : onToggleCollapse ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hidden lg:flex"
                title="Ciutkan Sidebar"
                aria-label="Ciutkan Sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            ) : null}
          </>
        )}
      </div>

      {/* 2. NAVIGATION GROUPS (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(canSeeItem);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.groupTitle} className="space-y-1">
              {/* Group Header (only when expanded) */}
              {(!isCollapsed || isMobileDrawer) && (
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {group.groupTitle}
                </p>
              )}

              {visibleItems.map((item) => {
                const active = isActive(item);
                const activeChild = hasActiveChild(item);
                const hasChildren = item.children && item.children.length > 0;
                const key = item.label.toLowerCase().replace(/\s/g, "_");
                const isExpanded = expandedItems[key] ?? false;
                const visibleChildren = hasChildren ? item.children!.filter(canSeeItem) : [];
                const showPendingBadge = item.href === "/surveys" && pendingRequestCount > 0;

                // Collapsed View (Icons with tooltips)
                if (isCollapsed && !isMobileDrawer) {
                  return (
                    <div key={item.href} className="relative flex justify-center py-0.5">
                      <button
                        onClick={() => navigateItem(item.href)}
                        className={cn(
                          "relative flex items-center justify-center h-10 w-10 rounded-lg transition-all cursor-pointer",
                          active || activeChild
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                        title={item.label}
                        aria-label={item.label}
                      >
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px]",
                            active || activeChild ? "stroke-[2.5]" : "stroke-2"
                          )}
                        />
                        {showPendingBadge && (
                          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card" />
                        )}
                      </button>
                    </div>
                  );
                }

                // Expanded View with Accordion
                if (visibleChildren.length > 0) {
                  return (
                    <Collapsible
                      key={item.href}
                      open={isExpanded}
                      onOpenChange={() => toggleExpand(key)}
                      className="space-y-0.5"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors group",
                          active || activeChild
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <button
                          onClick={() => toggleExpand(key)}
                          className="flex items-center gap-2.5 flex-1 text-left cursor-pointer min-h-[36px]"
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active || activeChild ? "text-emerald-600 stroke-[2.5]" : "stroke-2"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>

                        <CollapsibleTrigger
                          className="p-1 hover:bg-muted/80 rounded-md text-muted-foreground transition-colors cursor-pointer"
                          aria-label={isExpanded ? "Tutup sub-menu" : "Buka sub-menu"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="space-y-0.5 ml-3 pl-2.5 border-l-2 border-emerald-500/20 dark:border-emerald-500/10 my-0.5">
                        {visibleChildren.map((child) => {
                          const childActive = isActive(child);
                          return (
                            <button
                              key={child.href}
                              onClick={() => navigateItem(child.href)}
                              className={cn(
                                "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer min-h-[32px]",
                                childActive
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              )}
                            >
                              <child.icon
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0",
                                  childActive ? "text-emerald-600 stroke-[2.5]" : "stroke-2"
                                )}
                              />
                              <span className="truncate">{child.label}</span>
                            </button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }

                // Standard Single Nav Item
                return (
                  <div
                    key={item.href}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors group",
                      active
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <button
                      onClick={() => navigateItem(item.href)}
                      className="flex items-center gap-2.5 flex-1 text-left cursor-pointer min-h-[36px]"
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-emerald-600 stroke-[2.5]" : "stroke-2"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {showPendingBadge && (
                        <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-amber-950">
                          {pendingRequestCount}
                        </span>
                      )}

                      {item.createHref && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateItem(item.createHref!);
                          }}
                          className="p-1 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-600 rounded-md transition-colors cursor-pointer"
                          title={`Tambah ${item.shortLabel || item.label}`}
                          aria-label={`Tambah ${item.shortLabel || item.label}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. FOOTER USER PROFILE & LOGOUT */}
      <div className="p-2.5 border-t border-border/80 shrink-0 bg-muted/20">
        {isCollapsed && !isMobileDrawer ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => navigateItem("/settings")}
              className="cursor-pointer"
              title={`Akun: ${userName}`}
              aria-label="Pengaturan Akun"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-border/60">
                {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
                <AvatarFallback className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Keluar Akun"
              aria-label="Keluar Akun"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-card border border-border/60">
            <button
              onClick={() => navigateItem("/settings")}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-border/60 shrink-0">
                {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
                <AvatarFallback className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  {userRole.replace("_", " ")}
                </p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Keluar dari sistem"
              aria-label="Keluar dari sistem"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
