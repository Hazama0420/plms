// app/page.tsx
"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import DashboardContent from "@/app/(dashboard)/dashboard/page"; // Sesuaikan path file dashboard Anda jika berbeda

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar Kiri */}
      <AppSidebar onClose={() => setSidebarOpen(false)} />

      {/* Konten Utama Kanan */}
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <DashboardContent />
      </main>
    </div>
  );
}