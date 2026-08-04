"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, LayoutGrid } from "lucide-react";
import { CrmKanbanBoard } from "@/components/crm/CrmKanbanBoard";
import AgentActivityMonitor from "@/components/crm/AgentActivityMonitor";

function CRMContent() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState(true);

  // 🔒 CEK ROLE & REDIRECT JIKA VIEWER
  useEffect(() => {
    async function verifyViewerAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (
          userData?.role ||
          user.user_metadata?.role ||
          "agent"
        ).toLowerCase();

        if (role === "viewer" || role === "reviewer") {
          toast.error("Akses Ditolak: Akun Viewer tidak memiliki izin mengakses CRM.");
          router.replace("/properties");
          return;
        }

        setLoadingRole(false);
      } catch (err) {
        console.error("Error checking role:", err);
        setLoadingRole(false);
      }
    }

    verifyViewerAccess();
  }, [router]);

  if (loadingRole) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 py-4 pb-16 min-h-screen text-foreground space-y-6">
      {/* HEADER HALAMAN CRM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Manajemen CRM & Pipeline Prospek
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelola alur konversi klien, estimasi deal, dan status negosiasi properti.
          </p>
        </div>
      </div>

      {/* TATA LETAK UTAMA: GRID KANBAN DI KIRI/ATAS & WIDGET MONITOR AKTIVITAS DI KANAN/BAWAH */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Kanban Board Utama Memakan 3 Kolom */}
        <div className="lg:col-span-3 space-y-4">
          <CrmKanbanBoard />
        </div>

        {/* Sidebar Kanan: Widget Pantauan Aktivitas Real-time */}
        <div className="lg:col-span-1 space-y-4">
          <AgentActivityMonitor />
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <CRMContent />
    </Suspense>
  );
}