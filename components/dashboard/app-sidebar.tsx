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
  CalendarCheck,
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
  Loader2,
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
  roles?: ("super_admin" | "admin" | "agent" | "marketing" | "viewer")[];
  children?: NavItem[];
}

// ============================================================
// NAVIGATION ITEMS
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
    children: [
      { label: "All Properties", icon: Building2, href: "/properties" },
      { label: "Add Property", icon: Building2, href: "/properties/create" },
    ],
  },
  {
    label: "CRM",
    icon: Users,
    href: "/crm",
    children: [
      { label: "Leads", icon: Users, href: "/crm/leads" },
      { label: "Follow-ups", icon: CalendarCheck, href: "/crm/followups" },
    ],
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
    children: [{ label: "User Management", icon: Users, href: "/admin/users" }],
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

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { userRole, isLoading: roleLoading } = usePermissions();
  const { user, isLoading: userLoading } = useUser();

  const [collapsed, setCollapsed] = useState(false);
  const [userFullName, setUserFullName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    properties: true,
    crm: true,
    admin: false,
  });

  const isLoading = roleLoading || userLoading;

  // Load user data from database
  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Error loading user data:", error);
          setUserFullName(user.email?.split("@")[0] || "User");
          setUserAvatar("");
          return;
        }

        if (data) {
          setUserFullName(data.full_name || user.email?.split("@")[0] || "User");
          setUserAvatar(data.avatar_url || "");
        } else {
          setUserFullName(user.email?.split("@")[0] || "User");
          setUserAvatar("");
        }
      } catch (err) {
        console.warn("Failed to load user data:", err);
        setUserFullName(user.email?.split("@")[0] || "User");
        setUserAvatar("");
      }
    }
    loadUserData();
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil logout");
      router.push("/");
    } catch (error) {
      toast.error("Gagal logout");
    }
  };

  // Toggle collapse
  const toggleCollapse = () => setCollapsed(!collapsed);

  // Toggle expand item
  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Check if nav item is active
  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href) ?? false;
  };

  // Check if nav item has child active
  const hasActiveChild = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => pathname?.startsWith(child.href));
  };

  // Check if user can see this nav item
  const canSeeItem = (item: NavItem) => {
    if (!item.roles) return true;
    // Jika role masih null (loading), tampilkan semua (akan di-render ulang setelah loading)
    if (!userRole) return true;
    return item.roles.includes(userRole as any);
  };

  // Filter nav items based on role
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(canSeeItem);
  }, [userRole]);

  // Get initials
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
    const isExpanded = expandedItems[item.label.toLowerCase()] ?? false;
    const hasChildActive = hasActiveChild(item);

    const visibleChildren = hasChildren
      ? item.children!.filter(canSeeItem)
      : [];

    if (collapsed) {
      // Collapsed mode - tooltip only
      return (
        <TooltipProvider key={item.href} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200",
                  active || hasChildActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={20} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Expanded mode - with children
    if (visibleChildren.length > 0) {
      return (
        <Collapsible
          key={item.href}
          open={isExpanded}
          onOpenChange={() => toggleExpand(item.label.toLowerCase())}
          className="space-y-1"
        >
          <CollapsibleTrigger
            className={cn(
              "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
              active || hasChildActive
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon size={18} />
              <span>{item.label}</span>
            </span>
            {isExpanded ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 ml-4 pl-2 border-l border-border/50">
            {visibleChildren.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                  isActive(child)
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <child.icon size={16} />
                <span>{child.label}</span>
                {isActive(child) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Single item (no children)
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
          active
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
      </Link>
    );
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading) {
    return (
      <aside
        className={cn(
          "relative flex flex-col border-r bg-background h-screen",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center h-16 px-4 border-b justify-between">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex-1 px-3 py-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="border-t p-3 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </aside>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-background transition-all duration-300 h-screen",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-lg">PLMS</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              v2
            </Badge>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            collapsed &&
              "absolute -right-4 top-4 rounded-full border bg-background shadow-md"
          )}
          onClick={toggleCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="border-t p-3 space-y-3">
        {/* Dark/Light Toggle */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && (
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          )}
        </Button>

        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer",
            collapsed && "justify-center"
          )}
          onClick={() => router.push("/profile")}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(userFullName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userFullName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-0"
          )}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}