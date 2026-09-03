// components/layout/StorefrontNavbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogIn,
  Home,
  Building2,
  Calculator,
  CalendarCheck,
  PhoneCall,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface StorefrontNavbarProps {
  isLoggedIn?: boolean;
  onOpenSidebar?: () => void;
  showStaffMenu?: boolean;
}

const PUBLIC_NAV_ITEMS = [
  { label: "Beranda", href: "/dashboard", icon: Home },
  { label: "Properti", href: "/properties", icon: Building2 },
  { label: "KPR", href: "/kpr-calculator", icon: Calculator },
  { label: "Survei", href: "/surveys", icon: CalendarCheck },
  { label: "Kontak", href: "/support", icon: PhoneCall },
];

export function StorefrontNavbar({
  isLoggedIn = false,
  onOpenSidebar,
  showStaffMenu = false,
}: StorefrontNavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border/80 bg-background/95 backdrop-blur-md px-4 md:px-6 transition-colors">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4">
        {/* LEFT: Logo & Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Staff Hamburger if authorized staff, or Mobile Menu toggle for public */}
          {showStaffMenu ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
              onClick={onOpenSidebar}
              title="Buka Menu Manajemen PLMS"
              aria-label="Buka Menu Manajemen PLMS"
            >
              <Menu className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground rounded-xl cursor-pointer min-h-[44px] min-w-[44px]"
              onClick={() => setMobileMenuOpen(true)}
              title="Buka Navigasi"
              aria-label="Buka Navigasi"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 select-none text-lg sm:text-xl font-extrabold tracking-tight hover:opacity-90 transition-opacity"
            title="Inland Property — Beranda"
          >
            <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
            <span className="text-foreground">Property</span>
          </Link>
        </div>

        {/* CENTER: Desktop Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {PUBLIC_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT: Actions (Theme Toggle + Auth CTA) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isLoggedIn && <NotificationBell />}
          <ThemeToggle />

          {isLoggedIn ? (
            <Link href="/settings">
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3.5 rounded-xl font-semibold gap-1.5 cursor-pointer text-xs"
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Akun Saya</span>
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button
                size="sm"
                className="h-10 px-4 rounded-xl font-bold gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* MOBILE PUBLIC NAVIGATION SHEET */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 w-72 max-w-[85vw] bg-card border-r flex flex-col"
        >
          <SheetTitle className="sr-only">Navigasi Utama Etalase</SheetTitle>

          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 text-lg font-extrabold tracking-tight"
            >
              <span className="text-emerald-600 dark:text-emerald-400">Inland</span>
              <span className="text-foreground">Property</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileMenuOpen(false)}
              className="h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
              title="Tutup menu"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Drawer Nav Links */}
          <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Menu Etalase
            </p>
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-emerald-600" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Drawer Footer CTA */}
          <div className="p-4 border-t border-border/80 bg-muted/20">
            {isLoggedIn ? (
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Pengaturan Akun</span>
                </Button>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button className="w-full h-11 rounded-xl font-bold gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Akun</span>
                </Button>
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
