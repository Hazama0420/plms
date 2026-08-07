// app/auth/callback/page.tsx
//
// Tujuan redirect OAuth Google — dirujuk oleh app/login/page.tsx dan
// app/register/page.tsx lewat `redirectTo: ${origin}/auth/callback`.
//
// Berkas ini sebelumnya berada di auth/callback/ pada akar proyek, di luar
// folder app/. App Router hanya membaca rute dari dalam app/, jadi di lokasi
// lama halaman ini tidak pernah terdaftar sebagai rute dan /auth/callback
// membalas 404 — login Google selalu gagal di langkah terakhir.
//
// Rute ini tidak didaftarkan pada matcher proxy.ts, jadi proxy tidak
// dijalankan dan pertukaran sesi bisa selesai tanpa dicegat redirect.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { BLOCKED_STATUSES } from "@/lib/permissions";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        toast.error("Gagal login dengan Google/Facebook");
        router.push("/login");
        return;
      }

      // Gerbang yang sama seperti login kata sandi: OAuth tidak boleh menjadi
      // jalan pintas bagi akun yang belum disetujui admin.
      const userId = data?.session?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("users")
          .select("status")
          .eq("id", userId)
          .maybeSingle();

        if (BLOCKED_STATUSES.includes(profile?.status ?? "")) {
          await supabase.auth.signOut();
          toast.error(
            profile?.status === "pending"
              ? "Akun Anda masih menunggu persetujuan admin."
              : "Akun Anda dinonaktifkan. Hubungi admin."
          );
          router.push("/login");
          return;
        }
      }

      toast.success("Login berhasil!");
      router.push("/dashboard");
      router.refresh();
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}