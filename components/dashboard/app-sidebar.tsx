// components/dashboard/app-sidebar.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  LayoutDashboard,
  Home,
  Building2,
  Users,
  Calendar,
  FileText,
  FileBarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Shield,
  ChevronDown,
  ChevronUp,
  Bell,
  CalendarCheck,
  Plus,
  Calculator,
  MessageSquare,
  Activity,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================
// TYPES
// ============================================================

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  exact?: boolean;
  createHref?: string;
  roles?: ("super_admin" | "admin" | "agent" | "marketing" | "viewer")[];
  children?: NavItem[];
}

// ============================================================
// NAVIGATION ITEMS (KONTROL AKSES ROLE)
// ============================================================

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    exact: true,
  },
  {
    label: "Properties",
    icon: Home,
    href: "/properties",
    createHref: "/properties/create",
    roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
  },
  {
    label: "Kalkulator KPR",
    icon: Calculator,
    href: "/kpr-calculator",
    roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
  },
  {
    label: "CRM",
    icon: Users,
    href: "/crm",
    roles: ["super_admin", "admin", "agent", "marketing"],
    children: [
      { label: "Leads", icon: Users, href: "/crm/leads", roles: ["super_admin", "admin", "agent", "marketing"] },
      { label: "Follow-ups", icon: CalendarCheck, href: "/crm/followups", roles: ["super_admin", "admin", "agent", "marketing"] },
    ],
  },
  {
    label: "Proyek Konstruksi",
    icon: Building2,
    href: "/projects",
    createHref: "/projects/create",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
  {
    label: "Jadwal Survei",
    icon: Calendar,
    href: "/surveys",
    createHref: "/surveys/create",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
  {
    label: "Invoice",
    icon: FileText,
    href: "/invoices",
    createHref: "/invoices/create",
    roles: ["super_admin", "admin"],
  },
  {
    label: "Reports",
    icon: FileBarChart,
    href: "/reports",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
  {
    label: "Admin",
    icon: Shield,
    href: "/admin",
    roles: ["super_admin", "admin"],
    children: [
      { label: "User Management", icon: Users, href: "/admin/users", roles: ["super_admin", "admin"] },
      { label: "Inbox Support", icon: MessageSquare, href: "/admin/support", roles: ["super_admin", "admin"] },
      // 🟢 Subhalaman Logs ditambahkan di sini secara rapi dan terstruktur
      { label: "System Logs", icon: Activity, href: "/admin/logs", roles: ["super_admin", "admin"] },
    ],
  },
  {
    label: "Notifikasi",
    icon: Bell,
    href: "/notifications",
    roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { userRole, isLoading: roleLoading } = usePermissions();
  const { user, isLoading: userLoading } = useUser();

  const [collapsed, setCollapsed] = useState(false);
  const [userFullName, setUserFullName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    crm: true,
    admin: true,
  });

  const isLoading = userLoading || (!!user && roleLoading);
  const isViewer = !user || userRole === "viewer";

  const navigateAndClose = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setUserFullName("Tamu");
        setUserAvatar("");
        return;
      }
      try {
        const { data, error } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error || !data) {
          setUserFullName(user.email?.split("@")[0] || "User");
          setUserAvatar("");
          return;
        }

        setUserFullName(data.full_name || user.email?.split("@")[0] || "User");
        setUserAvatar(data.avatar_url || "");
      } catch (err) {
        setUserFullName(user.email?.split("@")[0] || "User");
        setUserAvatar("");
      }
    }
    loadUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar sistem");
      router.push("/");
      if (onClose) onClose();
    } catch (error) {
      toast.error("Gagal logout");
    }
  };

  const toggleCollapse = () => setCollapsed(!collapsed);

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href) ?? false;
  };

  const hasActiveChild = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => pathname?.startsWith(child.href));
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return item.roles.includes("viewer");
    if (!userRole) return true;
    return item.roles.includes(userRole as any);
  };

  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(canSeeItem);
  }, [userRole, user]);

  const getInitials = (name: string) => {
    if (!name) return "IP";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ============================================================
  // RENDER NAV ITEM
  // ============================================================

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const key = item.label.toLowerCase().replace(/\s/g, "_");
    const isExpanded = expandedItems[key] ?? false;
    const hasChildActive = hasActiveChild(item);
    
    const hasCreateButton = !!item.createHref && !isViewer;

    const visibleChildren = hasChildren
      ? item.children!.filter(canSeeItem)
      : [];

    // ===== COLLAPSED STATE =====
    if (collapsed) {
      return (
        <TooltipProvider key={item.href}>
          <Tooltip>
            <TooltipTrigger
              onClick={() => navigateAndClose(item.href)}
              className={cn(
                "flex items-center justify-center w-full h-10 rounded-xl transition-all duration-200 relative cursor-pointer",
                active || hasChildActive
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <item.icon size={19} />
              {(active || hasChildActive) && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
              )}
              {hasCreateButton && !isViewer && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-bold">
                  +
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold text-xs rounded-lg">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // ===== EXPANDED STATE WITH CHILDREN =====
    if (visibleChildren.length > 0) {
      return (
        <Collapsible
          key={item.href}
          open={isExpanded}
          onOpenChange={() => toggleExpand(key)}
          className="space-y-1"
        >
          <CollapsibleTrigger
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer",
              active || hasChildActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <item.icon size={17} className={cn((active || hasChildActive) && "text-emerald-600 dark:text-emerald-400")} />
              <span>{item.label}</span>
            </span>
            {isExpanded ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 ml-3.5 pl-2.5 border-l-2 border-emerald-500/20 dark:border-emerald-500/10 my-0.5">
            {visibleChildren.map((child) => (
              <button
                key={child.href}
                onClick={() => navigateAndClose(child.href)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200 text-xs w-full text-left cursor-pointer",
                  isActive(child)
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <child.icon size={14} />
                <span>{child.label}</span>
                {isActive(child) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs" />
                )}
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // ===== EXPANDED STATE WITHOUT CHILDREN =====
    return (
      <div key={item.href} className="relative flex items-center group">
        <button
          onClick={() => navigateAndClose(item.href)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-xs font-semibold flex-1 w-full text-left cursor-pointer relative",
            active
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
        >
          {active && (
            <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
          )}
          <item.icon size={17} className={cn(active && "text-emerald-600 dark:text-emerald-400")} />
          <span>{item.label}</span>
          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-2xs" />}
        </button>

        {hasCreateButton && !isViewer && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500/20 rounded-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigateAndClose(item.createHref!);
            }}
            title={`Tambah ${item.label}`}
          >
            <Plus size={13} className="text-emerald-600 dark:text-emerald-400" />
          </Button>
        )}
      </div>
    );
  };

  // ============================================================
  // LOADING SKELETON
  // ============================================================

  if (isLoading) {
    return (
      <aside
        className={cn(
          "relative flex flex-col border-r border-border/70 bg-card text-card-foreground h-[100dvh] max-h-[100dvh] overflow-hidden shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex items-center h-16 px-4 border-b border-border/60 justify-between shrink-0">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <div className="flex-1 px-3 py-4 space-y-2 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-xl" />
          ))}
        </div>
        <div className="border-t border-border/60 p-3 space-y-2 shrink-0 bg-muted/20">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </aside>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border/70 bg-card/95 backdrop-blur-md text-card-foreground transition-all duration-300 h-[100dvh] max-h-[100dvh] overflow-hidden shrink-0 select-none",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* 1. HEADER BRAND */}
      <div
        className={cn(
          "flex items-center h-16 px-3.5 border-b border-border/65 shrink-0 bg-card/50",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <button
            onClick={() => navigateAndClose("/dashboard")}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-xs tracking-wider">IP</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-none flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">Inland</span>{" "}
                <span className="text-slate-900 dark:text-white">Property</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-mono mt-0.5">Management System</span>
            </div>
          </button>
        )}

        {collapsed && (
          <button
            onClick={() => navigateAndClose("/dashboard")}
            className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <span className="text-white font-black text-xs">IP</span>
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl cursor-pointer",
            collapsed &&
              "absolute -right-3.5 top-4 rounded-full border border-border bg-card shadow-md z-20 h-6 w-6"
          )}
          onClick={toggleCollapse}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      {/* 2. MIDDLE NAVIGATION LINKS (COMPACT & RAPIH TANPA TERLIHAT SESAK) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto px-2.5 py-2.5 space-y-0.5 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30">
        <nav className="space-y-0.5">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>
      </div>

      {/* 3. FOOTER CONTROL BAR */}
      <div className="border-t border-border/70 p-2.5 space-y-1.5 shrink-0 bg-muted/20">
        {/* Toggle Dark Mode */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground hover:bg-accent text-xs h-8 rounded-xl cursor-pointer",
            collapsed && "justify-center px-0"
          )}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun size={15} className="text-amber-500 shrink-0" />
          ) : (
            <Moon size={15} className="text-slate-600 dark:text-slate-400 shrink-0" />
          )}
          {!collapsed && (
            <span className="text-xs font-semibold">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
          )}
        </Button>

        {/* User Card */}
        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-xl transition-all w-full text-left bg-card border border-border/60 hover:border-emerald-500/40 hover:bg-accent/50 cursor-pointer shadow-2xs group",
            collapsed && "justify-center border-none bg-transparent p-0"
          )}
          onClick={() => navigateAndClose("/settings")}
        >
          <Avatar className="h-7 w-7 border border-emerald-500/30 shrink-0 shadow-2xs">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              {getInitials(userFullName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {userFullName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate capitalize leading-none mt-0.5">
                {user ? (userRole ? userRole.replace("_", " ") : "Pengguna") : "Tamu"}
              </p>
            </div>
          )}
        </button>

        {/* Logout Button */}
        {user && (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
              "w-full justify-start gap-2.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 text-xs h-8 rounded-xl cursor-pointer",
              collapsed && "justify-center px-0"
            )}
            onClick={handleLogout}
          >
            <LogOut size={15} className="shrink-0" />
            {!collapsed && <span className="text-xs font-semibold">Keluar Akun</span>}
          </Button>
        )}
      </div>
    </aside>
  );
}