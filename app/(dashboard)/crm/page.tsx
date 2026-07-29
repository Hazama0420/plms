// app/(dashboard)/crm/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
// ... import komponen lainnya ...

function CRMContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "followups";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loadingRole, setLoadingRole] = useState(true);

  // 🔒 CEK ROLE & REDIRECT JIKA VIEWER
  useEffect(() => {
    async function verifyViewerAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();

        // Jika rolenya viewer atau reviewer, langsung tendang ke halaman properti!
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Kode asli halaman CRM Anda tetap di sini ... */}
    </div>
  );
}

export default function CRMPage() {
  return (
    <Suspense fallback={null}>
      <CRMContent />
    </Suspense>
  );
}