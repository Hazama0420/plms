// components/layout/app-layout.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Sembunyikan Sidebar & BottomNav untuk Halaman Autentikasi
  const isAuthPage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password");

  // Layout Polos untuk Halaman Auth (Tanpa Sidebar / BottomNav)
  if (isAuthPage) {
    return (
      <div className="min-h-[100dvh] w-full bg-background antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full bg-background overflow-hidden antialiased">
      {/* 1. DESKTOP SIDEBAR 
          Dirender langsung tanpa pembungkus <aside> ganda agar logika collapse (w-16 <-> w-64)
          berjalan secara responsif tanpa meninggalkan ruang kosong di samping.
      */}
      <div className="hidden md:flex shrink-0 h-full">
        <AppSidebar />
      </div>

      {/* 2. AREA KONTEN UTAMA
          - `flex-1 min-w-0`: Mencegah layout pecah saat ada tabel/elemen lebar.
          - `pb-20 md:pb-0`: Memberikan padding bawah khusus mobile agar elemen paling bawah 
            tidak tertutup oleh BottomNav.
          - `h-[100dvh] overflow-y-auto`: Menjaga pergerakan scroll sangat halus di HP & PC.
      */}
      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden",
          "pb-20 md:pb-0"
        )}
      >
        <div className="flex-1 w-full">{children}</div>
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION */}
      <BottomNav />
    </div>
  );
}

export default AppLayout;