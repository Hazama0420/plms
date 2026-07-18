// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, User, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errorDetail) setErrorDetail(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirm_password) {
      toast.error("Password dan konfirmasi password tidak sama");
      setErrorDetail("Password dan konfirmasi tidak sama");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      setErrorDetail("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    setErrorDetail(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      setRegisteredEmail(form.email);
      setSuccess(true);
      toast.success("Pendaftaran berhasil! Cek email Anda untuk verifikasi.");
      
      if (data.user) {
        try {
          await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email,
            full_name: form.full_name,
            role: "viewer",
          });
        } catch (insertErr) {
          console.warn("Insert user failed:", insertErr);
        }
      }
    } catch (error: any) {
      console.error("Register error:", error);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      
      let errorMsg = error.message || "Gagal mendaftar";
      
      // Handle berbagai error
      if (errorMsg.includes("User already registered")) {
        errorMsg = "Email sudah terdaftar. Silakan login.";
      } else if (errorMsg.includes("password")) {
        errorMsg = "Password terlalu lemah. Gunakan minimal 6 karakter.";
      } else if (errorMsg.includes("rate limit") || errorMsg.includes("rate_limit")) {
        errorMsg = "Terlalu banyak percobaan. Silakan tunggu beberapa menit sebelum mencoba lagi.";
        toast.error("Terlalu banyak percobaan. Tunggu beberapa saat.");
      }
      
      setErrorDetail(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950 p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="pt-8 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Verifikasi Email
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Kami telah mengirimkan email verifikasi ke <br />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{registeredEmail}</span>
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Silakan klik link di email tersebut untuk mengaktifkan akun Anda.
              Setelah diverifikasi, Anda bisa login ke sistem.
            </p>
            <div className="mt-6 space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/login")}
              >
                Kembali ke Login
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-slate-400"
                onClick={async () => {
                  try {
                    await supabase.auth.resend({
                      type: "signup",
                      email: registeredEmail,
                    });
                    toast.success("Email verifikasi dikirim ulang. Cek inbox/spam Anda.");
                  } catch (err: any) {
                    toast.error(err.message || "Gagal mengirim ulang");
                  }
                }}
              >
                Kirim ulang email verifikasi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950 p-4">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
            Daftar Akun
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Buat akun untuk mulai menggunakan Inland Property
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorDetail && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg text-sm text-rose-600 dark:text-rose-400">
                {errorDetail}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Masukkan nama lengkap"
                  value={form.full_name}
                  onChange={handleChange}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@anda.com"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Konfirmasi Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="Ulangi password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mendaftar...
                </>
              ) : (
                "Daftar"
              )}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-emerald-600 hover:underline font-medium">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}