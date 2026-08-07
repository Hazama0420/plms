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
import {
  getOneSignalStatus,
  subscribeOneSignalStatus,
  type OneSignalStatus,
} from "@/components/providers/onesignal-provider";

declare global {
  interface Window {
    // Gunakan as any atau pastikan tidak bentrok dengan mengabaikan error baris ini
    //@ts-ignore
    OneSignal?: any;
    //@ts-ignore
    OneSignalDeferred?: any[];
  }
}

/**
 * Sakelar notifikasi yang dikenal halaman Pengaturan.
 *
 * Sengaja tidak `any`: setiap kunci di sini harus ikut disusun ulang di
 * `loadedPrefs` (app/(dashboard)/settings/page.tsx). Ketika `preferences`
 * masih bertipe `any`, hilangnya `push_notifications` dari daftar itu tidak
 * terdeteksi kompiler — sakelar push yang sudah dimatikan pengguna terhapus
 * dari basis data setiap kali preferensi lain disimpan.
 */
export interface NotificationPreferences {
  push_notifications?: boolean;
  email_notifications?: boolean;
  whatsapp_notifications?: boolean;
  lead_alerts?: boolean;
  property_updates?: boolean;
  reminder_alerts?: boolean;
  survey_alerts?: boolean;
}

interface NotificationsTabProps {
  preferences: NotificationPreferences;
  persistPreferences: (partial: NotificationPreferences) => void;
  userEmail: string;
  userRole?: string; // 👈 Menampung role pengguna (super_admin, admin, agent, viewer)
}

/**
 * Menjalankan sebuah promise dengan batas waktu.
 *
 * Diperlukan karena metode OneSignal bisa menggantung tanpa batas bila skrip
 * SDK-nya tidak pernah termuat — pemblokir iklan menahan cdn.onesignal.com di
 * hampir semua daftar blokir. Tanpa batas waktu, `await` di dalam toggle tidak
 * pernah selesai, blok `finally` tidak pernah dijalankan, dan sakelarnya
 * berputar selamanya.
 *
 * Ini jaring pengaman, bukan jalur normal: dua mode kegagalan yang benar-benar
 * pernah terjadi — origin tidak cocok dan SDK gagal dimuat — sekarang dikenali
 * lebih dulu lewat getOneSignalStatus(), sehingga tidak ada lagi yang perlu
 * ditunggu sampai batas waktu habis.
 */
const PUSH_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} tidak merespons dalam ${ms / 1000} detik.`)), ms)
    ),
  ]);
}

/**
 * Mengembalikan objek OneSignal bila benar-benar siap dipakai, bukan sekadar ada.
 *
 * Ada dua mode kegagalan yang berbeda, dan keduanya harus ditolak di sini:
 *
 * 1. Skrip SDK gagal diunduh (pemblokir iklan). Metode yang hendak dipanggil
 *    tidak ada, jadi pemeriksaan `typeof ... === "function"` menangkapnya.
 * 2. Skrip termuat PENUH tetapi init ditolak — misalnya origin peramban tidak
 *    cocok dengan Site URL di dasbor OneSignal. Di sini seluruh metode ada dan
 *    berupa fungsi, sehingga pemeriksaan bentuk objek lolos; yang terjadi
 *    kemudian adalah setiap pemanggilan menggantung selamanya di belakang
 *    promise init yang tidak pernah selesai. Inilah sumber sakelar berputar,
 *    dan hanya status dari provider yang bisa membedakannya.
 *
 * Objeknya dikembalikan — bukan boolean — supaya pemanggil punya satu rujukan
 * yang sudah pasti ada. Predikat boolean tidak mempersempit tipe
 * `window.OneSignal` di mata kompiler, dan membacanya ulang setelah `await`
 * berarti membaca nilai yang bisa saja sudah berubah.
 */
function getReadyOneSignal(): any | null {
  if (getOneSignalStatus() !== null) return null;

  const os = typeof window !== "undefined" ? window.OneSignal : undefined;
  const ready =
    typeof os?.Notifications?.requestPermission === "function" &&
    typeof os?.User?.PushSubscription?.optIn === "function";
  return ready ? os : null;
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

  // Status dari provider (root layout). Dibaca lewat langganan, bukan sekali di
  // mount: efek provider berjalan setelah efek halaman, jadi pembacaan awal bisa
  // mendapat null yang basi — dan null vs "origin" menentukan apa yang
  // ditampilkan sakelar di bawah.
  const [oneSignalStatus, setOneSignalStatus] = useState<OneSignalStatus>(
    () => getOneSignalStatus()
  );

  useEffect(() => {
    return subscribeOneSignalStatus(setOneSignalStatus);
  }, []);

  // Origin peramban tidak cocok dengan SITE.url — push tidak akan pernah
  // terdaftar di alamat ini. Sakelar dimatikan dengan penjelasan, bukan dibiarkan
  // berputar 15 detik lalu gagal.
  const originBlocked = oneSignalStatus === "origin";

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setIsPushSupported(false);
      setPermissionState("denied");
      return;
    }

    setPermissionState(Notification.permission);

    // Di SDK v16 getter `User` MELEMPAR bila init belum selesai (mis. setelah
    // init ditolak karena origin). Optional chaining tidak menahan getter yang
    // melempar — tanpa try/catch, halaman Pengaturan bisa jatuh hanya karena
    // OneSignal tidak siap.
    let pushSub: any = undefined;
    try {
      pushSub = window.OneSignal?.User?.PushSubscription;
    } catch {
      pushSub = undefined;
    }

    if (pushSub) {
      setIsOneSignalSubscribed(pushSub.optedIn ?? false);
    } else if (preferences.push_notifications && Notification.permission === "granted") {
      setIsOneSignalSubscribed(true);
    }

    if (!pushSub?.addEventListener) return;

    // Pendengar harus dilepas saat efek dijalankan ulang. Sebelumnya tidak, dan
    // karena efek ini bergantung pada `preferences.push_notifications` — nilai
    // yang justru diubah oleh pendengarnya sendiri lewat persistPreferences —
    // setiap penekanan sakelar menambah satu pendengar baru di atas yang lama.
    const onChange = (event: any) => {
      const active = !!event?.current?.optedIn;
      setIsOneSignalSubscribed(active);
      persistPreferences({ push_notifications: active });
    };

    try {
      pushSub.addEventListener("change", onChange);
    } catch (err) {
      console.debug("OneSignal event listener notice:", err);
      return;
    }

    return () => {
      try {
        pushSub.removeEventListener?.("change", onChange);
      } catch {
        // SDK bisa sudah dibongkar saat halaman ditinggalkan — tidak perlu ribut.
      }
    };
  }, [preferences.push_notifications]);

  const handleTogglePushNotification = async (enabled: boolean) => {
    if (!isPushSupported) {
      toast.error("Browser ini tidak mendukung Push Notification.");
      return;
    }

    if (originBlocked) {
      toast.error("Layanan push tidak tersedia di alamat ini.", {
        description: "Buka situs melalui alamat utama (bukan pratayang atau domain lain) untuk mengaktifkan notifikasi.",
      });
      return;
    }

    setLoadingPush(true);
    try {
      if (enabled) {
        if (Notification.permission === "denied") {
          toast.error("Izin Notifikasi Diblokir di Browser!", {
            description: "Klik ikon gembok/setelan di address bar browser Anda lalu ubah izin Notifikasi menjadi 'Allow'.",
          });
          return;
        }

        // getReadyOneSignal(), bukan sekadar `if (window.OneSignal)` — objeknya
        // selalu ada sebagai stub, bahkan ketika SDK-nya gagal diunduh.
        const os = getReadyOneSignal();

        if (os) {
          await withTimeout(os.Notifications.requestPermission(), PUSH_TIMEOUT_MS, "OneSignal");
          await withTimeout(os.User.PushSubscription.optIn(), PUSH_TIMEOUT_MS, "OneSignal");
          setIsOneSignalSubscribed(true);
          toast.success("Push Notification OneSignal berhasil diaktifkan!");
        } else {
          // Jalur cadangan: izin diminta lewat Notification API bawaan. Perangkat
          // ini tidak akan menerima push dari server (OneSignal tidak mengenalnya),
          // tapi setidaknya sakelarnya selesai dan pengguna tahu keadaannya.
          const result = await Notification.requestPermission();
          setPermissionState(result);
          if (result === "granted") {
            setIsOneSignalSubscribed(true);
            toast.success("Izin notifikasi diberikan", {
              description:
                "Layanan OneSignal tidak dapat dihubungi — kemungkinan diblokir pemblokir iklan. Notifikasi lonceng di dalam aplikasi tetap berjalan.",
            });
          } else {
            toast.warning("Izin notifikasi tidak diberikan.");
            return;
          }
        }
        persistPreferences({ push_notifications: true });
      } else {
        const os = getReadyOneSignal();

        if (os) {
          try {
            await withTimeout(os.User.PushSubscription.optOut(), PUSH_TIMEOUT_MS, "OneSignal");
          } catch (err) {
            // Mematikan sakelar tidak boleh gagal hanya karena SDK tidak
            // merespons — preferensinya tetap disimpan di basis data, dan
            // lib/notification-helper.ts membacanya sebelum mengirim apa pun.
            console.warn("OneSignal optOut gagal, preferensi tetap disimpan:", err);
          }
        }
        setIsOneSignalSubscribed(false);
        persistPreferences({ push_notifications: false });
        toast.info("Push Notification OneSignal telah dinonaktifkan.");
      }
    } catch (error: any) {
      console.error("Gagal mengubah OneSignal push status:", error);
      toast.error("Gagal memperbarui setelan push", {
        description:
          error?.message ??
          "Coba muat ulang halaman, atau nonaktifkan pemblokir iklan untuk situs ini.",
      });
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
            ) : originBlocked ? (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/60">
                <ShieldAlert className="w-3 h-3" /> Tidak Tersedia di Alamat Ini
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
                disabled={loadingPush || !isPushSupported || originBlocked}
                onCheckedChange={handleTogglePushNotification}
              />
            </div>
          </div>

          {originBlocked && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[11px]">Layanan Push Tidak Tersedia di Alamat Ini</p>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-400">
                  Alamat yang sedang Anda buka berbeda dari alamat utama yang terdaftar
                  di layanan push, sehingga perangkat ini tidak bisa didaftarkan. Buka
                  situs melalui alamat utamanya untuk mengaktifkan notifikasi.
                  Notifikasi lonceng di dalam aplikasi tetap berjalan seperti biasa.
                </p>
              </div>
            </div>
          )}

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
          {/* EMAIL NOTIFICATIONS — kanal belum terpasang (lihat badge). */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  Notifikasi Email {isInternalUser ? "Aktivitas CRM" : "Kabar & Pengumuman"}
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 text-[9px] font-semibold"
                  >
                    Segera Hadir
                  </Badge>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Pengiriman email ke {userEmail} belum tersedia. Gunakan lonceng dan
                  push perangkat untuk sementara.
                </p>
              </div>
            </div>
            {/*
              Dinonaktifkan secara sadar: tidak ada satu pun pengirim email di
              aplikasi ini, jadi sakelar yang bisa dinyalakan hanya akan
              menjanjikan sesuatu yang tidak pernah terkirim.
            */}
            <Switch checked={false} disabled />
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
                      Izinkan sistem mengirim pesan WhatsApp ke nomor Anda. Dimatikan
                      berarti pesan otomatis dilewati, termasuk yang dipicu dari halaman lead.
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
                      Pemberitahuan saat agenda follow-up baru dijadwalkan untuk Anda.
                      Pengingat otomatis H-1 menyusul.
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

          {/* SURVEI — sengaja di luar gerbang isInternalUser.
              Alur survei menyentuh kedua sisi: agen menerima pengajuan masuk,
              client menerima konfirmasi dan penolakan jadwalnya sendiri. Bila
              sakelar ini ikut disembunyikan dari viewer, satu-satunya notifikasi
              yang mereka terima justru tidak punya tombol mati. */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-xs font-bold text-foreground block">
                  Pengajuan &amp; Konfirmasi Survei
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isInternalUser
                    ? "Pemberitahuan saat client mengajukan survei atas properti yang Anda pegang."
                    : "Pemberitahuan saat pengajuan survei Anda dikonfirmasi atau ditolak agen."}{" "}
                  Pengingat 1 jam sebelum survei mengikuti sakelar pengingat.
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.survey_alerts ?? true}
              onCheckedChange={(val) => persistPreferences({ survey_alerts: val })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}