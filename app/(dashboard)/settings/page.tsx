// app/(dashboard)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Settings, Key, Moon, Sun, Bell, Home, LogOut, Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface UserPreferences {
  dark_mode: boolean;
  email_notifications: boolean;
  property_updates: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    dark_mode: theme === "dark",
    email_notifications: true,
    property_updates: true,
  });

  const [userId, setUserId] = useState<string | null>(null);

  // ===== LOAD USER DATA =====
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUserId(user.id);

        // Load preferences from database
        const { data, error } = await supabase
          .from("users")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Error loading preferences:", error);
        }

        if (data?.preferences) {
          setPreferences({
            dark_mode: data.preferences.dark_mode ?? (theme === "dark"),
            email_notifications: data.preferences.email_notifications ?? true,
            property_updates: data.preferences.property_updates ?? true,
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router, theme]);

  // ===== HANDLE CHANGE PASSWORD =====
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.message?.includes("password")) {
        toast.error("Password saat ini salah atau tidak valid");
      } else {
        toast.error("Gagal mengubah password", {
          description: error.message || "Silakan coba lagi",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLE SAVE PREFERENCES =====
  const handleSavePreferences = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      // Update theme
      setTheme(preferences.dark_mode ? "dark" : "light");

      // Save to database
      const { error } = await supabase
        .from("users")
        .update({
          preferences: {
            dark_mode: preferences.dark_mode,
            email_notifications: preferences.email_notifications,
            property_updates: preferences.property_updates,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Preferensi berhasil disimpan!");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Gagal menyimpan preferensi", {
        description: error.message || "Silakan coba lagi",
      });
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLE LOGOUT =====
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil logout");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Gagal logout");
    }
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-1 gap-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Settings size={28} className="text-blue-300" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">⚙️ Pengaturan</h1>
            <p className="text-sm text-slate-300">Kelola keamanan dan preferensi akun</p>
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-t-xl dark:from-rose-950/30 dark:to-pink-950/30">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Key size={18} className="text-rose-500" />
            Ubah Password
          </CardTitle>
          <CardDescription>Ganti password akun Anda secara berkala untuk keamanan</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password" className="font-medium">
                Password Saat Ini <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Masukkan password saat ini"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="border-rose-200 focus:ring-rose-500 dark:bg-slate-900 dark:border-slate-700 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-medium">
                Password Baru <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Masukkan password baru (min 6 karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-rose-200 focus:ring-rose-500 dark:bg-slate-900 dark:border-slate-700 pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-400">Minimal 6 karakter</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-medium">
                Konfirmasi Password Baru <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-rose-200 focus:ring-rose-500 dark:bg-slate-900 dark:border-slate-700 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                "Ubah Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* PREFERENCES */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Settings size={18} className="text-blue-500" />
            Preferensi
          </CardTitle>
          <CardDescription>Atur preferensi tampilan dan notifikasi</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Dark Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              {preferences.dark_mode ? (
                <Moon size={18} className="text-blue-500" />
              ) : (
                <Sun size={18} className="text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {preferences.dark_mode ? "Mode Gelap" : "Mode Terang"}
                </p>
                <p className="text-xs text-slate-400">
                  {preferences.dark_mode ? "Tampilan dark mode aktif" : "Tampilan light mode aktif"}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.dark_mode}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, dark_mode: checked }))
              }
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Notifikasi Email
                </p>
                <p className="text-xs text-slate-400">
                  Terima notifikasi melalui email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, email_notifications: checked }))
              }
            />
          </div>

          {/* Property Updates */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Home size={18} className="text-purple-500" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Update Property
                </p>
                <p className="text-xs text-slate-400">
                  Notifikasi saat ada property baru atau update
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.property_updates}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, property_updates: checked }))
              }
            />
          </div>

          <Separator className="my-2" />

          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              "Simpan Preferensi"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* LOGOUT */}
      <Card className="border-0 shadow-md border-red-200/50 dark:border-red-900/30">
        <CardContent className="p-6">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-md"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
          <p className="text-xs text-slate-400 text-center mt-2">
            Logout akan mengakhiri sesi Anda saat ini
          </p>
        </CardContent>
      </Card>
    </div>
  );
}