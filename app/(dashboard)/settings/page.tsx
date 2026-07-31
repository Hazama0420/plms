// app/(dashboard)/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase/client";
import { reportService } from "@/services/report.service";
import { toast } from "sonner";
import {
  Settings,
  User,
  Mail,
  Phone,
  Building2,
  Camera,
  Sparkles,
  Copy,
  Lock,
  ShieldCheck,
  CalendarDays,
  MessageCircle,
  Link2,
  Key,
  Moon,
  Sun,
  Bell,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Monitor,
  Laptop,
  Globe,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Database,
  Trash2,
  BellRing,
  Download,
  AlertTriangle,
  Save,
  MessageSquare,
  Headphones,
  Send,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES & HELPERS
// ============================================================
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

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Admin";
    case "agent":
      return "Agen";
    default:
      return "Viewer";
  }
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300";
    case "agent":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatJoinDate(dateStr: string) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch {
    return "-";
  }
}

function toWhatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0")
    ? "62" + digits.slice(1)
    : digits.startsWith("62")
    ? digits
    : `62${digits}`;
  if (normalized.length < 9) return null;
  return `https://wa.me/${normalized}`;
}

function formatCurrency(value: number | undefined | null) {
  if (!value) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
const ADMIN_WHATSAPP_NUMBER = "6281234567890"; // Ganti dengan nomor WhatsApp Admin Anda

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>("0 KB");

  // Profile State
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    company: "",
    avatar_url: "",
    role: "viewer",
    created_at: "",
  });

  // Chat Admin Modal State
  const [isChatAdminOpen, setIsChatAdminOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Agent Performance Stats
  const [agentStats, setAgentStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Password States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Auth & System States
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

  // ===== LOAD USER DATA & PROFILE =====
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

        let { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

        if (!data && !error) {
          const { data: newUser } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "",
              avatar_url: user.user_metadata?.avatar_url || "",
              role: "viewer",
              phone: "",
              company: "",
            })
            .select()
            .single();

          data = newUser;
        }

        setProfile({
          id: user.id,
          full_name: data?.full_name || user.user_metadata?.full_name || "",
          email: user.email || "",
          phone: data?.phone || "",
          company: data?.company || "",
          avatar_url: data?.avatar_url || "",
          role: data?.role || "viewer",
          created_at: user.created_at || "",
        });

        // Preferences
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
        console.error("Error loading settings & profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      calculateCacheSize();
      loadUserData();
    }
  }, [router, mounted, setTheme]);

  // ===== FETCH QUICK STATS AGEN =====
  useEffect(() => {
    if (!profile.id) return;
    (async () => {
      setStatsLoading(true);
      try {
        const allAgents = await reportService.getAgentPerformance();
        const mine = allAgents?.find((a: any) => a.agent_id === profile.id) || null;
        setAgentStats(mine);
      } catch (error) {
        setAgentStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [profile.id]);

  // ===== AVATAR UPLOAD HANDLERS =====
  const deleteOldAvatar = async (url: string) => {
    try {
      const marker = "/avatars/";
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const path = url.substring(idx + marker.length).split("?")[0];
      if (path) await supabase.storage.from("avatars").remove([path]);
    } catch {}
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    setUploadingAvatar(true);
    try {
      if (!userId) throw new Error("Not authenticated");

      const previousAvatar = profile.avatar_url;
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Foto profil berhasil diperbarui!");

      if (previousAvatar) await deleteOldAvatar(previousAvatar);
      router.refresh();
    } catch (error: any) {
      toast.error("Gagal upload foto", { description: error.message });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ===== PROFILE UPDATE HANDLER =====
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("users")
        .update({
          full_name: profile.full_name,
          phone: profile.phone || null,
          company: profile.company || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profil berhasil diperbarui!");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil", { description: error.message });
    } finally {
      setSavingProfile(false);
    }
  };

  // ===== PASSWORD CHANGE WITH RE-AUTHENTICATION =====
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Masukkan password saat ini terlebih dahulu");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }

    setChangingPassword(true);
    try {
      // 1. Verifikasi Password Lama via signInWithPassword
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (reauthError) {
        toast.error("Password saat ini salah!", {
          description: "Periksa kembali password lama yang Anda masukkan.",
        });
        setChangingPassword(false);
        return;
      }

      // 2. Update ke Password Baru
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password akun berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Gagal mengubah password", { description: error.message });
    } finally {
      setChangingPassword(false);
    }
  };

 // ===== SEND CHAT TO ADMIN HANDLER =====
const handleSendAdminMessage = async () => {
  if (!adminMessage.trim()) {
    toast.error("Pesan bantuan wajib diisi");
    return;
  }

  setSendingMessage(true);
  try {
    // Ambil user ID langsung dari session Supabase untuk memastikan autentikasi
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
      setSendingMessage(false);
      return;
    }

    // Insert ke tabel support_tickets
    const { data: insertedData, error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        user_name: profile.full_name || user.email?.split("@")[0] || "User",
        user_email: user.email || userEmail,
        message: adminMessage,
        status: "open",
      })
      .select();

    if (insertError) {
      console.error("Supabase Support Ticket Error Detail:", insertError);
      throw new Error(insertError.message || insertError.details || "Gagal menyimpan ke database");
    }

    toast.success("Pesan bantuan berhasil terkirim ke Admin!", {
      description: "Pesan Anda telah tersimpan di halaman Support Admin.",
    });

    setAdminMessage("");
    setIsChatAdminOpen(false);
  } catch (error: any) {
    console.error("Gagal mengirim pesan admin:", error);
    toast.error("Gagal mengirim pesan", {
      description: error.message || "Terjadi kesalahan saat menyimpan data.",
    });
  } finally {
    setSendingMessage(false);
  }
};

  const openWhatsAppAdmin = () => {
    const text = encodeURIComponent(`Halo Admin Inland Property, saya ${profile.full_name || userEmail} butuh bantuan terkait akun CRM saya.`);
    window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${text}`, "_blank");
  };

  // ===== PASSWORD STRENGTH METER =====
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

  // ===== PREFERENCES HANDLERS =====
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
    toast.success(`Tema diubah ke ${selectedTheme === "light" ? "Terang" : selectedTheme === "dark" ? "Gelap" : "Otomatis"}`);
  };

  const handleCompactToggle = (isCompact: boolean) => {
    applyCompactDOM(isCompact);
    persistPreferences({ compact_view: isCompact });
    toast.success(
      isCompact ? "Tampilan Padat (Compact) diaktifkan" : "Tampilan Normal diaktifkan"
    );
  };

  const handleCopy = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} disalin`);
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
      router.push("/login");
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
          message: "Halo! Push notification berhasil meluncur ke layar perangkat Anda.",
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
      profile,
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
        description: "Tabel permintaan belum tersedia. Hubungi admin secara langsung.",
      });
    } finally {
      setSubmittingDeleteRequest(false);
    }
  };

  const { browser, os } = parseUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : "");
  const waLink = toWhatsAppLink(profile.phone);
  const publicProfileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/agent/${profile.id}` : "";

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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Pengaturan Sistem & Profil
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
            >
              Enterprise v2.4
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola profil pengguna, preferensi visual, keamanan akun, dan bantuan admin
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsChatAdminOpen(true)}
            className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat Admin Kantor
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-xs h-9 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Sesi
          </Button>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-11 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl mb-6">
          <TabsTrigger
            value="profile"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Profil Saya</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tampilan & Tema</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="text-xs font-semibold gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Regional & Sistem</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFIL SAYA */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
              {/* Foto Profil Card */}
              <Card className="border shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 pb-3 border-b">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <User size={16} className="text-emerald-600" />
                    Foto Profil Saya
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.full_name || "Avatar"}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-4xl text-white font-bold">
                          {profile.full_name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-medium cursor-pointer"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Camera size={18} />
                          Ganti Foto
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 shadow-md transition cursor-pointer"
                    >
                      <Camera size={14} />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>

                  <p className="mt-3 font-bold text-xs text-foreground text-center">
                    {profile.full_name || "Tanpa Nama"}
                  </p>

                  <Badge
                    variant="outline"
                    className={cn("mt-1.5 text-[10px] px-2 py-0.5 font-medium border-0", roleBadgeClass(profile.role))}
                  >
                    <ShieldCheck size={11} className="mr-1 inline-block" />
                    {roleLabel(profile.role)}
                  </Badge>

                  <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1">
                    <CalendarDays size={12} />
                    <span>Bergabung {formatJoinDate(profile.created_at)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* KARTU BANTUAN & CHAT ADMIN */}
              <Card className="border border-emerald-200 dark:border-emerald-900/60 shadow-xs bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
                <CardHeader className="p-4 pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <Headphones size={16} className="text-emerald-600" />
                    Bantuan Admin Kantor
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <p className="text-[11px] text-muted-foreground">
                    Mengalami kendala akun atau butuh panduan sistem CRM? Hubungi Admin Support Kantor.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openWhatsAppAdmin}
                      className="w-full text-xs h-8 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-1.5 cursor-pointer font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp Direct Admin
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsChatAdminOpen(true)}
                      className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Kirim Pesan Dukungan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Performa Agen Quick Stats */}
              {!statsLoading && agentStats && (
                <Card className="border shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                      <Sparkles size={15} className="text-emerald-600" />
                      Performa Agen Saya
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-l-3 border-blue-500 pl-2.5 py-0.5">
                      <span className="text-muted-foreground text-[11px]">Total Properti</span>
                      <span className="font-bold">{agentStats.total_properties}</span>
                    </div>
                    <div className="flex items-center justify-between border-l-3 border-emerald-500 pl-2.5 py-0.5">
                      <span className="text-muted-foreground text-[11px]">Terjual (Closing)</span>
                      <span className="font-bold text-emerald-600">{agentStats.total_sold}</span>
                    </div>
                    <div className="flex items-center justify-between border-l-3 border-purple-500 pl-2.5 py-0.5">
                      <span className="text-muted-foreground text-[11px]">Estimasi Komisi</span>
                      <span className="font-bold text-purple-600">{formatCurrency(agentStats.commission)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              {/* Form Data Diri */}
              <Card className="border shadow-xs">
                <CardHeader className="p-4 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    Informasi Data Diri & Kontak
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Perbarui nama lengkap, nomor WhatsApp, dan kantor perusahaan Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs flex items-center gap-1.5">
                        <Mail size={14} className="text-muted-foreground" />
                        Alamat Email Akun
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input value={profile.email} disabled className="h-9 bg-muted/50 text-xs" />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 cursor-pointer"
                          onClick={() => handleCopy(profile.email, "Email")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Email utama tidak dapat diubah secara langsung.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="full_name" className="font-semibold text-xs">
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        placeholder="Masukkan nama lengkap Anda"
                        value={profile.full_name}
                        onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                        className="h-9 text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="font-semibold text-xs flex items-center gap-1.5">
                          <Phone size={14} className="text-muted-foreground" />
                          Nomor Telepon / WhatsApp
                        </Label>
                        <Input
                          id="phone"
                          placeholder="089505808415"
                          value={profile.phone}
                          onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                          className="h-9 text-xs font-mono"
                        />
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline font-medium pt-0.5"
                          >
                            <MessageCircle size={12} />
                            Uji Coba Tautan WhatsApp
                          </a>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="company" className="font-semibold text-xs flex items-center gap-1.5">
                          <Building2 size={14} className="text-muted-foreground" />
                          Perusahaan / Kantor Agen
                        </Label>
                        <Input
                          id="company"
                          placeholder="Nama PT / Agensi Properti"
                          value={profile.company}
                          onChange={(e) => setProfile((prev) => ({ ...prev, company: e.target.value }))}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5 cursor-pointer"
                      >
                        {savingProfile ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Simpan Perubahan Profil
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Form Keamanan Akun */}
              <Card className="border shadow-xs">
                <CardHeader className="p-4 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    Keamanan Akun & Ubah Password
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Ubah password Anda secara berkala. Masukkan password lama untuk verifikasi keamanan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                      <Label htmlFor="current-pass" className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600" /> Password Saat Ini (Password Lama) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="current-pass"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Masukkan password lama Anda"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-9 pr-9 text-xs bg-background"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                        Wajib diisi untuk membuktikan identitas pemilik akun.
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {newPassword && (
                          <div className="space-y-1 pt-1">
                            <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className={cn("h-full transition-all duration-300", strengthInfo.barClass)} />
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white h-9 text-xs font-semibold gap-2 cursor-pointer mt-2"
                    >
                      {changingPassword ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      Perbarui Password Akun
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: TAMPILAN & TEMA */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader className="p-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Preferensi Antarmuka Visual
              </CardTitle>
              <CardDescription className="text-xs">
                Sesuaikan skema warna tema dan tata letak Tampilan Padat sesuai preferensi Anda.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* COMPACT SEGMENTED THEME SWITCHER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card gap-4">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">Mode Tema Tampilan</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih tema Terang, Gelap, atau Opsi Otomatis menyesuaikan OS Anda
                  </p>
                </div>

                <div className="inline-flex p-1 bg-muted rounded-xl border gap-1 self-stretch sm:self-auto justify-stretch">
                  <button
                    type="button"
                    onClick={() => handleThemeSelect("light")}
                    className={cn(
                      "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      theme === "light"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Terang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeSelect("dark")}
                    className={cn(
                      "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      theme === "dark"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gelap</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeSelect("system")}
                    className={cn(
                      "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      theme === "system"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5 text-slate-500" />
                    <span>Otomatis</span>
                  </button>
                </div>
              </div>

              <Separator />

              {/* COMPACT VIEW TOGGLE */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">
                    Tampilan Padat (Compact Mode)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Memangkas jarak padding & margin tabel untuk menampilkan lebih banyak data di layar
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
                  Perubahan tema disimpan secara otomatis ke profil akun Anda dan tetap sinkron saat Anda login dari perangkat lain.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: NOTIFIKASI & ALERT */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border shadow-xs">
            <CardHeader className="p-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                Preferensi Notifikasi & Peringatan CRM
              </CardTitle>
              <CardDescription className="text-xs">
                Atur pemberitahuan yang ingin Anda terima melalui email atau saluran aplikasi
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
                      Notifikasi WhatsApp
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shrink-0 gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Kirim Notifikasi Tes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: REGIONAL, SESI & SISTEM */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
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
                      <Label className="font-semibold text-xs">Zona Waktu Operasional</Label>
                      <Select
                        value={preferences.timezone}
                        onValueChange={(val) => {
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
                          Unduh salinan data profil & preferensi Anda dalam format JSON.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportData}
                        className="border-sky-500 text-sky-700 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/40 text-xs h-8 shrink-0 gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh Data
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-amber-600" />
                          Pembersihan Cache Browser
                          <Badge variant="outline" className="ml-1 text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300">
                            Terpakai: {cacheSize}
                          </Badge>
                        </h4>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                          Bersihkan memori lokal sementara jika Anda mengalami kendala sinkronisasi data. Preferensi tema Anda tetap aman.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearCache}
                        disabled={clearingCache}
                        className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 text-xs h-8 shrink-0 gap-1.5 cursor-pointer"
                      >
                        {clearingCache ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        Clear Cache
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DANGER ZONE */}
              <Card className="border border-rose-200 dark:border-rose-900/50 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-rose-100 dark:border-rose-900/40">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-rose-600">
                    <Trash2 className="w-4 h-4" />
                    Zona Berbahaya (Hapus Akun)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <p className="text-[11px] text-muted-foreground">
                    Menghapus akun akan menghilangkan akses Anda secara permanen. Permintaan ini butuh persetujuan admin.
                  </p>
                  {!confirmingDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 text-[11px] cursor-pointer"
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
                          className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-[11px] cursor-pointer"
                          onClick={handleRequestDeletion}
                          disabled={submittingDeleteRequest}
                        >
                          {submittingDeleteRequest && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                          Ya, Ajukan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[11px] cursor-pointer"
                          onClick={() => setConfirmingDelete(false)}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT SIDE */}
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
                      Autentikasi SSL Terenkripsi
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
                      className="w-full h-8 text-[11px] cursor-pointer"
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
                    <span className="block font-semibold text-foreground">Email Terdaftar:</span>
                    <span className="font-mono">{userEmail || "-"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-emerald-600" />
                    Sesi & Perangkat Aktif
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border">
                    <Laptop className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">
                        {browser} • {os}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Sesi aktif saat ini</p>
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
        </TabsContent>
      </Tabs>

      {/* DIALOG MODAL CHAT ADMIN */}
      <Dialog open={isChatAdminOpen} onOpenChange={setIsChatAdminOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Kirim Pesan ke Admin Kantor
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sampaikan kendala, pertanyaan, atau permintaan bantuan Anda ke Admin CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Pengirim</Label>
              <Input
                value={`${profile.full_name || "Agen"} (${userEmail})`}
                disabled
                className="h-8 text-xs bg-muted/50 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Pesan Bantuan / Pertanyaan *</Label>
              <Textarea
                placeholder="Tuliskan kendala atau pertanyaan Anda di sini..."
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={4}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChatAdminOpen(false)}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={sendingMessage || !adminMessage.trim()}
              onClick={handleSendAdminMessage}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
            >
              {sendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Kirim Pesan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}