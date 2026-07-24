"use client";

import { AppSidebar as Sidebar } from "@/components/dashboard/app-sidebar";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Sembunyikan bottom nav di halaman tertentu jika perlu (misal: auth)
  const hideNav = pathname?.startsWith("/login") || pathname?.startsWith("/register");

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-card shrink-0 overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden h-16 z-50">
          <BottomNav />
        </nav>
      )}
    </div>
  );
}