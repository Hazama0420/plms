"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { reportService } from "@/services/report.service";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ===== HELPER: label & warna badge untuk role =====
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
      return "bg-purple-100 text-purple-700";
    case "agent":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// ===== HELPER: format tanggal bergabung =====
function formatJoinDate(dateStr: string) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch {
    return "-";
  }
}

// ===== HELPER: ubah nomor telepon jadi link WhatsApp =====
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

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  // Statistik performa (khusus jika user adalah agen dengan data listing).
  // Loading terpisah & non-blocking supaya tidak menunda tampilnya form utama.
  const [agentStats, setAgentStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Form ganti password
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  // ===== FETCH PROFILE (dengan fallback) =====
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        let { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

        if (!data && !error) {
          const { data: newUser, error: insertError } = await supabase
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

          if (insertError) {
            console.warn("Insert user failed, using fallback:", insertError);
            data = {
              id: user.id,
              full_name: user.user_metadata?.full_name || "",
              email: user.email,
              phone: "",
              company: "",
              avatar_url: user.user_metadata?.avatar_url || "",
              role: "viewer",
            };
          } else {
            data = newUser;
          }
        } else if (error) {
          console.warn("Error fetching user, using fallback:", error);
          data = {
            id: user.id,
            full_name: user.user_metadata?.full_name || "",
            email: user.email,
            phone: "",
            company: "",
            avatar_url: user.user_metadata?.avatar_url || "",
            role: "viewer",
          };
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
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast.error("Gagal memuat profil", { description: error.message || "Coba refresh halaman" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ===== FETCH QUICK STATS (opsional, khusus agen) =====
  // Kalau gagal atau user bukan agen dengan data listing, kartu ini
  // cukup disembunyikan — tidak ditampilkan sebagai error ke user.
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

  // ===== HANDLE CHANGE =====
  const handleChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // ===== HAPUS AVATAR LAMA DARI STORAGE (biar tidak menumpuk file yatim) =====
  const deleteOldAvatar = async (url: string) => {
    try {
      const marker = "/avatars/";
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const path = url.substring(idx + marker.length).split("?")[0];
      if (path) await supabase.storage.from("avatars").remove([path]);
    } catch {
      // Gagal hapus file lama bukan hal fatal, biarkan saja
    }
  };

  // ===== HANDLE AVATAR UPLOAD =====
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const previousAvatar = profile.avatar_url;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Foto profil berhasil diupdate!");

      if (previousAvatar) await deleteOldAvatar(previousAvatar);

      router.refresh();
    } catch (error: any) {
      toast.error("Gagal upload foto", { description: error.message });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ===== HANDLE UPDATE PROFILE =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Cek apakah user punya row di users, jika tidak insert dulu
      const { data: existing } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          full_name: profile.full_name,
          phone: profile.phone || null,
          company: profile.company || null,
          avatar_url: profile.avatar_url || null,
          role: "viewer",
        });
        if (insertError) throw insertError;
      } else {
        const { error } = await supabase
          .from("users")
          .update({
            full_name: profile.full_name,
            phone: profile.phone || null,
            company: profile.company || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (error) throw error;
      }

      toast.success("Profil berhasil diperbarui!");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Gagal update profil", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLE GANTI PASSWORD =====
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast.success("Password berhasil diubah");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error("Gagal mengubah password", { description: error.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCopy = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} disalin`);
  };

  const waLink = toWhatsAppLink(profile.phone);
  const publicProfileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/agent/${profile.id}` : "";

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              <ArrowLeft size={22} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">👤 Profil Saya</h1>
              <p className="text-sm text-white/80">Kelola informasi akun Anda</p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {profile.email}
            </Badge>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <CalendarDays size={12} />
              Bergabung {formatJoinDate(profile.created_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <User size={18} className="text-blue-500" />
                Foto Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || "Avatar"}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-5xl text-white font-bold">
                      {profile.full_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* Overlay saat hover (desktop) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-medium"
                >
                  {uploadingAvatar ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Camera size={20} />
                      Ganti Foto
                    </>
                  )}
                </button>

                {/* Tombol kamera, tetap terlihat untuk perangkat sentuh */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg transition"
                >
                  <Camera size={18} />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <p className="mt-4 font-semibold text-slate-800">{profile.full_name || "Tanpa nama"}</p>

              <span
                className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(
                  profile.role
                )}`}
              >
                <ShieldCheck size={12} />
                {roleLabel(profile.role)}
              </span>

              <p className="text-xs text-slate-400 mt-3 text-center">
                Klik foto untuk mengganti
                <br />
                (maks. 2MB, format gambar)
              </p>
            </CardContent>
          </Card>

          {/* Quick stats performa - hanya tampil jika ada data agen */}
          {!statsLoading && agentStats && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Sparkles size={18} className="text-emerald-500" />
                  Performa Saya
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between border-l-4 border-blue-500 pl-3">
                  <span className="text-sm text-slate-500">Total Properti</span>
                  <span className="font-bold text-slate-800">{agentStats.total_properties}</span>
                </div>
                <div className="flex items-center justify-between border-l-4 border-emerald-500 pl-3">
                  <span className="text-sm text-slate-500">Terjual</span>
                  <span className="font-bold text-emerald-600">{agentStats.total_sold}</span>
                </div>
                <div className="flex items-center justify-between border-l-4 border-purple-500 pl-3">
                  <span className="text-sm text-slate-500">Komisi</span>
                  <span className="font-bold text-purple-600">{formatCurrency(agentStats.commission)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Link profil publik - relevan untuk agen berbagi listing ke klien */}
          {profile.role === "agent" && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Link2 size={18} className="text-cyan-500" />
                  Link Profil Publik
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-xs text-slate-400">Bagikan link ini ke klien untuk lihat listing Anda</p>
                <div className="flex items-center gap-2">
                  <Input value={publicProfileUrl} readOnly className="text-xs bg-slate-50 border-slate-200" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(publicProfileUrl, "Link")}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                  *Sesuaikan path <code className="bg-slate-100 px-1 rounded">/agent/[id]</code> di atas dengan
                  routing halaman publik agen yang sudah lo buat.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informasi Akun */}
          <form onSubmit={handleSubmit}>
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Sparkles size={18} className="text-yellow-500" />
                  Informasi Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    Email
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input value={profile.email} disabled className="bg-slate-50 border-slate-200" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(profile.email, "Email")}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">Email tidak dapat diubah</p>
                </div>

                {/* Nama Lengkap */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="font-medium">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Nama lengkap Anda"
                    value={profile.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="border-blue-200 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Telepon */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-medium flex items-center gap-2">
                    <Phone size={16} className="text-slate-400" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    placeholder="08123456789"
                    value={profile.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="border-emerald-200 focus:ring-emerald-500"
                  />
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <MessageCircle size={12} />
                      Buka di WhatsApp
                    </a>
                  )}
                </div>

                {/* Perusahaan */}
                <div className="space-y-2">
                  <Label htmlFor="company" className="font-medium flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    Perusahaan
                  </Label>
                  <Input
                    id="company"
                    placeholder="Nama perusahaan Anda"
                    value={profile.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    className="border-purple-200 focus:ring-purple-500"
                  />
                </div>

                {/* Submit */}
                <div className="pt-4 flex gap-3">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Simpan Perubahan
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Keamanan Akun - ganti password */}
          <form onSubmit={handlePasswordSubmit}>
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Lock size={18} className="text-slate-500" />
                  Keamanan Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password" className="font-medium">
                      Password Baru
                    </Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="Minimal 8 karakter"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="font-medium">
                      Konfirmasi Password
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Ulangi password baru"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={changingPassword || !passwords.newPassword}
                  className="border-slate-300"
                >
                  {changingPassword ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent mr-2" />
                      Mengubah...
                    </>
                  ) : (
                    <>
                      <Lock size={16} className="mr-2" />
                      Ubah Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}