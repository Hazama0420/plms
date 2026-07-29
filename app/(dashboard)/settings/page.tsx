// app/(dashboard)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Settings,
  Key,
  Moon,
  Sun,
  Bell,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Monitor,
  ShieldCheck,
  Laptop,
  Globe,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Lock,
  Mail,
  Smartphone,
  Database,
  Trash2,
  BellRing,
  Download,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

interface UserPreferences {
  theme_preference: ThemeChoice;
  dark_mode: boolean;
  email_notifications: boolean;
  property_updates: boolean;
  lead_alerts: boolean;
  whatsapp_notifications: boolean;
  compact_view: boolean;
  currency: string;
  timezone: string;
}

function themeLabel(t: ThemeChoice) {
  if (t === "light") return "Terang";
  if (t === "dark") return "Gelap";
  return "Otomatis (Sistem)";
}

function getPasswordStrengthInfo(score: number) {
  if (score <= 1) return { label: "Sangat Lemah", barClass: "w-1/4 bg-rose-500" };
  if (score <= 3) return { label: "Sedang", barClass: "w-2/4 bg-amber-500" };
  if (score === 4) return { label: "Kuat", barClass: "w-3/4 bg-emerald-400" };
  return { label: "Sangat Kuat", barClass: "w-full bg-emerald-600" };
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
}

function parseUserAgent(ua: string) {
  let browser = "Browser tidak dikenal";
  if (/Edg\//.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";

  let os = "Sistem tidak dikenal";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os };
}

function formatTimeInZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "-";
  }
}

const ESSENTIAL_LOCALSTORAGE_KEYS = ["theme", "compact_mode"];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>("0 KB");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submittingDeleteRequest, setSubmittingDeleteRequest] = useState(false);

  const [now, setNow] = useState(new Date());

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme_preference: "system",
    dark_mode: false,
    email_notifications: true,
    property_updates: true,
    lead_alerts: true,
    whatsapp_notifications: false,
    compact_view: false,
    currency: "IDR",
    timezone: "Asia/Jakarta",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const calculateCacheSize = () => {
    if (typeof window === "undefined") return;
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(2);
    setCacheSize(`${kb} KB`);
  };

  const applyCompactDOM = (isCompact: boolean) => {
    if (typeof window !== "undefined") {
      if (isCompact) {
        document.documentElement.classList.add("compact-mode");
        localStorage.setItem("compact_mode", "true");
      } else {
        document.documentElement.classList.remove("compact-mode");
        localStorage.setItem("compact_mode", "false");
      }
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email || "");
        setEmailVerified(!!user.email_confirmed_at);
        setLastSignInAt(user.last_sign_in_at || null);

        const { data } = await supabase
          .from("users")
          .select("preferences")
          .eq("id", user.id)
          .maybeSingle();

        if (data?.preferences) {
          const savedTheme: ThemeChoice =
            data.preferences.theme_preference || (data.preferences.dark_mode ? "dark" : "light");

          const loadedPrefs: UserPreferences = {
            theme_preference: savedTheme,
            dark_mode: savedTheme === "dark",
            email_notifications: data.preferences.email_notifications ?? true,
            property_updates: data.preferences.property_updates ?? true,
            lead_alerts: data.preferences.lead_alerts ?? true,
            whatsapp_notifications: data.preferences.whatsapp_notifications ?? false,
            compact_view: data.preferences.compact_view ?? false,
            currency: data.preferences.currency || "IDR",
            timezone: data.preferences.timezone || "Asia/Jakarta",
          };

          setPreferences(loadedPrefs);
          applyCompactDOM(loadedPrefs.compact_view);
          setTheme(savedTheme);
        } else {
          const savedCompact = localStorage.getItem("compact_mode") === "true";
          applyCompactDOM(savedCompact);
          setPreferences((prev) => ({ ...prev, compact_view: savedCompact }));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      calculateCacheSize();
      loadUserData();
    }
  }, [router, mounted, setTheme]);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passwordScore = getPasswordStrength(newPassword);
  const strengthInfo = getPasswordStrengthInfo(passwordScore);

  const savePreferencesToDb = async (prefs: UserPreferences) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("users")
        .update({ preferences: prefs, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Gagal menyimpan preferensi ke DB:", error);
      toast.error("Gagal menyimpan preferensi", {
        description: error.message || "Perubahan mungkin tidak tersimpan permanen",
      });
    }
  };

  const persistPreferences = (partial: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      savePreferencesToDb(next);
      return next;
    });
  };

  const handleThemeSelect = (selectedTheme: ThemeChoice) => {
    setTheme(selectedTheme);
    persistPreferences({ theme_preference: selectedTheme, dark_mode: selectedTheme === "dark" });
    toast.success(`Tema diubah ke ${themeLabel(selectedTheme)}`);
  };

  const handleCompactToggle = (isCompact: boolean) => {
    applyCompactDOM(isCompact);
    persistPreferences({ compact_view: isCompact });
    toast.success(
      isCompact ? "Tampilan Padat (Compact) diaktifkan" : "Tampilan Normal diaktifkan"
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password baru minimal harus 8 karakter");
      return;
    }

    setSaving(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (reauthError) {
        toast.error("Password saat ini salah", {
          description: "Periksa kembali password lama Anda",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password akun berhasil diperbarui!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error("Gagal memperbarui password", {
        description: error.message || "Silakan periksa kembali data Anda",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: userEmail });
      if (error) throw error;
      toast.success("Email verifikasi telah dikirim ulang", {
        description: `Silakan cek inbox ${userEmail}`,
      });
    } catch (error: any) {
      toast.error("Gagal mengirim ulang email verifikasi", { description: error.message });
    } finally {
      setResendingVerification(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar dari sesi");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Gagal logout");
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const preserved: { [key: string]: string | null } = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const isAuthKey = key.startsWith("sb-") || key.includes("supabase");
        const isEssentialPref = ESSENTIAL_LOCALSTORAGE_KEYS.includes(key);
        if (isAuthKey || isEssentialPref) {
          preserved[key] = localStorage.getItem(key);
        }
      }

      localStorage.clear();
      sessionStorage.clear();

      Object.keys(preserved).forEach((key) => {
        if (preserved[key] !== null) localStorage.setItem(key, preserved[key]!);
      });

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      calculateCacheSize();
      toast.success("Cache & penyimpanan lokal berhasil dibersihkan!", {
        description: "Preferensi tema & akun Anda tetap aman. Memuat ulang halaman...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Gagal membersihkan cache:", error);
      toast.error("Gagal membersihkan cache", { description: error.message });
    } finally {
      setClearingCache(false);
    }
  };

  const handleTestNotification = async () => {
    if (!userId) {
      toast.error("User ID tidak ditemukan. Harap login ulang.");
      return;
    }

    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        sender_id: userId,
        type: "announcement",
        title: "📢 Tes Notifikasi Inland Property",
        message: "Halo! Fitur notifikasi web dan push notification luar web kini aktif.",
        is_read: false,
      });

      const res = await fetch("/api/notifications/push-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "📢 Tes Notifikasi Inland Property",
          message: "Halo! Push notification OneSignal berhasil meluncur ke layar perangkat Anda.",
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success("Notifikasi tes berhasil dikirim!", {
        description: "Cek ikon lonceng web dan bar notifikasi HP/PC Anda sekarang.",
      });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error("Gagal mengirim notifikasi tes", {
        description: error.message || "Terjadi kesalahan pada sistem.",
      });
    }
  };

  const handleExportData = () => {
    const payload = {
      account: {
        id: userId,
        email: userEmail,
        email_verified: emailVerified,
        last_sign_in_at: lastSignInAt,
      },
      preferences,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-akun-${(userId || "user").slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data akun berhasil diunduh");
  };

  const handleRequestDeletion = async () => {
    setSubmittingDeleteRequest(true);
    try {
      const { error } = await supabase.from("account_deletion_requests").insert({
        user_id: userId,
        email: userEmail,
        requested_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Permintaan penghapusan akun terkirim", {
        description: "Tim kami akan memproses dalam 1x24 jam dan menghubungi Anda via email.",
      });
      setConfirmingDelete(false);
    } catch (error: any) {
      console.error("Gagal mengirim permintaan hapus akun:", error);
      toast.error("Belum bisa memproses otomatis", {
        description: "Tabel permintaan belum tersedia. Hubungi admin secara langsung untuk saat ini.",
      });
    } finally {
      setSubmittingDeleteRequest(false);
    }
  };

  const { browser, os } = parseUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : "");

  if (!mounted || loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80 md:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 md:col-span-1 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Pengaturan Sistem
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
            >
              Enterprise v2.4
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola preferensi visual, keamanan kredensial, dan komunikasi akun Anda
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-xs h-9 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar Sesi
        </Button>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-11 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl mb-6">
          <TabsTrigger
            value="appearance"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tampilan & Tema</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Keamanan</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Regional & Sistem</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TAMPILAN & TEMA */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader className="p-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Mode Tampilan Antarmuka
              </CardTitle>
              <CardDescription className="text-xs">
                Klik kartu di bawah ini untuk mengganti tema tampilan aplikasi secara langsung. Perubahan tersimpan otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => handleThemeSelect("light")}
                  className={cn(
                    "cursor-pointer p-4 rounded-xl border-2 transition-all space-y-3 relative overflow-hidden group hover:shadow-md",
                    theme === "light"
                      ? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-600/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40">
                      <Sun className="w-4 h-4" />
                    </div>
                    {theme === "light" && (
                      <Badge className="bg-emerald-600 text-[10px]">Aktif</Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">Mode Terang (Light)</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tampilan kontras tinggi untuk siang hari
                    </p>
                  </div>
                  <div className="h-10 rounded-lg bg-slate-100 border border-slate-200 p-2 flex gap-1.5">
                    <div className="w-1/3 bg-white rounded border border-slate-200" />
                    <div className="w-2/3 bg-slate-200/60 rounded" />
                  </div>
                </div>

                <div
                  onClick={() => handleThemeSelect("dark")}
                  className={cn(
                    "cursor-pointer p-4 rounded-xl border-2 transition-all space-y-3 relative overflow-hidden group hover:shadow-md",
                    theme === "dark"
                      ? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-600/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60">
                      <Moon className="w-4 h-4" />
                    </div>
                    {theme === "dark" && (
                      <Badge className="bg-emerald-600 text-[10px]">Aktif</Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">Mode Gelap (Dark)</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Mengurangi lelah mata saat kondisi minim cahaya
                    </p>
                  </div>
                  <div className="h-10 rounded-lg bg-slate-900 border border-slate-800 p-2 flex gap-1.5">
                    <div className="w-1/3 bg-slate-800 rounded border border-slate-700" />
                    <div className="w-2/3 bg-slate-800/60 rounded" />
                  </div>
                </div>

                <div
                  onClick={() => handleThemeSelect("system")}
                  className={cn(
                    "cursor-pointer p-4 rounded-xl border-2 transition-all space-y-3 relative overflow-hidden group hover:shadow-md",
                    theme === "system"
                      ? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-600/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800">
                      <Monitor className="w-4 h-4" />
                    </div>
                    {theme === "system" && (
                      <Badge className="bg-emerald-600 text-[10px]">Aktif</Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">Otomatis (Sistem)</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Menyesuaikan otomatis dengan sistem OS
                    </p>
                  </div>
                  <div className="h-10 rounded-lg bg-gradient-to-r from-slate-100 to-slate-900 border border-slate-300 dark:border-slate-800 p-2" />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">
                    Tampilan Padat (Compact Mode)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Memangkas jarak padding & margin tabel untuk menampilkan data lebih banyak di layar
                  </p>
                </div>
                <Switch
                  checked={preferences.compact_view}
                  onCheckedChange={handleCompactToggle}
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Kalau setelah klik kartu di atas tampilan masih belum berubah, cek dua hal di luar halaman ini:
                  (1) <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">ThemeProvider</code> di layout
                  root sudah pakai <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">attribute=&quot;class&quot;</code>,
                  dan (2) <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">globals.css</code> punya baris{" "}
                  <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">@custom-variant dark (&amp;:where(.dark, .dark *));</code>.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: KEAMANAN & PASSWORD */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border shadow-xs">
              <CardHeader className="p-5 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Pembaruan Kata Sandi (Password)
                </CardTitle>
                <CardDescription className="text-xs">
                  Pastikan akun Anda menggunakan kredensial yang kuat dan unik
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-pass" className="font-semibold text-xs">
                      Password Saat Ini <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="current-pass"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-9 pr-9 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label htmlFor="new-pass" className="font-semibold text-xs">
                      Password Baru <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-pass"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Minimal 8 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-9 pr-9 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-300", strengthInfo.barClass)}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>Kekuatan Password:</span>
                          <span className="font-bold uppercase">{strengthInfo.label}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pass" className="font-semibold text-xs">
                      Konfirmasi Password Baru <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-pass"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Ulangi password baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-9 pr-9 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-semibold gap-2 shadow-xs mt-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Simpan Password Baru
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4 md:col-span-1">
              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Status Proteksi Akun
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200/50">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-medium">
                      Autentikasi Supabase SSL Terenkripsi
                    </span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-[11px] font-medium",
                      emailVerified
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50"
                        : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/50"
                    )}
                  >
                    {emailVerified ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{emailVerified ? "Email terverifikasi" : "Email belum diverifikasi"}</span>
                  </div>

                  {!emailVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="w-full h-8 text-[11px]"
                    >
                      {resendingVerification ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Kirim Ulang Verifikasi
                    </Button>
                  )}

                  <div className="space-y-1 text-muted-foreground text-[11px]">
                    <span className="block font-semibold text-foreground">Email Akun:</span>
                    <span className="font-mono">{userEmail || "-"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-emerald-600" />
                    Sesi & Perangkat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border">
                    <Laptop className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">
                        {browser} • {os}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Sesi aktif sekarang</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    <span className="font-semibold text-foreground block">Login terakhir:</span>
                    {formatDateTime(lastSignInAt)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* DANGER ZONE */}
          <Card className="border border-rose-200 dark:border-rose-900/50 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-rose-100 dark:border-rose-900/40">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-rose-600">
                <Trash2 className="w-4 h-4" />
                Zona Berbahaya
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-[11px] text-muted-foreground">
                Menghapus akun akan menghilangkan akses Anda secara permanen. Permintaan ini butuh
                persetujuan admin dan tidak langsung memproses penghapusan.
              </p>
              {!confirmingDelete ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 text-[11px]"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Ajukan Hapus Akun
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                    Yakin ingin mengajukan penghapusan akun?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-[11px]"
                      onClick={handleRequestDeletion}
                      disabled={submittingDeleteRequest}
                    >
                      {submittingDeleteRequest ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : null}
                      Ya, Ajukan
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-[11px]"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: NOTIFIKASI & ALERT */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader className="p-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                Preferensi Notifikasi & Peringatan
              </CardTitle>
              <CardDescription className="text-xs">
                Atur pemberitahuan mana saja yang ingin Anda terima melalui email atau saluran aplikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Notifikasi Email Aktivitas
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Kirim ringkasan laporan bulanan dan pembaruan sistem ke {userEmail}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(val) => persistPreferences({ email_notifications: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Alert Lead / Prospek Baru
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pemberitahuan instan ketika ada calon pembeli baru masuk ke CRM
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.lead_alerts}
                  onCheckedChange={(val) => persistPreferences({ lead_alerts: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Pembaruan Listing Properti
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Notifikasi saat status properti yang Anda pegang diubah agen lain
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.property_updates}
                  onCheckedChange={(val) => persistPreferences({ property_updates: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Notifikasi WhatsApp (Fitur Premium)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pengingat jadwal survei properti langsung dikirim ke WhatsApp Anda
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.whatsapp_notifications}
                  onCheckedChange={(val) => persistPreferences({ whatsapp_notifications: val })}
                />
              </div>

              <Separator />

              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <BellRing className="w-4 h-4 text-emerald-600" /> Uji Coba Integrasi Notifikasi
                  </h4>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                    Klik tombol untuk mengirim notifikasi tes ke Lonceng Web dan Push Bar HP/PC secara bersamaan.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleTestNotification}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shrink-0 gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Kirim Notifikasi Tes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: REGIONAL & SISTEM */}
        <TabsContent value="system" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader className="p-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                Format Regional & Lokalisasi
              </CardTitle>
              <CardDescription className="text-xs">
                Sesuaikan format standar angka mata uang dan zona waktu operasional Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Mata Uang Default</Label>
                  <Select
                    value={preferences.currency}
                    onValueChange={(val) => {
                      // ✅ FIX: nullish coalescing untuk menghindari error TypeScript
                      persistPreferences({ currency: val ?? undefined });
                      toast.success(`Mata uang default diubah ke ${val}`);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Mata Uang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR" className="text-xs">
                        Rupiah Indonesia (IDR - Rp)
                      </SelectItem>
                      <SelectItem value="USD" className="text-xs">
                        US Dollar (USD - $)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">
                    Zona Waktu Operasional
                  </Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(val) => {
                      // ✅ FIX: nullish coalescing untuk menghindari error TypeScript
                      persistPreferences({ timezone: val ?? undefined });
                      toast.success("Zona waktu operasional diperbarui");
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Zona Waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Jakarta" className="text-xs">
                        WIB (Asia/Jakarta - GMT+7)
                      </SelectItem>
                      <SelectItem value="Asia/Makassar" className="text-xs">
                        WITA (Asia/Makassar - GMT+8)
                      </SelectItem>
                      <SelectItem value="Asia/Jayapura" className="text-xs">
                        WIT (Asia/Jayapura - GMT+9)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    🕐 Waktu saat ini: {formatTimeInZone(now, preferences.timezone)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200/60 dark:border-sky-900/40 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-sky-600" />
                      Ekspor Data Akun
                    </h4>
                    <p className="text-[11px] text-sky-700/80 dark:text-sky-400 mt-0.5">
                      Unduh salinan data akun & preferensi Anda dalam format JSON.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    className="border-sky-500 text-sky-700 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/40 text-xs h-8 shrink-0 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Data Saya
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-600" />
                      Pembersihan Cache & Storage Browser
                      <Badge variant="outline" className="ml-1 text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300">
                        Memori Terpakai: {cacheSize}
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                      Bersihkan memori lokal sementara dan file skrip service worker jika Anda mengalami kendala sinkronisasi data. Preferensi tema & compact mode Anda tidak akan ikut terhapus.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 text-xs h-8 shrink-0 gap-1.5"
                  >
                    {clearingCache ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    Clear Cache Sekarang
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}