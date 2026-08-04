"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Globe,
  Download,
  Database,
  Trash2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Loader2,
  Laptop,
  Bell,
  Save,
  RotateCcw,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SystemTabProps {
  preferences: any;
  persistPreferences: (partial: any) => void;
  now: Date;
  formatTimeInZone: (date: Date, tz: string) => string;
  handleExportData: () => void;
  cacheSize: string;
  handleClearCache: () => void;
  clearingCache: boolean;
  confirmingDelete: boolean;
  setConfirmingDelete: (v: boolean) => void;
  handleRequestDeletion: () => void;
  submittingDeleteRequest: boolean;
  emailVerified: boolean;
  resendingVerification: boolean;
  handleResendVerification: () => void;
  userEmail: string;
  browser: string;
  os: string;
  formatDateTime: (dateStr: string | null) => string;
  lastSignInAt: string | null;
}

export function SystemTab({
  preferences,
  persistPreferences,
  now,
  formatTimeInZone,
  handleExportData,
  cacheSize,
  handleClearCache,
  clearingCache,
  confirmingDelete,
  setConfirmingDelete,
  handleRequestDeletion,
  submittingDeleteRequest,
  emailVerified,
  resendingVerification,
  handleResendVerification,
  userEmail,
  browser,
  os,
  formatDateTime,
  lastSignInAt,
}: SystemTabProps) {
  // --- STATE LOKAL TAMBAHAN UNTUK NOTIFIKASI TOAST & AUTO-SAVE ---
  const [toastPosition, setToastPosition] = useState<string>("bottom-right");
  const [toastDuration, setToastDuration] = useState<number>(4000);
  const [autoSaveDrafts, setAutoSaveDrafts] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPos = localStorage.getItem("toast_position") || "bottom-right";
    const savedDur = localStorage.getItem("toast_duration") || "4000";
    const savedAutoSave = localStorage.getItem("auto_save_drafts") !== "false";

    setToastPosition(savedPos);
    setToastDuration(Number(savedDur));
    setAutoSaveDrafts(savedAutoSave);
  }, []);

  const handleToastPositionChange = (pos: string) => {
    setToastPosition(pos);
    localStorage.setItem("toast_position", pos);
    toast.success(`Posisi notifikasi diubah ke ${pos}`, {
      position: pos as any,
    });
  };

  const handleToastDurationChange = (dur: number, label: string) => {
    setToastDuration(dur);
    localStorage.setItem("toast_duration", dur.toString());
    toast.success(`Durasi notifikasi diubah ke ${label}`, {
      duration: dur,
    });
  };

  const handleAutoSaveToggle = (checked: boolean) => {
    setAutoSaveDrafts(checked);
    localStorage.setItem("auto_save_drafts", checked.toString());
    toast.success(
      checked
        ? "Penyimpanan otomatis draf formulir diaktifkan"
        : "Penyimpanan otomatis draf formulir dimatikan"
    );
  };

  const handleResetSystemPreferences = () => {
    if (confirm("Reset seluruh pengaturan sistem ke kondisi default?")) {
      persistPreferences({
        currency: "IDR",
        timezone: "Asia/Jakarta",
      });
      localStorage.setItem("toast_position", "bottom-right");
      localStorage.setItem("toast_duration", "4000");
      localStorage.setItem("auto_save_drafts", "true");
      setToastPosition("bottom-right");
      setToastDuration(4000);
      setAutoSaveDrafts(true);
      toast.success("Pengaturan sistem berhasil di-reset ke default.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. REGIONAL & ZONA WAKTU */}
      <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Format Regional & Lokalisasi Operasional
          </CardTitle>
          <CardDescription className="text-xs">
            Sesuaikan mata uang standar transaksi dan zona waktu untuk sinkronisasi jadwal laporan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs text-foreground">Mata Uang Default</Label>
              <Select
                value={preferences?.currency || "IDR"}
                onValueChange={(val) => persistPreferences({ currency: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80">
                  <SelectValue placeholder="Pilih Mata Uang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
              <Label className="font-semibold text-xs text-foreground">Zona Waktu Operasional</Label>
              <Select
                value={preferences?.timezone || "Asia/Jakarta"}
                onValueChange={(val) => persistPreferences({ timezone: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80">
                  <SelectValue placeholder="Pilih Zona Waktu" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
              <p className="text-[11px] text-muted-foreground pt-0.5 font-mono">
                🕐 Waktu sistem: {formatTimeInZone(now, preferences?.timezone || "Asia/Jakarta")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. PENGATURAN NOTIFIKASI SYSTEM & ALERT (TOAST) */}
      <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Pengaturan Notifikasi System & Pop-up
          </CardTitle>
          <CardDescription className="text-xs">
            Atur letak munculnya pesan popup notifikasi serta durasi lama penayangannya di layar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Posisi Toast */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Posisi Muncul Notifikasi</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "bottom-right", label: "Bawah Kanan" },
                { id: "bottom-left", label: "Bawah Kiri" },
                { id: "top-right", label: "Atas Kanan" },
                { id: "top-center", label: "Atas Tengah" },
              ].map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={toastPosition === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToastPositionChange(item.id)}
                  className={cn(
                    "text-xs h-8 sm:h-9 justify-between rounded-xl cursor-pointer border-border/80",
                    toastPosition === item.id ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
                  )}
                >
                  <span>{item.label}</span>
                  {toastPosition === item.id && <Check className="w-3.5 h-3.5 ml-1" />}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Durasi Toast */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Durasi Pesan Tampil</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { duration: 2500, label: "2.5 Detik (Cepat)" },
                { duration: 4000, label: "4 Detik (Standar)" },
                { duration: 7000, label: "7 Detik (Lama)" },
              ].map((item) => (
                <Button
                  key={item.duration}
                  type="button"
                  variant={toastDuration === item.duration ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToastDurationChange(item.duration, item.label)}
                  className={cn(
                    "text-xs h-8 sm:h-9 rounded-xl cursor-pointer border-border/80",
                    toastDuration === item.duration ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. MANAJEMEN DATA, CACHE & OTO-SAVE */}
      <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Penyimpanan Lokal & Backup Data
          </CardTitle>
          <CardDescription className="text-xs">
            Kelola draf formulir otomatis, ekspor file cadangan, serta pembersihan cache memori.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Auto Save Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground block flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5 text-emerald-600" /> Simpan Draf Formulir Otomatis
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Menyimpan input form properti ke memori browser agar data tidak hilang saat koneksi terputus.
              </p>
            </div>
            <Switch checked={autoSaveDrafts} onCheckedChange={handleAutoSaveToggle} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Download Backup JSON */}
            <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200/60 dark:border-sky-900/40 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-sky-600" /> Ekspor Data Profil & Preferensi
                </h4>
                <p className="text-[11px] text-sky-700/80 dark:text-sky-400 mt-1">
                  Unduh salinan berkas preferensi akun Anda dalam format JSON untuk kebutuhan backup pribadi.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="border-sky-500 text-sky-700 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/40 text-xs h-8 w-fit gap-1.5 rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Data JSON
              </Button>
            </div>

            {/* Clear Cache */}
            <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-600" /> Pembersihan Cache Browser
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300">
                    {cacheSize}
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">
                  Hapus file memori sementara jika mengalami kendala sinkronisasi data. Preferensi tema Anda tetap aman.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={clearingCache}
                className="border-amber-500 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 text-xs h-8 w-fit gap-1.5 rounded-xl cursor-pointer"
              >
                {clearingCache ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                )}
                Clear Cache Browser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. INFORMASI SESI & KEAMANAN AKUN */}
      <Card className="border border-border/80 shadow-xs rounded-2xl bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Status Sesi & Verifikasi Keamanan
          </CardTitle>
          <CardDescription className="text-xs">
            Informasi alamat email terverifikasi serta perangkat yang sedang terhubung saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Email */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Status Verifikasi Email</span>
                <Badge
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md",
                    emailVerified
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  )}
                >
                  {emailVerified ? "Terverifikasi" : "Belum Verifikasi"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{userEmail || "-"}</p>

              {!emailVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="w-full h-8 text-[11px] rounded-xl cursor-pointer mt-1"
                >
                  {resendingVerification ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Kirim Ulang Email Verifikasi
                </Button>
              )}
            </div>

            {/* Perangkat Sesi */}
            <div className="space-y-1.5 p-3.5 rounded-xl border border-border/70 bg-muted/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-foreground">Perangkat & Peramban Aktif</span>
                </div>
                <p className="text-xs font-bold mt-1">
                  {browser} • {os}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Login terakhir: {formatDateTime(lastSignInAt)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Reset Preferensi Sistem Button */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h4 className="font-bold text-xs text-foreground">Reset Pengaturan Sistem</h4>
              <p className="text-[11px] text-muted-foreground">
                Kembalikan pengaturan regional, zona waktu, dan opsi toast ke bawaan awal.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSystemPreferences}
              className="text-xs h-8 gap-1.5 rounded-xl border-border/80 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. ZONA BERBAHAYA (DANGER ZONE) */}
      <Card className="border border-rose-200 dark:border-rose-900/60 shadow-xs rounded-2xl bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-rose-600">
            <Trash2 className="w-4 h-4" />
            Zona Berbahaya (Pengajuan Hapus Akun)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Menghapus akun akan menghilangkan hak akses Anda ke portofolio properti secara permanen. Pengajuan penghapusan akun memerlukan verifikasi lanjutan dari Administrator.
          </p>
          {!confirmingDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 text-xs rounded-xl cursor-pointer"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Ajukan Penghapusan Akun
            </Button>
          ) : (
            <div className="space-y-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
              <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Yakin ingin mengajukan penghapusan akun?
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-xs rounded-xl cursor-pointer"
                  onClick={handleRequestDeletion}
                  disabled={submittingDeleteRequest}
                >
                  {submittingDeleteRequest && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Ya, Ajukan Penghapusan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs rounded-xl cursor-pointer"
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
  );
}