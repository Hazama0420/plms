// app/(dashboard)/error.tsx
//
// Batas galat khusus halaman internal. Terpisah dari app/error.tsx supaya
// sidebar, header, dan navigasi bawah tetap utuh saat satu halaman gagal —
// error.tsx hanya menggantikan isi segmennya, bukan layout di atasnya.
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error boundary]", error);
  }, [error]);

  return (
    <Card className="mx-auto mt-8 max-w-lg border-red-200 dark:border-red-900">
      <CardContent className="flex flex-col items-center py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>

        <h2 className="mt-5 text-xl font-bold text-foreground">
          Gagal memuat halaman
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Data tidak dapat diambil saat ini. Periksa koneksi Anda lalu coba
          lagi.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Kode rujukan: {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => unstable_retry()} className="cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            render={<Link href="/dashboard" />}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Ke Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
