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

// Disimpan di tingkat modul, bukan useRef, agar tetap satu kali walau React
// Strict Mode menjalankan efek dua kali saat pengembangan.
let initPromise: Promise<void> | null = null;

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

  initPromise = OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: true,
    serviceWorkerPath: "OneSignalSDKWorker.js",
    serviceWorkerParam: { scope: "/" },
  }).catch((err) => {
    // Promise-nya sengaja tidak dibiarkan reject: penyelaras External ID di
    // bawah menunggunya, dan kegagalan push tidak boleh menghentikan aplikasi.
    console.error("Gagal inisialisasi OneSignal:", err);
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
    // berarti "sudah diselaraskan, dan saat itu tidak ada yang login". Berkat
    // pembedaan ini, pemuatan halaman pertama sesudah logout tetap memanggil
    // logout() untuk melepas External ID yang masih tersimpan SDK.
    let lastSynced: string | null | undefined = undefined;

    const sync = async (userId: string | null) => {
      await ready;
      if (!active || lastSynced === userId) return;

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
    void supabase.auth
      .getUser()
      .then(({ data }) => sync(data.user?.id ?? null))
      .catch(() => sync(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
