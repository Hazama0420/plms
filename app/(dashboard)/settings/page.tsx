"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase/client";
import { reportService } from "@/services/report.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from "@/lib/support-config";

import {
  Settings,
  User,
  Globe,
  Sliders,
  Bell,
  LogOut,
  MessageSquare,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// IMPORT SUB-KOMPONEN SETTINGS
import { ProfileTab } from "@/components/settings/ProfileTab";
import { BrandingTab } from "@/components/settings/BrandingTab";
import { AppearanceTab, type CatalogViewMode } from "@/components/settings/AppearanceTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { SystemTab } from "@/components/settings/SystemTab";
import { ChatAdminModal } from "@/components/settings/ChatAdminModal";
import { useTranslation } from "@/hooks/use-translation";

type ThemeChoice = "light" | "dark" | "system";

interface UserPreferences {
  theme_preference: ThemeChoice;
  dark_mode: boolean;
  // Sakelar notifikasi.
  //
  // Setiap kunci di sini WAJIB ikut disusun ulang di `loadedPrefs`
  // (loadUserData). persistPreferences menulis seluruh objek preferences
  // sekaligus, jadi kunci yang tidak ikut dimuat akan terhapus dari basis data
  // begitu pengguna mengubah preferensi lain — persis yang dulu terjadi pada
  // push_notifications: sakelar yang sudah dimatikan diam-diam menyala lagi
  // di sisi server (lib/notification-helper.ts membacanya sebagai undefined).
  push_notifications: boolean;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  property_updates: boolean;
  lead_alerts: boolean;
  reminder_alerts: boolean;
  survey_alerts: boolean;
  compact_view: boolean;
  currency: string;
  timezone: string;
  accent_color?: string;
  /** Dipersempit ke CatalogViewMode agar cocok dengan prop AppearanceTab. */
  default_catalog_view?: CatalogViewMode;
  font_size: "normal" | "compact" | "large";
}

// ===== HELPER FUNCTIONS =====
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

const ESSENTIAL_LOCALSTORAGE_KEYS = ["theme", "compact_mode", "accent_color", "font_size", "default_catalog_view"];
const ADMIN_WHATSAPP_NUMBER = "6281234567890";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>("0 KB");

  // Profile & Branding State
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    company: "",
    avatar_url: "",
    role: "viewer",
    created_at: "",
    bio: "",
    specialization: "",
    arebi_number: "",
    instagram_url: "",
    tiktok_url: "",
    facebook_url: "",
    linkedin_url: "",
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
    push_notifications: true,
    email_notifications: true,
    whatsapp_notifications: false,
    property_updates: true,
    lead_alerts: true,
    reminder_alerts: true,
    survey_alerts: true,
    compact_view: false,
    currency: "IDR",
    timezone: "Asia/Jakarta",
    accent_color: "emerald",
    default_catalog_view: "grid",
    font_size: "normal",
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

  const applyAppearanceDOM = (prefs: Partial<UserPreferences>) => {
    if (typeof window === "undefined") return;

    if (prefs.compact_view !== undefined) {
      if (prefs.compact_view) {
        document.documentElement.classList.add("compact-mode");
      } else {
        document.documentElement.classList.remove("compact-mode");
      }
      localStorage.setItem("compact_mode", prefs.compact_view ? "true" : "false");
    }

    if (prefs.accent_color) {
      document.documentElement.setAttribute("data-accent", prefs.accent_color);
      localStorage.setItem("accent_color", prefs.accent_color);
    }

    if (prefs.font_size) {
      document.documentElement.setAttribute("data-font-size", prefs.font_size);
      localStorage.setItem("font_size", prefs.font_size);
    }

    if (prefs.default_catalog_view) {
      localStorage.setItem("default_catalog_view", prefs.default_catalog_view);
    }
  };

  // ===== SINKRONISASI DUA ARAH TEMA HEADER <-> SETTINGS =====
  useEffect(() => {
    if (mounted && theme) {
      setPreferences((prev) => {
        if (prev.theme_preference !== theme) {
          const updated = {
            ...prev,
            theme_preference: theme as ThemeChoice,
            dark_mode: theme === "dark",
          };
          savePreferencesToDb(updated);
          return updated;
        }
        return prev;
      });
    }
  }, [theme, mounted]);

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
          bio: data?.bio || "",
          specialization: data?.specialization || "",
          arebi_number: data?.arebi_number || "",
          instagram_url: data?.instagram_url || "",
          tiktok_url: data?.tiktok_url || "",
          facebook_url: data?.facebook_url || "",
          linkedin_url: data?.linkedin_url || "",
        });

        if (data?.preferences) {
          const savedTheme: ThemeChoice =
            data.preferences.theme_preference || (data.preferences.dark_mode ? "dark" : "light");

          const loadedPrefs: UserPreferences = {
            theme_preference: savedTheme,
            dark_mode: savedTheme === "dark",
            push_notifications: data.preferences.push_notifications ?? true,
            email_notifications: data.preferences.email_notifications ?? true,
            whatsapp_notifications: data.preferences.whatsapp_notifications ?? false,
            property_updates: data.preferences.property_updates ?? true,
            lead_alerts: data.preferences.lead_alerts ?? true,
            reminder_alerts: data.preferences.reminder_alerts ?? true,
            survey_alerts: data.preferences.survey_alerts ?? true,
            compact_view: data.preferences.compact_view ?? false,
            currency: data.preferences.currency || "IDR",
            timezone: data.preferences.timezone || "Asia/Jakarta",
            accent_color: data.preferences.accent_color || localStorage.getItem("accent_color") || "emerald",
            // Dinormalkan ke dua nilai yang sah saja; nilai asing dari DB atau
            // localStorage jangan sampai membuat tombolnya tidak ada yang aktif.
            default_catalog_view:
              (data.preferences.default_catalog_view ||
                localStorage.getItem("default_catalog_view")) === "table"
                ? "table"
                : "grid",
            font_size: data.preferences.font_size || (localStorage.getItem("font_size") as any) || "normal",
          };

          setPreferences(loadedPrefs);
          applyAppearanceDOM(loadedPrefs);

          if (theme !== savedTheme && !localStorage.getItem("theme")) {
            setTheme(savedTheme);
          }
        } else {
          const savedCompact = localStorage.getItem("compact_mode") === "true";
          const savedAccent = localStorage.getItem("accent_color") || "emerald";
          const savedCatalogView =
            localStorage.getItem("default_catalog_view") === "table" ? "table" : "grid";
          const savedFontSize = (localStorage.getItem("font_size") as any) || "normal";

          const fallbackPrefs: Partial<UserPreferences> = {
            compact_view: savedCompact,
            accent_color: savedAccent,
            default_catalog_view: savedCatalogView,
            font_size: savedFontSize,
          };

          applyAppearanceDOM(fallbackPrefs);
          setPreferences((prev) => ({ ...prev, ...fallbackPrefs }));
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
  }, [router, mounted]);

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

  // ===== BRANDING UPDATE HANDLER =====
  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);

    try {
      if (!userId) throw new Error("Not authenticated");

      const brandingPayload = {
        bio: profile.bio || null,
        specialization: profile.specialization || null,
        arebi_number: profile.arebi_number || null,
        instagram_url: profile.instagram_url || null,
        tiktok_url: profile.tiktok_url || null,
        facebook_url: profile.facebook_url || null,
        linkedin_url: profile.linkedin_url || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("users")
        .update(brandingPayload)
        .eq("id", userId);

      if (error) throw error;

      toast.success("Branding & Profil Publik berhasil diperbarui!");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating branding:", error);
      toast.error("Gagal memperbarui branding", { description: error.message });
    } finally {
      setSavingBranding(false);
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
  //
  // Dikirim lewat /api/support, bukan insert langsung dari peramban. Satu pesan
  // harus menjadi satu baris notifikasi untuk SETIAP admin, dan RLS melarang
  // klien menulis baris atas nama akun lain — lihat komentar di route-nya.
  const handleSendAdminMessage = async () => {
    const message = adminMessage.trim();

    // Cermin dari supportMessageSchema di lib/validations.ts. Tanpa ini, pesan
    // 1-9 karakter lolos di sini lalu ditolak server dengan "Data tidak valid."
    if (message.length < SUPPORT_MESSAGE_MIN) {
      toast.error(`Pesan terlalu singkat`, {
        description: `Ceritakan kendala Anda minimal ${SUPPORT_MESSAGE_MIN} karakter agar admin bisa menindaklanjuti.`,
      });
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // validate() menjawab 400 dengan `error` generik ("Data tidak valid.")
        // dan alasan sebenarnya di `details`. Membaca `error` saja membuat
        // pengirim melihat penolakan tanpa tahu apa yang harus diperbaiki.
        const detail = Array.isArray(json.details) ? json.details.join(" ") : null;
        throw new Error(detail ?? json.error ?? "Gagal mengirim pesan bantuan.");
      }

      toast.success("Pesan bantuan berhasil terkirim ke Admin!", {
        description: "Admin akan menerima notifikasi dan menindaklanjuti pesan Anda.",
      });

      setAdminMessage("");
      setIsChatAdminOpen(false);
    } catch (error) {
      console.error("Gagal mengirim pesan admin:", error);
      toast.error("Gagal mengirim pesan", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim data.",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const openWhatsAppAdmin = () => {
    const text = encodeURIComponent(`Halo Admin Inland Property, saya ${profile.full_name || userEmail} butuh bantuan terkait akun CRM saya.`);
    window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${text}`, "_blank");
  };

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
    }
  };

  const persistPreferences = (partial: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      savePreferencesToDb(next);
      applyAppearanceDOM(partial);
      return next;
    });
  };

  // 🎨 HANDLERS APPEARANCE TAB
  const handleThemeSelect = (selectedTheme: ThemeChoice) => {
    setTheme(selectedTheme);
    persistPreferences({ theme_preference: selectedTheme, dark_mode: selectedTheme === "dark" });
    toast.success(`Tema diubah ke ${selectedTheme === "light" ? "Terang" : selectedTheme === "dark" ? "Gelap" : "Otomatis"}`);
  };

  const handleCompactToggle = (isCompact: boolean) => {
    persistPreferences({ compact_view: isCompact });
    toast.success(isCompact ? "Tampilan Padat diaktifkan" : "Tampilan Normal diaktifkan");
  };

  // Tampilan default katalog properti.
  //
  // Tombolnya sebelumnya mati total: `AppearanceTab` memanggil
  // `handleDefaultCatalogViewChange?.(...)` sedangkan halaman ini tidak pernah
  // mengirim prop tersebut, jadi optional-call-nya berhenti di `undefined`.
  // Nilainya juga selalu tampak "grid" karena prop `defaultCatalogView` ikut
  // tidak dikirim dan jatuh ke nilai bawaan.
  const handleDefaultCatalogViewChange = (mode: CatalogViewMode) => {
    // persistPreferences sekaligus menulis ke localStorage lewat
    // applyAppearanceDOM, dan itulah yang dibaca halaman /properties saat dibuka.
    persistPreferences({ default_catalog_view: mode });
    toast.success(
      mode === "grid"
        ? "Katalog properti dibuka sebagai Kartu (Grid)"
        : "Katalog properti dibuka sebagai Tabel Rinci"
    );
  };

  const handleFontSizeChange = (size: "normal" | "compact" | "large") => {
    persistPreferences({ font_size: size });
    const labelMap = { compact: "Kecil", normal: "Normal", large: "Besar" };
    toast.success(`Skala teks diubah ke ${labelMap[size]}`);
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
  const publicProfileUrl = typeof window !== "undefined" ? `${window.location.origin}/agent/${profile.id}` : "";

  const isInternalUser = ["super_admin", "admin", "agent"].includes(profile.role?.toLowerCase());

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
              {t("settings.title")}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
            >
              Enterprise v2.4
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("settings.subtitle")}
          </p>
        </div>

        {/* Tiga tombol tidak muat berdampingan di lebar 375px, jadi barisnya
            dibiarkan membungkus alih-alih memaksa teksnya terpotong. */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsChatAdminOpen(true)}
            className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {t("settings.chatAdminBtn")}
          </Button>

          {/* Jalur cadangan bila pesan internal tidak terkirim — mis. belum ada
              admin terdaftar, yang membuat /api/support menjawab 503. */}
          <Button
            variant="outline"
            size="sm"
            onClick={openWhatsAppAdmin}
            className="text-xs h-9 gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {t("settings.waAdminBtn")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-xs h-9 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("settings.logoutBtn")}
          </Button>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className={cn(
            "grid h-auto p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl mb-6 gap-1",
            isInternalUser
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
              : "grid-cols-2 sm:grid-cols-4"
          )}
        >
          {/* TAB 1: PROFIL SAYA */}
          <TabsTrigger
            value="profile"
            className="text-xs font-semibold gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("settings.tabs.profile")}</span>
          </TabsTrigger>

          {/* TAB 2: BRANDING & PUBLIK */}
          {isInternalUser && (
            <TabsTrigger
              value="branding"
              className="text-xs font-semibold gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t("settings.tabs.branding")}</span>
            </TabsTrigger>
          )}

          {/* TAB 3: TAMPILAN & TEMA */}
          <TabsTrigger
            value="appearance"
            className="text-xs font-semibold gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("settings.tabs.appearance")}</span>
          </TabsTrigger>

          {/* TAB 4: NOTIFIKASI */}
          <TabsTrigger
            value="notifications"
            className="text-xs font-semibold gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("settings.tabs.notifications")}</span>
          </TabsTrigger>

          {/* TAB 5: REGIONAL & SISTEM */}
          <TabsTrigger
            value="system"
            className="text-xs font-semibold gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("settings.tabs.system")}</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB CONTENT 1: PROFIL SAYA */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileTab
            profile={profile}
            setProfile={setProfile}
            fileInputRef={fileInputRef}
            uploadingAvatar={uploadingAvatar}
            savingProfile={savingProfile}
            handleAvatarUpload={handleAvatarUpload}
            handleProfileSubmit={handleProfileSubmit}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            changingPassword={changingPassword}
            handlePasswordSubmit={handlePasswordSubmit}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            strengthInfo={strengthInfo}
            agentStats={agentStats}
            statsLoading={statsLoading}
            roleLabel={roleLabel}
            roleBadgeClass={roleBadgeClass}
            formatJoinDate={formatJoinDate}
            formatCurrency={formatCurrency}
            toWhatsAppLink={toWhatsAppLink}
            handleCopy={handleCopy}
          />
        </TabsContent>

        {/* TAB CONTENT 2: BRANDING */}
        {isInternalUser && (
          <TabsContent value="branding" className="space-y-6">
            <BrandingTab
              profile={profile}
              setProfile={setProfile}
              savingBranding={savingBranding}
              handleBrandingSubmit={handleBrandingSubmit}
              publicProfileUrl={publicProfileUrl}
              handleCopy={handleCopy}
            />
          </TabsContent>
        )}

        {/* TAB CONTENT 3: TAMPILAN & TEMA */}
        <TabsContent value="appearance" className="space-y-6">
          <AppearanceTab
            theme={theme}
            handleThemeSelect={handleThemeSelect}
            compactView={preferences.compact_view}
            handleCompactToggle={handleCompactToggle}
            defaultCatalogView={preferences.default_catalog_view}
            handleDefaultCatalogViewChange={handleDefaultCatalogViewChange}
            fontSize={preferences.font_size}
            handleFontSizeChange={handleFontSizeChange}
          />
        </TabsContent>

        {/* TAB CONTENT 4: NOTIFIKASI */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab
            preferences={preferences}
            persistPreferences={persistPreferences}
            userEmail={userEmail}
            userRole={profile.role}
          />
        </TabsContent>

        {/* TAB CONTENT 5: REGIONAL & SISTEM */}
        <TabsContent value="system" className="space-y-6">
          <SystemTab
            preferences={preferences}
            persistPreferences={persistPreferences}
            now={now}
            formatTimeInZone={formatTimeInZone}
            handleExportData={handleExportData}
            cacheSize={cacheSize}
            handleClearCache={handleClearCache}
            clearingCache={clearingCache}
            confirmingDelete={confirmingDelete}
            setConfirmingDelete={setConfirmingDelete}
            handleRequestDeletion={handleRequestDeletion}
            submittingDeleteRequest={submittingDeleteRequest}
            emailVerified={emailVerified}
            resendingVerification={resendingVerification}
            handleResendVerification={handleResendVerification}
            userEmail={userEmail}
            browser={browser}
            os={os}
            formatDateTime={formatDateTime}
            lastSignInAt={lastSignInAt}
            isViewer={!isInternalUser}
          />
        </TabsContent>
      </Tabs>

      {/* DIALOG MODAL CHAT ADMIN */}
      <ChatAdminModal
        isOpen={isChatAdminOpen}
        onOpenChange={setIsChatAdminOpen}
        profile={profile}
        userEmail={userEmail}
        adminMessage={adminMessage}
        setAdminMessage={setAdminMessage}
        sendingMessage={sendingMessage}
        handleSendAdminMessage={handleSendAdminMessage}
      />
    </div>
  );
}