// app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle, Loader2, RefreshCw } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Email instruksi reset password telah dikirim!");
    } catch (error: any) {
      toast.error("Gagal mengirim email reset password", {
        description: error.message || "Silakan periksa kembali email Anda.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg-login.webp')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* OVERLAY GELAP ELEGANT */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />

      <Card className="relative z-10 w-full max-w-md border border-white/20 shadow-2xl rounded-3xl bg-slate-950/75 backdrop-blur-xl text-white overflow-hidden my-auto">
        
        {/* TOMBOL KEMBALI KE LOGIN */}
        <div className="absolute left-5 top-5 z-20">
          <Link 
            href="/login" 
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/10"
          >
            <ArrowLeft size={14} /> Kembali
          </Link>
        </div>

        <CardHeader className="text-center space-y-1 pt-6 pb-3">
          
          {/* LOGO GAMBAR */}
          <div className="mx-auto flex items-center justify-center -mb-1">
            <Image
              src="/logo.png"
              alt="Inland Property Logo"
              width={180}
              height={70}
              className="h-18 w-auto object-contain drop-shadow-md"
              priority
            />
          </div>

          {/* TEKS NAMA WEB & DESKRIPSI */}
          <div className="space-y-0.5">
            <CardTitle className="text-2xl font-black tracking-tight">
              <span className="text-emerald-400">Inland</span> <span className="text-white">Property</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Pemulihan Kata Sandi
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Tautan Terkirim!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kami telah mengirimkan instruksi dan tautan reset password ke email:<br />
                  <strong className="text-emerald-400 font-semibold">{email}</strong>
                </p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-slate-400">
                Periksa folder kotak masuk (*inbox*) atau spam Anda.
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setSent(false)}
                  className="w-full h-10 text-xs font-semibold rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Salah ketik email? Coba lagi
                </Button>

                <Link 
                  href="/login" 
                  className="block text-center text-xs text-emerald-400 hover:underline font-bold pt-1"
                >
                  ← Kembali ke Halaman Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed text-center">
                Masukkan alamat email terdaftar Anda untuk menerima tautan pemulihan kata sandi.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
                  Email Akun
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer gap-2 mt-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim Tautan...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 w-4" /> Kirim Email Reset Password
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-slate-300 pt-3">
                Sudah ingat password Anda?{" "}
                <Link href="/login" className="text-emerald-400 hover:underline font-bold">
                  Masuk di sini
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}