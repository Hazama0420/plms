// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LegalLinksInline } from "@/components/layout/SiteFooter";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // State Form Member
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handler Login/Daftar via Google
  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Gagal mendaftar dengan akun Google.");
      setLoading(false);
    }
  };

  // Submit Registrasi Member
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password minimal harus 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: "viewer",
            status: "active",
            is_approved: true,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const userPayload = {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          phone: phone,
          role: "viewer",
          status: "active",
          updated_at: new Date().toISOString(),
        };

        const { error: dbError } = await supabase.from("users").upsert(userPayload);
        if (dbError) {
          console.warn("Detail profil tersimpan di Auth Metadata tetapi tidak di tabel public.users:", dbError.message);
        }
      }

      toast.success("Pendaftaran Member berhasil! Selamat datang.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan pendaftaran. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat select-none py-10"
      style={{
        backgroundImage: "url('/bg-login.webp')",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <Card className="relative z-10 max-w-md w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-900/70 backdrop-blur-xl text-slate-100 overflow-hidden my-auto transition-all">
        <div className="h-1.5 w-full bg-emerald-500/90 shadow-sm" />

        <CardHeader className="text-center space-y-2 pt-6 pb-4 px-6 sm:px-8 border-b border-white/10">
          <div className="mx-auto flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Inland Property Logo"
              width={160}
              height={60}
              className="h-12 w-auto object-contain drop-shadow-md"
              priority
            />
          </div>

          <div>
            <CardTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Daftar <span className="text-emerald-400">Member</span> Inland
            </CardTitle>
            <CardDescription className="text-xs text-slate-300/80 font-medium mt-0.5">
              Buat akun untuk menjelajahi dan menyimpan properti impian Anda
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          {/* TOMBOL DAFTAR DENGAN GOOGLE */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full h-11 bg-white/5 hover:bg-white/10 text-white border-white/20 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Daftar Cepat dengan Google
          </Button>

          {/* DIVIDER */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900/90 px-3 text-slate-400 font-semibold rounded-full border border-white/10">
                Atau daftar dengan Email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold text-slate-200">
                Nama Lengkap <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
                Email <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-200">
                Nomor WhatsApp <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
                Password <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-9 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -mr-2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-200">
                Konfirmasi Password <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer gap-2 mt-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mendaftarkan Akun...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Daftar Akun Member
                </>
              )}
            </Button>
          </form>

          {/* LINK KHUSUS PENDAFTARAN AGEN */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between text-xs text-slate-200 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-[11px]">Ingin Bergabung Sebagai Agen?</p>
                <p className="text-[10px] text-slate-300">Dapatkan komisi & akses listing properti</p>
              </div>
            </div>
            <Link
              href="/register/agent"
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 shrink-0"
            >
              Daftar Agen <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* FOOTER NAVIGASI LOGIN */}
          <div className="text-center pt-2 border-t border-white/10">
            <p className="text-xs text-slate-300">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="text-emerald-400 font-bold hover:underline">
                Masuk di Sini
              </Link>
            </p>
          </div>

          {/* TAUTAN DOKUMEN LEGAL */}
          <LegalLinksInline className="pt-3 border-t border-white/10" />
        </CardContent>
      </Card>
    </div>
  );
}