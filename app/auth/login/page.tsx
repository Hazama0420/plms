// app/auth/login/page.tsx (atau app/login/page.tsx)
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
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // ✅ Tangani error "Email not confirmed"
        if (error.message.includes("Email not confirmed")) {
          setError("Email belum diverifikasi. Silakan cek inbox/spam Anda dan klik link verifikasi.");
          toast.error("Email belum diverifikasi. Cek email Anda.");
        } else {
          setError(error.message);
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      toast.success("Login berhasil!");
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message || "Terjadi kesalahan");
      toast.error(error.message || "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.warning("Masukkan email terlebih dahulu");
      return;
    }
    try {
      await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      toast.success("Email verifikasi dikirim ulang. Cek inbox/spam Anda.");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim ulang verifikasi");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950 p-4">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
            Login
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Masuk ke akun Inland Property Anda
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  {error.includes("verifikasi") && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="mt-1 text-emerald-600 hover:underline font-medium text-xs"
                    >
                      Kirim ulang email verifikasi
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@anda.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs text-emerald-600 hover:underline">
                  Lupa password?
                </Link>
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
                  Login...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Belum punya akun?{" "}
              <Link href="/register" className="text-emerald-600 hover:underline font-medium">
                Daftar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}