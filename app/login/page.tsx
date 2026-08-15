// app/login/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalLinksInline } from "@/components/layout/SiteFooter";
import {
  Loader2,
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  ArrowRight,
  Ban,
} from "lucide-react";

// ===== GOOGLE ICON (SVG) =====
const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ─── Deteksi client-side rendering ──────────────────────────────────────
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ─── Baca alasan redirect (dari proxy) ──────────────────────────────────
  const reason = useMemo(() => searchParams.get("reason"), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError("Email belum diverifikasi. Silakan cek inbox atau spam Anda.");
          toast.error("Email belum diverifikasi.");
        } else if (error.message.includes("Invalid login credentials")) {
          setError("Email atau password yang Anda masukkan salah.");
          toast.error("Email atau password salah.");
        } else {
          setError(error.message);
          toast.error(error.message);
        }
        return;
      }

      toast.success("Login berhasil! Selamat datang.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal login. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(`Gagal login dengan Google: ${err.message || "Silakan coba lagi."}`);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.warning("Masukkan email Anda terlebih dahulu");
      return;
    }
    try {
      await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      toast.success("Email verifikasi dikirim ulang. Cek inbox/spam Anda.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim verifikasi.");
    }
  };

  // ─── Jangan render apa pun sampai di browser ────────────────────────────
  if (!isClient) {
    return null; // atau bisa diganti dengan loading spinner kosong
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

      <Card className="relative z-10 max-w-md w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-900/65 backdrop-blur-xl text-slate-100 overflow-hidden my-auto transition-all">
        <div className="h-1.5 w-full bg-emerald-500/90 shadow-sm" />

        <CardHeader className="text-center space-y-1.5 pt-6 pb-2 px-6 sm:px-8">
          <div className="mx-auto flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Inland Property Logo"
              width={180}
              height={70}
              className="h-15 w-auto object-contain drop-shadow-md"
              priority
            />
          </div>

          <div className="space-y-0.5">
            <CardTitle className="text-2xl font-black tracking-tight text-white">
              <span className="text-emerald-400">Inland</span>{" "}
              <span className="text-slate-100">Property</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-300/80 font-medium">
              Property Listing & CRM Management System
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-8 px-6 sm:px-8">
          {/* ───────── BANNER KHUSUS UNTUK AKUN SUSPENDED ───────── */}
          {reason === "suspended" && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-md">
              <Ban className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-medium">
                  Akun Anda dinonaktifkan oleh admin.
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Silakan hubungi administrator Inland Property untuk informasi lebih lanjut.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* PESAN ERROR (dari login gagal) */}
            {error && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-md">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium leading-relaxed">{error}</p>
                  {error.includes("verifikasi") && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="text-emerald-300 hover:underline font-bold text-[11px] block cursor-pointer"
                    >
                      Kirim ulang email verifikasi sekarang →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* INPUT EMAIL */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
                Alamat Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* INPUT PASSWORD */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-emerald-400 hover:underline font-medium"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* INGAT SAYA */}
            <div className="flex items-center space-x-2 pt-0.5">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="rounded-md border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <Label htmlFor="remember" className="text-xs text-slate-300 font-medium cursor-pointer">
                Ingat saya di perangkat ini
              </Label>
            </div>

            {/* TOMBOL LOGIN */}
            <Button
              type="submit"
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer gap-2 mt-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses Login...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Masuk ke Akun
                </>
              )}
            </Button>
          </form>

          {/* GARIS PEMBATAS */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-slate-900/80 px-2.5 py-0.5 rounded-full text-slate-300 border border-white/10 backdrop-blur-md">
                Atau
              </span>
            </div>
          </div>

          {/* TOMBOL GOOGLE LOGIN */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full h-10 text-xs font-semibold rounded-xl bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white transition gap-2.5 cursor-pointer backdrop-blur-md"
          >
            <GoogleIcon />
            <span>Masuk dengan Google</span>
          </Button>

          {/* TOMBOL DASHBOARD MODE TAMU */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="w-full h-10 text-xs font-semibold rounded-xl text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 border border-emerald-500/35 gap-2 cursor-pointer mt-2 backdrop-blur-md"
          >
            <User className="w-4 h-4 text-emerald-400" />
            Jelajahi Dashboard (Mode Tamu)
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />
          </Button>

          {/* LINK DAFTAR */}
          <p className="text-center text-xs text-slate-300 pt-2">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-emerald-400 hover:underline font-bold"
            >
              Daftar Sekarang
            </Link>
          </p>

          {/* TAUTAN DOKUMEN LEGAL */}
          <LegalLinksInline className="pt-3 border-t border-white/10" />
        </CardContent>
      </Card>
    </div>
  );
}