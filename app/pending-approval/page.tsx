// app/pending-approval/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, ShieldCheck, Loader2, LogOut } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, status")
          .eq("id", user.id)
          .maybeSingle();
        setFullName(data?.full_name || user.email || "Pengguna");
        if (data?.status !== "pending") {
          // Status sudah berubah, redirect ke dashboard
          router.replace("/dashboard");
          return;
        }
      } else {
        router.replace("/login");
        return;
      }
      setChecking(false);
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat select-none"
      style={{
        backgroundImage: "url('/bg-login.webp')",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
      <Card className="relative z-10 max-w-md w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-900/75 backdrop-blur-xl text-slate-100 overflow-hidden text-center p-6 sm:p-8 space-y-5 my-auto">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-extrabold text-white">
            Menunggu Persetujuan
          </CardTitle>
          <CardDescription className="text-xs text-slate-300 leading-relaxed">
            Hai, <span className="font-bold text-emerald-400">{fullName}</span>. Akun Anda sedang dalam proses peninjauan oleh <span className="font-bold text-white">Tim Administrator Inland Property</span>.
          </CardDescription>
        </div>
        <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-left space-y-2 text-xs text-amber-200 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Status: Pending
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Anda akan diarahkan ke dashboard secara otomatis setelah admin menyetujui akun Anda. Silakan cek secara berkala atau hubungi admin jika memerlukan bantuan.
          </p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-10 text-xs font-semibold rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </Card>
    </div>
  );
}