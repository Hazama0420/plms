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
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errorDetail) setErrorDetail(null);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-700" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: "Lemah", color: "bg-rose-500" };
    if (score === 2 || score === 3) return { score: 2, label: "Cukup", color: "bg-amber-500" };
    return { score: 3, label: "Kuat 🔒", color: "bg-emerald-500" };
  };

  const passwordStrength = getPasswordStrength(form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirm_password) {
      toast.error("Password dan konfirmasi password tidak sama");
      setErrorDetail("Password dan konfirmasi password tidak sama.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      setErrorDetail("Password terlalu pendek. Gunakan minimal 6 karakter.");
      return;
    }

    setLoading(true);
    setErrorDetail(null);

    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: fullName,
            phone: form.phone,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      setRegisteredEmail(form.email);
      setSuccess(true);
      toast.success("Pendaftaran berhasil! Silakan verifikasi email Anda.");

      if (data.user) {
        try {
          await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            phone: form.phone || null,
            role: "viewer",
          });
        } catch (insertErr) {
          console.warn("Gagal menyinkronkan profil ke tabel users:", insertErr);
        }
      }
    } catch (error: any) {
      let errorMsg = error.message || "Gagal mendaftarkan akun.";
      if (errorMsg.includes("User already registered")) {
        errorMsg = "Email ini sudah terdaftar. Silakan langsung login.";
      }
      setErrorDetail(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-login.webp')", backgroundAttachment: "fixed" }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />

        <Card className="relative z-10 max-w-md w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-950/75 backdrop-blur-xl text-white overflow-hidden">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            
            <h2 className="text-2xl font-black tracking-tight text-white">
              Verifikasi Email Anda
            </h2>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Tautan konfirmasi telah dikirimkan ke email:<br />
              <span className="font-bold text-emerald-400">{registeredEmail}</span>
            </p>

            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-slate-400">
              Silakan periksa folder inbox atau spam Anda, lalu klik tautan aktivasi untuk mulai menggunakan akun Inland Property.
            </div>

            <div className="pt-2 space-y-2">
              <Button
                variant="default"
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
                onClick={() => router.push("/login")}
              >
                Menuju Halaman Login
              </Button>

              <Button
                variant="outline"
                className="w-full h-10 text-xs font-semibold rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
                onClick={async () => {
                  try {
                    await supabase.auth.resend({ type: "signup", email: registeredEmail });
                    toast.success("Email verifikasi berhasil dikirim ulang.");
                  } catch (err: any) {
                    toast.error(err.message || "Gagal mengirim ulang.");
                  }
                }}
              >
                Kirim Ulang Email Verifikasi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg-login.webp')", backgroundAttachment: "fixed" }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />

      <Card className="relative z-10 max-w-lg w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-950/75 backdrop-blur-xl text-white overflow-hidden my-auto">
       <CardHeader className="text-center space-y-1.5 pt-6 pb-3">
          
          {/* LOGO IMAGE */}
          <div className="mx-auto flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Inland Property Logo"
              width={180}
              height={70}
              className="h-16 w-auto object-contain drop-shadow-md"
              priority
            />
          </div>

          {/* TEKS JUDUL NAMA WEB */}
          <div className="space-y-0.5">
            <CardTitle className="text-2xl font-black tracking-tight">
              <span className="text-emerald-400">Inland</span> <span className="text-white">Property</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Buat akun untuk mulai menjelajahi properti & booking survei.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-8 px-6 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {errorDetail && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <p className="font-medium leading-relaxed">{errorDetail}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="first_name" className="text-xs font-semibold text-slate-200">
                  Nama Depan
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="first_name"
                    name="first_name"
                    placeholder="Cth: Budi"
                    value={form.first_name}
                    onChange={handleChange}
                    className="pl-9 h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="last_name" className="text-xs font-semibold text-slate-200">
                  Nama Belakang
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Cth: Santoso"
                  value={form.last_name}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400 px-3"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
                Email Aktif
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="budi@email.com"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-10 h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-200">
                Nomor WhatsApp / HP
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="081234567890"
                  value={form.phone}
                  onChange={handleChange}
                  className="pl-10 h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
                Password (Min. 6 Karakter)
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {form.password && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 grid grid-cols-3 gap-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent"} />
                    <div className={passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent"} />
                    <div className={passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent"} />
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm_password" className="text-xs font-semibold text-slate-200">
                Konfirmasi Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.confirm_password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-10 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer gap-2 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mendaftarkan Akun...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 w-4" /> Daftar Akun Baru
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-300 pt-2">
            Sudah memiliki akun?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline font-bold">
              Masuk di sini
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}