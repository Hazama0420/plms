"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Compass,
  Building,
  Calculator,
  Users2,
  CalendarDays,
  Receipt,
  BarChart3,
  ShieldCheck,
  BellRing,
  Sliders,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  ActivitySquare,
  Plus,
  UserCheck2,
  LayoutGrid,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  exact?: boolean;
  createHref?: string;
  roles?: ("super_admin" | "admin" | "agent" | "marketing" | "viewer")[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Beranda",
    icon: Compass,
    href: "/dashboard",
    exact: true,
  },
  {
    label: "Properti",
    icon: Building,
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
    icon: Users2,
    href: "/crm",
    roles: ["super_admin", "admin", "agent", "marketing"],
    children: [
      { label: "Pipeline Kanban", icon: LayoutGrid, href: "/crm", exact: true, roles: ["super_admin", "admin", "agent", "marketing"] },
      { label: "Leads", icon: UserCheck2, href: "/crm/leads", roles: ["super_admin", "admin", "agent", "marketing"] },
      { label: "Follow-ups", icon: CalendarDays, href: "/crm/followups", roles: ["super_admin", "admin", "agent", "marketing"] },
    ],
  },
  {
    label: "Proyek Konstruksi",
    icon: Building,
    href: "/projects",
    createHref: "/projects/create",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
  {
    label: "Jadwal Survei",
    icon: CalendarDays,
    href: "/surveys",
    createHref: "/surveys/create",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
  {
    label: "Invoice",
    icon: Receipt,
    href: "/invoices",
    createHref: "/invoices/create",
    roles: ["super_admin", "admin"],
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/reports",
    roles: ["super_admin", "admin", "agent", "marketing"],
  },
  {
    label: "Admin",
    icon: ShieldCheck,
    href: "/admin",
    roles: ["super_admin", "admin"],
    children: [
      { label: "User Management", icon: Users2, href: "/admin/users", roles: ["super_admin", "admin"] },
      { label: "Inbox Support", icon: MessageSquareText, href: "/admin/support", roles: ["super_admin", "admin"] },
      { label: "System Logs", icon: ActivitySquare, href: "/admin/logs", roles: ["super_admin", "admin"] },
    ],
  },
  {
    label: "Notifikasi",
    icon: BellRing,
    href: "/notifications",
    roles: ["super_admin", "admin", "agent", "marketing", "viewer"],
  },
  {
    label: "Settings",
    icon: Sliders,
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
    return item.children.some((child) =>
      child.exact ? pathname === child.href : pathname?.startsWith(child.href)
    );
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

    if (visibleChildren.length > 0) {
      return (
        <Collapsible
          key={item.href}
          open={isExpanded}
          onOpenChange={() => toggleExpand(key)}
          className="space-y-1"
        >
          {/* PARENT CONTAINER: Diberikan fleksibilitas terpisah antara teks & panah */}
          <div
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-200 text-xs font-semibold group",
              active || hasChildActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            {/* 1. Klik area teks/ikon langsung navigasi ke item.href */}
            <button
              onClick={() => {
                navigateAndClose(item.href);
                if (!isExpanded) {
                  setExpandedItems((prev) => ({ ...prev, [key]: true }));
                }
              }}
              className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
            >
              <item.icon size={17} className={cn((active || hasChildActive) && "text-emerald-600 dark:text-emerald-400")} />
              <span>{item.label}</span>
            </button>

            {/* 2. Tombol Chevron khusus toggle accordion */}
<CollapsibleTrigger
  className="p-1 hover:bg-accent/80 rounded-lg text-muted-foreground transition-colors cursor-pointer"
  title={isExpanded ? "Tutup sub-menu" : "Buka sub-menu"}
>
  {isExpanded ? (
    <ChevronUp size={14} />
  ) : (
    <ChevronDown size={14} />
  )}
</CollapsibleTrigger>
          </div>

          {/* SUB-MENU CONTENT */}
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
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

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

  if (isLoading) {
    return (
      <aside className="flex flex-col bg-card text-card-foreground h-full w-full p-3 space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-full w-full rounded-xl" />
      </aside>
    );
  }

  return (
    <aside className="flex flex-col bg-card/95 backdrop-blur-md text-card-foreground h-full w-full overflow-hidden select-none border-0">
      {/* 1. HEADER BRAND */}
      <div className="flex items-center h-16 px-4 border-b border-border/40 shrink-0 bg-card/50 justify-between">
        <button
          onClick={() => navigateAndClose("/dashboard")}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
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
      </div>

      {/* 2. MIDDLE NAVIGATION LINKS */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin scrollbar-thumb-border">
        <nav className="space-y-0.5">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>
      </div>

      {/* 3. FOOTER CONTROL BAR */}
      <div className="border-t border-border/40 p-3 space-y-2 shrink-0 bg-muted/10">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground hover:bg-accent text-xs h-8 rounded-xl cursor-pointer"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun size={15} className="text-amber-500 shrink-0" />
          ) : (
            <Moon size={15} className="text-slate-600 dark:text-slate-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>
        </Button>

        <button
          className="flex items-center gap-2.5 p-1.5 rounded-xl transition-all w-full text-left bg-card border border-border/50 hover:border-emerald-500/40 hover:bg-accent/50 cursor-pointer shadow-2xs group"
          onClick={() => navigateAndClose("/settings")}
        >
          <Avatar className="h-7 w-7 border border-emerald-500/30 shrink-0 shadow-2xs">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              {getInitials(userFullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {userFullName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate capitalize leading-none mt-0.5">
              {user ? (userRole ? userRole.replace("_", " ") : "Pengguna") : "Tamu"}
            </p>
          </div>
        </button>

        {user && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 text-xs h-8 rounded-xl cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut size={15} className="shrink-0" />
            <span className="text-xs font-semibold">Keluar Akun</span>
          </Button>
        )}
      </div>
    </aside>
  );
}