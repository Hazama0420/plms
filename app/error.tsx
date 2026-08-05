// app/error.tsx
//
// Batas galat (error boundary) untuk seluruh halaman publik.
// Wajib Client Component — ini syarat React Error Boundary.
//
// Catatan Next.js 16.2: prop pemulihan bernama `unstable_retry`, bukan `reset`.
// `unstable_retry()` mengambil ulang data DAN merender ulang; `reset()` hanya
// merender ulang tanpa mengambil data baru, sehingga jarang menyelesaikan
// masalah yang sebenarnya.
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Di produksi, pesan asli dari Server Component sengaja disembunyikan
    // Next.js agar detail sensitif tidak bocor ke klien. Yang tersisa adalah
    // `digest` — kode itulah yang dipakai untuk mencocokkan dengan log server.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-foreground">
        Terjadi kesalahan
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Maaf, halaman ini gagal dimuat. Silakan coba lagi — bila masalahnya
        berlanjut, hubungi tim teknis kami.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Kode rujukan: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => unstable_retry()} className="cursor-pointer">
          <RotateCcw className="mr-2 h-4 w-4" />
          Coba Lagi
        </Button>
        <Button
          variant="outline"
          className="cursor-pointer"
          render={<Link href="/" />}
        >
          <Home className="mr-2 h-4 w-4" />
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
