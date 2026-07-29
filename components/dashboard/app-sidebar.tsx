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
  User,
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
    createHref: "/properties/create", // Tombol create akan otomatis disembunyikan untuk viewer di logic render
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
    // 🔒 Viewer tidak diizinkan mengakses menu CRM
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
    children: [{ label: "User Management", icon: Users, href: "/admin/users", roles: ["super_admin", "admin"] }],
  },
  {
    label: "Notifikasi",
    icon: Bell,
    href: "/notifications",
    roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
  },
  {
    label: "Profile",
    icon: User,
    href: "/profile",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

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
    admin: false,
  });

  const isLoading = roleLoading || userLoading;
  const isViewer = userRole === "viewer";

  const navigateAndClose = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
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
      toast.success("Berhasil logout");
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
    if (!userRole) return true;
    return item.roles.includes(userRole as any);
  };

  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(canSeeItem);
  }, [userRole]);

  const getInitials = (name: string) => {
    if (!name) return "?";
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
    
    // 🔒 Sembunyikan tombol create (+) jika user adalah viewer
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
                "flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200 relative cursor-pointer",
                active || hasChildActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <item.icon size={20} />
              {hasCreateButton && !isViewer && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">
                  +
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-xs">
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
              "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
              active || hasChildActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon size={18} />
              <span>{item.label}</span>
            </span>
            {isExpanded ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 ml-4 pl-2 border-l border-slate-200/60 dark:border-slate-700/60">
            {visibleChildren.map((child) => (
              <button
                key={child.href}
                onClick={() => navigateAndClose(child.href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm w-full text-left",
                  isActive(child)
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <child.icon size={16} />
                <span>{child.label}</span>
                {isActive(child) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium flex-1 w-full text-left",
            active
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          )}
        >
          <item.icon size={18} />
          <span>{item.label}</span>
          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>

        {hasCreateButton && !isViewer && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              navigateAndClose(item.createHref!);
            }}
            title={`Tambah ${item.label}`}
          >
            <Plus size={14} className="text-emerald-600 dark:text-emerald-400" />
          </Button>
        )}
      </div>
    );
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading) {
    return (
      <aside
        className={cn(
          "relative flex flex-col border-r border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 h-screen",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center h-16 px-4 border-b border-slate-200/60 dark:border-slate-800/60 justify-between">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex-1 px-3 py-4 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-3 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
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
        "relative flex flex-col border-r border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 transition-all duration-300 h-screen shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header Brand */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-slate-200/60 dark:border-slate-800/60",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <button
            onClick={() => navigateAndClose("/dashboard")}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">
              Inland
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 font-medium"
            >
              v2
            </Badge>
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => navigateAndClose("/dashboard")}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/25"
          >
            <span className="text-white font-bold text-sm">IP</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
            collapsed &&
              "absolute -right-4 top-4 rounded-full border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-md hover:shadow-lg z-20"
          )}
          onClick={toggleCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* Bottom Section (Dark Mode, Profile, Logout) */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-3 space-y-2">
        {/* Toggle Theme */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full justify-start gap-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs h-9",
            collapsed && "justify-center px-0"
          )}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-500" />}
          {!collapsed && (
            <span className="text-xs">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
          )}
        </Button>

        {/* Profil User */}
        <button
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-lg transition-colors w-full text-left hover:bg-slate-100 dark:hover:bg-slate-800 group",
            collapsed && "justify-center"
          )}
          onClick={() => navigateAndClose("/profile")}
        >
          <Avatar className="h-7 w-7 ring-2 ring-emerald-200 dark:ring-emerald-800/60 ring-offset-1 ring-offset-white dark:ring-offset-slate-950">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-bold">
              {getInitials(userFullName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {userFullName}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
          )}
        </button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full justify-start gap-3 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-9",
            collapsed && "justify-center px-0"
          )}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-xs">Keluar Log</span>}
        </Button>
      </div>
    </aside>
  );
}