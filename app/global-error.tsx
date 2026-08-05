// app/global-error.tsx
//
// Jaring pengaman terakhir: menangkap galat yang terjadi di `app/layout.tsx`
// sendiri — yang TIDAK tertangkap oleh `app/error.tsx` (error.tsx tidak
// membungkus layout di segmen yang sama).
//
// Karena file ini MENGGANTIKAN root layout saat aktif, ia wajib menyediakan
// tag <html> dan <body>-nya sendiri, plus impor CSS global. Provider tema tidak
// dipakai di sini: kalau penyebab galatnya justru ada di provider, memakainya
// lagi hanya akan menggagalkan halaman galat ini juga. Warnanya karena itu
// ditulis eksplisit, tidak bergantung pada variabel tema.
"use client";

import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="id">
      <body>
        {/* metadata/generateMetadata tidak didukung di global-error, jadi judul
            halaman disetel lewat komponen <title> milik React. */}
        <title>Terjadi Kesalahan - Inland Property</title>

        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            background: "#fafafa",
            color: "#18181b",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Aplikasi mengalami gangguan
          </h1>
          <p
            style={{
              maxWidth: "28rem",
              fontSize: "0.875rem",
              color: "#52525b",
              margin: 0,
            }}
          >
            Maaf, terjadi kesalahan yang tidak terduga. Silakan muat ulang
            halaman ini.
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#71717a",
                margin: 0,
              }}
            >
              Kode rujukan: {error.digest}
            </p>
          )}

          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: "0.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "#059669",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
