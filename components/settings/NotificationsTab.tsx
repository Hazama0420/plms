"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Sparkles,
  BellRing,
  Smartphone,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarCheck,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

declare global {
  interface Window {
    // Gunakan as any atau pastikan tidak bentrok dengan mengabaikan error baris ini
    //@ts-ignore
    OneSignal?: any;
    //@ts-ignore
    OneSignalDeferred?: any[];
  }
}

interface NotificationsTabProps {
  preferences: any;
  persistPreferences: (partial: any) => void;
  userEmail: string;
  userRole?: string; // 👈 Menampung role pengguna (super_admin, admin, agent, viewer)
}

export function NotificationsTab({
  preferences,
  persistPreferences,
  userEmail,
  userRole = "viewer",
}: NotificationsTabProps) {
  // Cek apakah role termasuk tim internal (Super Admin, Admin, atau Agent)
  const isInternalUser = ["super_admin", "admin", "agent"].includes(userRole.toLowerCase());

  // ===== ONESIGNAL & BROWSER PUSH STATE =====
  const [isPushSupported, setIsPushSupported] = useState(true);
  const [isOneSignalSubscribed, setIsOneSignalSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "loading">("loading");
  const [loadingPush, setLoadingPush] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setIsPushSupported(false);
      setPermissionState("denied");
      return;
    }

    setPermissionState(Notification.permission);

    const syncOneSignalStatus = () => {
      if (window.OneSignal?.User?.PushSubscription) {
        const isOptedIn = window.OneSignal.User.PushSubscription.optedIn ?? false;
        setIsOneSignalSubscribed(isOptedIn);
      } else if (preferences.push_notifications && Notification.permission === "granted") {
        setIsOneSignalSubscribed(true);
      }
    };

    syncOneSignalStatus();

    if (window.OneSignal?.User?.PushSubscription) {
      try {
        window.OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
          const active = !!event?.current?.optedIn;
          setIsOneSignalSubscribed(active);
          persistPreferences({ push_notifications: active });
        });
      } catch (err) {
        console.debug("OneSignal event listener notice:", err);
      }
    }
  }, [preferences.push_notifications]);

  const handleTogglePushNotification = async (enabled: boolean) => {
    if (!isPushSupported) {
      toast.error("Browser ini tidak mendukung Push Notification.");
      return;
    }

    setLoadingPush(true);
    try {
      if (enabled) {
        if (Notification.permission === "denied") {
          toast.error("Izin Notifikasi Diblokir di Browser!", {
            description: "Klik ikon gembok/setelan di address bar browser Anda lalu ubah izin Notifikasi menjadi 'Allow'.",
          });
          setLoadingPush(false);
          return;
        }

        if (window.OneSignal) {
          await window.OneSignal.Notifications.requestPermission();
          await window.OneSignal.User.PushSubscription.optIn();
          setIsOneSignalSubscribed(true);
          toast.success("Push Notification OneSignal berhasil diaktifkan!");
        } else {
          const result = await Notification.requestPermission();
          setPermissionState(result);
          if (result === "granted") {
            setIsOneSignalSubscribed(true);
            toast.success("Izin Push Notification browser diberikan!");
          } else {
            toast.warning("Izin notifikasi tidak diberikan.");
          }
        }
        persistPreferences({ push_notifications: true });
      } else {
        if (window.OneSignal?.User?.PushSubscription) {
          await window.OneSignal.User.PushSubscription.optOut();
        }
        setIsOneSignalSubscribed(false);
        persistPreferences({ push_notifications: false });
        toast.info("Push Notification OneSignal telah dinonaktifkan.");
      }
    } catch (error: any) {
      console.error("Gagal mengubah OneSignal push status:", error);
      toast.error("Gagal memperbarui setelan OneSignal", { description: error.message });
    } finally {
      setLoadingPush(false);
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermissionState(Notification.permission);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 🟢 KARTU INTEGRASI ONESIGNAL WEB PUSH (BERLAKU UNTUK SEMUA ROLE) */}
      <Card className="border border-emerald-200 dark:border-emerald-900/60 shadow-xs bg-gradient-to-r from-emerald-50/60 via-background to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardHeader className="p-5 pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-950 dark:text-emerald-200">
              <Globe className="w-4 h-4 text-emerald-600" />
              Notifikasi Web Push (OneSignal API)
            </CardTitle>
            {permissionState === "granted" && isOneSignalSubscribed ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300 text-[10px] gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif & Terhubung
              </Badge>
            ) : permissionState === "denied" ? (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <XCircle className="w-3 h-3" /> Diblokir Browser
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                <AlertCircle className="w-3 h-3" /> Belum Aktif
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Terima siaran kabar instan langsung di layar HP/Desktop Anda, bahkan saat aplikasi sedang ditutup.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                <Bell className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground block">
                  Langganan Push Notification Perangkat
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Layanan push disinkronkan langsung via akun OneSignal peramban ini
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {loadingPush && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
              <Switch
                checked={isOneSignalSubscribed}
                disabled={loadingPush || !isPushSupported}
                onCheckedChange={handleTogglePushNotification}
              />
            </div>
          </div>

          {permissionState === "denied" && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[11px]">Akses Notifikasi Diblokir Peramban</p>
                <p className="text-[11px] leading-relaxed text-rose-700/90 dark:text-rose-400">
                  Untuk menerima notifikasi OneSignal, izinkan situs ini mengirimkan notifikasi melalui setelan privasi/gembok pada URL browser Anda.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 📬 KARTU PREFERENSI NOTIFIKASI UMUM & INTERNAL */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600" />
              Preferensi Pemberitahuan {isInternalUser ? "Operasional CRM" : "Umum"}
            </CardTitle>
            <Badge
              variant="outline"
              className={
                isInternalUser
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-[10px]"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px]"
              }
            >
              {isInternalUser ? (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" /> Akses Internal ({userRole.toUpperCase()})
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" /> Pengaturan Standar (Viewer)
                </span>
              )}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {isInternalUser
              ? "Kelola saluran notifikasi operasional internal, lead prospek, WhatsApp gateway, dan pembaruan listing."
              : "Kelola notifikasi umum seperti berita properti, info buletin, dan kabar pembaruan sistem."}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* EMAIL NOTIFICATIONS (BERLAKU UNTUK SEMUA ROLE) */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-xs font-bold text-foreground block">
                  Notifikasi Email {isInternalUser ? "Aktivitas CRM" : "Kabar & Pengumuman"}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isInternalUser
                    ? `Kirim ringkasan laporan bulanan dan pembaruan sistem ke ${userEmail}`
                    : `Kirim kabar proyek properti terbaru dan informasi pengumuman ke ${userEmail}`}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.email_notifications ?? true}
              onCheckedChange={(val) => persistPreferences({ email_notifications: val })}
            />
          </div>

          {/* 🔒 FITUR KHUSUS INTERNAL (SUPER ADMIN, ADMIN, AGENT) */}
          {isInternalUser ? (
            <>
              {/* WHATSAPP GATEWAY */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Notifikasi WhatsApp Gateway
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Kirim pesan konfirmasi janji temu & pengingat jadwal survei lokasi ke WhatsApp Anda
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.whatsapp_notifications ?? false}
                  onCheckedChange={(val) => persistPreferences({ whatsapp_notifications: val })}
                />
              </div>

              <Separator />

              {/* LEAD ALERTS */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Alert Lead / Prospek Baru
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pemberitahuan seketika saat calon pembeli baru masuk ke sistem CRM
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.lead_alerts ?? true}
                  onCheckedChange={(val) => persistPreferences({ lead_alerts: val })}
                />
              </div>

              {/* PROPERTY UPDATES */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Pembaruan Status Listing Properti
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Notifikasi saat status properti yang Anda pegang diubah atau telah terjual
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.property_updates ?? true}
                  onCheckedChange={(val) => persistPreferences({ property_updates: val })}
                />
              </div>

              {/* FOLLOW-UP & SURVEI REMINDERS */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      Pengingat Jadwal & Follow-up Lead
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pengingat otomatis H-1 sebelum agenda survei atau batas waktu follow-up klien
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.reminder_alerts ?? true}
                  onCheckedChange={(val) => persistPreferences({ reminder_alerts: val })}
                />
              </div>
            </>
          ) : (
            /* ℹ️ INFORMASI TAMBAHAN UNTUK ROLE VIEWER / GUEST */
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Akun Tamu / Pengunjung
              </p>
              <p className="leading-relaxed">
                Fitur notifikasi internal seperti <i>Lead Alert</i>, <i>WhatsApp Gateway</i>, dan <i>Pengingat Survei</i> khusus tersedia bagi agen properti dan pengelola kantor. Hubungi admin jika Anda ingin mengajukan peningkatan peran akun menjadi **Agen**.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}