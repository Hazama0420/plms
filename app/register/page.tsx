// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirm_password) {
      toast.error("Password dan konfirmasi password tidak cocok");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        toast.success("Registrasi berhasil! Silakan login.");
        router.push("/?registered=true");
      }
    } catch (error: any) {
      console.error("Register error:", error);
      if (error.message.includes("User already registered")) {
        toast.error("Email sudah terdaftar. Silakan login.");
      } else {
        toast.error("Registrasi gagal", {
          description: error.message || "Silakan coba lagi.",
        });
      }
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <Card className="relative z-10 w-full max-w-md border-0 bg-white/10 backdrop-blur-xl backdrop-saturate-150 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 text-center pt-8">
          <Link href="/" className="absolute left-4 top-4 text-white/70 hover:text-white transition">
            <ArrowLeft size={20} />
          </Link>
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Daftar Akun
          </CardTitle>
          <p className="text-sm text-white/70">
            Buat akun baru untuk mulai mengelola properti
          </p>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nama Lengkap */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium text-white/80">
                Nama Lengkap
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={form.full_name}
                  onChange={handleChange}
                  className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30 focus:border-white/40"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-white/80">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@plms.com"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30 focus:border-white/40"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white/80">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30 focus:border-white/40"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-sm font-medium text-white/80">
                Konfirmasi Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Ulangi password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30 focus:border-white/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Memproses...
                </span>
              ) : (
                "Daftar"
              )}
            </Button>

            <p className="text-center text-sm text-white/60">
              Sudah punya akun?{" "}
              <Link href="/" className="text-white font-semibold hover:underline transition">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}