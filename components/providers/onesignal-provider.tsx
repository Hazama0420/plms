// components/providers/onesignal-provider.tsx
//
// Menyalakan OneSignal Web Push sekaligus menautkan perangkat ini ke akun
// Supabase yang sedang login.
//
// Penautan itulah bagian yang sebelumnya hilang. Tanpa OneSignal.login(),
// OneSignal tidak tahu perangkat mana milik siapa, sehingga server tidak punya
// cara mengirim ke satu orang — dan kode lama menutupinya dengan menyiarkan ke
// segment "All". External ID yang dipakai adalah `auth.users.id` Supabase, sama
// dengan yang dikirim server lewat lib/onesignal.ts.
"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { supabase } from "@/lib/supabase/client";
import { SITE } from "@/lib/site-config";

// Disimpan di tingkat modul, bukan useRef, agar tetap satu kali walau React
// Strict Mode menjalankan efek dua kali saat pengembangan.
let initPromise: Promise<void> | null = null;

/**
 * Mengapa OneSignal tidak (belum) siap:
 * - `"origin"` — init sengaja dilewati karena window.location.origin berbeda
 *   dari SITE.url. Inisialisasi yang tetap dijalankan akan ditolak SDK dan
 *   membuat seluruh pemanggilan berikutnya menggantung selamanya — itulah yang
 *   membuat sakelar langganan berputar tanpa selesai.
 * - `"load"` — init dicoba dan gagal (umumnya pemblokir iklan menahan
 *   cdn.onesignal.com). SDK-nya tidak pernah siap; pemanggilan diulang hanya
 *   akan melempar galat yang sama.
 * - `null` — belum ada masalah: belum dicoba, berhasil, atau dilewati di
 *   localhost.
 */
export type OneSignalStatus = "origin" | "load" | null;

let initStatus: OneSignalStatus = null;

type StatusListener = (status: OneSignalStatus) => void;
const statusListeners = new Set<StatusListener>();

/**
 * Berlangganan perubahan status. Provider ada di root layout, jadi efeknya
 * berjalan SETELAH efek halaman — komponen yang membaca status hanya sekali di
 * mount bisa mendapat null yang basi. Langganan ini membuat UI ikut berubah
 * begitu status ditetapkan.
 */
export function subscribeOneSignalStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

/** Pembaca status untuk UI — dipakai NotificationsTab untuk menerangkan
 * keadaan sakelar alih-alih menebak dari bentuk objek SDK. */
export function getOneSignalStatus(): OneSignalStatus {
  return initStatus;
}

function setStatus(status: OneSignalStatus) {
  initStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

/**
 * Menginisialisasi OneSignal paling banyak sekali per pemuatan halaman.
 * Mengembalikan null bila inisialisasi memang sengaja dilewati.
 */
function ensureInit(): Promise<void> | null {
  if (initPromise) return initPromise;

  // Service Worker OneSignal butuh origin HTTPS yang terdaftar di dasbor
  // mereka; di localhost pendaftarannya selalu gagal dan hanya menghasilkan
  // galat konsol. Konsekuensinya, push tidak bisa diuji dari mesin lokal —
  // gunakan build pratayang/produksi untuk mengujinya.
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    console.info("OneSignal dilewati di localhost (butuh origin HTTPS terdaftar).");
    return null;
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn("NEXT_PUBLIC_ONESIGNAL_APP_ID belum dipasang di .env.local");
    return null;
  }

  // Pemeriksaan origin SEBELUM init, bukan sesudah gagal. SDK v16 menolak init
  // saat origin tidak cocok dengan Site URL di dasbor, dan init yang ditolak
  // meninggalkan SDK dalam keadaan yang membuat setiap pemanggilan berikutnya
  // menggantung selamanya — sumber sakelar yang berputar. Nilai pembandingnya
  // SITE.url, yang di produksi harus diisi NEXT_PUBLIC_SITE_URL dengan nilai
  // yang sama persis dengan Site URL di dasbor OneSignal.
  if (window.location.origin !== SITE.url) {
    console.warn(
      `OneSignal dilewati: origin peramban "${window.location.origin}" tidak sama ` +
        `dengan SITE.url "${SITE.url}". Isi NEXT_PUBLIC_SITE_URL dengan origin ` +
        "yang sungguh-sungguh dimuat, dan pastikan Site URL di dasbor OneSignal " +
        "bernilai sama."
    );
    setStatus("origin");
    return null;
  }

  initPromise = OneSignal.init({
    appId,
    // Menunjuk public/OneSignalSDKWorker.js — sekarang berisi SDK service
    // worker v16 yang sesungguhnya, bukan satu baris importScripts ke CDN.
    // Versi importScripts itulah sumber dua galat di konsol: "No active
    // registration available on the ServiceWorkerRegistration" dan "Event
    // handler of 'message' event must be added on the initial evaluation of
    // worker script". Spesifikasi menuntut seluruh pendengar terdaftar pada
    // evaluasi awal skrip; importScripts yang mengunduh lintas-origin
    // menyelesaikannya terlambat, jadi pendaftarannya tidak pernah aktif.
    serviceWorkerPath: "OneSignalSDKWorker.js",
    serviceWorkerParam: { scope: "/" },
    // Notifikasi "Thanks for subscribing!" dimatikan. Itu satu-satunya yang
    // memanggil showNotification() segera setelah optIn — sebelum pendaftaran
    // SW benar-benar aktif — dan ikonnya diambil dari /default-icon yang tidak
    // ada di situs ini (404 di log). Aplikasi ini mengirim push dari server
    // lewat lib/onesignal.ts, jadi sambutan otomatis tidak dibutuhkan.
    welcomeNotification: { disable: true, message: "" },
  })
    .then(() => {
      setStatus(null);
    })
    .catch((err) => {
      // Skrip SDK bisa gagal dimuat karena pemblokir iklan — cdn.onesignal.com
      // ada di hampir semua daftar blokir. Kegagalannya dicatat sekali di sini
      // lalu diingat lewat initStatus; tanpa penanda itu, setiap perubahan
      // status auth mencoba OneSignal.login() pada SDK yang tidak pernah ada
      // dan melempar galat yang sama berulang kali.
      //
      // Promise-nya tetap tidak dibiarkan reject: yang menunggunya cuma
      // penyelaras External ID, dan gagalnya push tidak boleh menghentikan
      // aplikasi.
      console.error("Gagal inisialisasi OneSignal:", err);
      setStatus("load");
      initPromise = null;
    });

  return initPromise;
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const ready = ensureInit();
    if (!ready) return;

    let active = true;

    // undefined berarti "belum pernah diselaraskan" — dibedakan dari null yang
    // berarti "sudah diselaraskan, dan saat itu tidak ada yang login". Pembedaan
    // itu membuat SIGNED_OUT yang datang sebagai kabar pertama pada sebuah
    // pemuatan halaman tetap dijalankan, alih-alih dianggap "sudah null".
    let lastSynced: string | null | undefined = undefined;

    const sync = async (userId: string | null) => {
      await ready;

      // Init gagal (umumnya diblokir pemblokir iklan) — SDK-nya tidak pernah
      // siap, jadi login()/logout() hanya akan melempar galat yang sama.
      if (initStatus !== null || !active || lastSynced === userId) return;

      try {
        if (userId) {
          await OneSignal.login(userId);
        } else {
          await OneSignal.logout();
        }
        lastSynced = userId;
      } catch (err) {
        console.error("Gagal menyelaraskan External ID OneSignal:", err);
      }
    };

    // getUser() memverifikasi token ke server Auth, sedangkan getSession()
    // hanya membaca cookie. Di sini yang dibutuhkan memang identitas yang sah.
    //
    // Nilai `error` WAJIB dibaca. Pada supabase-js v2 kegagalan jaringan TIDAK
    // menolak promise-nya, melainkan kembali sebagai
    // { data: { user: null }, error } — bentuk yang sama persis dengan "tidak
    // ada yang login". Kode lama membuang `error` dan hanya membaca data.user,
    // jadi satu gangguan jaringan sesaat terbaca sebagai logout dan MELEPAS
    // External ID perangkat ini secara permanen: langganannya tetap hidup di
    // OneSignal, tetapi tidak lagi bisa dialamatkan ke akun mana pun. Itulah
    // yang membuat 4 dari 5 perangkat kehilangan external_user_id-nya.
    //
    // Karena itu jalur ini hanya boleh MENAUTKAN. Pelepasan tautan diserahkan
    // sepenuhnya ke onAuthStateChange di bawah, satu-satunya yang bisa
    // membedakan "keluar" dari "tidak bisa bertanya".
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error || !data.user) return;
        void sync(data.user.id);
      })
      .catch(() => {
        // Identitas tidak diketahui — bukan berarti tidak ada yang login.
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_OUT satu-satunya kabar yang benar-benar berarti "perangkat ini
      // bukan milik siapa pun lagi". Supabase memancarkannya pada logout yang
      // disengaja maupun saat refresh token ditolak, jadi sesi yang kedaluwarsa
      // tetap tertangani.
      if (event === "SIGNED_OUT") {
        void sync(null);
        return;
      }

      // Kabar lain dengan session kosong TIDAK melepas tautan. INITIAL_SESSION
      // bernilai null terjadi pada setiap pemuatan halaman publik oleh
      // pengunjung anonim — provider ini ada di root layout — dan dulu ikut
      // memicu logout() pada perangkat yang sebenarnya baik-baik saja.
      const userId = session?.user?.id;
      if (userId) void sync(userId);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
