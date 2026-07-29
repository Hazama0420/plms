// app/(dashboard)/properties/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CreatePropertyWizard } from "@/components/create-property/CreatePropertyWizard";

export default function CreatePropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkViewerAccess() {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          toast.error("Silakan login terlebih dahulu");
          router.push("/login");
          return;
        }

        // Ambil role user dari tabel users atau metadata
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();

        // 🛑 BLOKIR AKUN VIEWER / REVIEWER AGAR TIDAK BISA CREATE PROPERTY
        if (role === "viewer" || role === "reviewer") {
          toast.error("Akses Ditolak: Akun Viewer hanya memiliki izin melihat data (Read-Only).");
          router.replace("/properties");
          return;
        }
      } catch (err) {
        console.error("Error checking role permissions:", err);
        toast.error("Gagal memvalidasi hak akses");
        router.replace("/properties");
      } finally {
        setLoading(false);
      }
    }

    checkViewerAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Memeriksa hak akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <CreatePropertyWizard />
    </div>
  );
}