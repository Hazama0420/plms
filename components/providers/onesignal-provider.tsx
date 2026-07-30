// components/providers/onesignal-provider.tsx
"use client";

import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    // 🛑 Jangan jalankan OneSignal di localhost untuk menghindari error Service Worker
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.log("OneSignal dilewati di mode development (localhost).");
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn("OneSignal App ID belum dipasang di .env.local");
      return;
    }

    // Inisialisasi OneSignal Web Push
    OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
    })
      .then(() => {
        console.log("✅ OneSignal Web Push Berhasil Diinisialisasi");
      })
      .catch((err) => {
        console.error("❌ Gagal Inisialisasi OneSignal:", err);
      });
  }, []);

  return <>{children}</>;
}