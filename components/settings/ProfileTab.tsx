"use client";

import { RefObject } from "react";
import Image from "next/image";
import {
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
  Key,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Save,
  MessageSquare,
  Headphones,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProfileTabProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadingAvatar: boolean;
  savingProfile: boolean;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileSubmit: (e: React.FormEvent) => void;
  // Security Password
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  changingPassword: boolean;
  handlePasswordSubmit: (e: React.FormEvent) => void;
  showCurrentPassword: boolean;
  setShowCurrentPassword: (v: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  strengthInfo: { label: string; barClass: string };
  // Helpers & Stats
  agentStats: any;
  statsLoading: boolean;
  roleLabel: (role: string) => string;
  roleBadgeClass: (role: string) => string;
  formatJoinDate: (dateStr: string) => string;
  formatCurrency: (value: number | undefined | null) => string;
  toWhatsAppLink: (phone: string) => string | null;
  openWhatsAppAdmin: () => void;
  setIsChatAdminOpen: (v: boolean) => void;
  handleCopy: (value: string, label: string) => void;
}

export function ProfileTab({
  profile,
  setProfile,
  fileInputRef,
  uploadingAvatar,
  savingProfile,
  handleAvatarUpload,
  handleProfileSubmit,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  changingPassword,
  handlePasswordSubmit,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  strengthInfo,
  agentStats,
  statsLoading,
  roleLabel,
  roleBadgeClass,
  formatJoinDate,
  formatCurrency,
  toWhatsAppLink,
  openWhatsAppAdmin,
  setIsChatAdminOpen,
  handleCopy,
}: ProfileTabProps) {
  const waLink = toWhatsAppLink(profile.phone);

  return (
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
                  onChange={(e) => setProfile((prev: any) => ({ ...prev, full_name: e.target.value }))}
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
                    onChange={(e) => setProfile((prev: any) => ({ ...prev, phone: e.target.value }))}
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
                    onChange={(e) => setProfile((prev: any) => ({ ...prev, company: e.target.value }))}
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
  );
}