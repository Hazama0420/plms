// app/not-found.tsx
//
// Halaman 404 kustom. Menggantikan layar bawaan Next.js yang polos
// ("This page could not be found") dengan tampilan berbahasa Indonesia yang
// menawarkan jalan keluar.
//
// Selain URL yang memang tidak ada, berkas ini juga yang tampil ketika sebuah
// halaman memanggil notFound().

import Link from "next/link";
import { MapPinOff, Home, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPinOff className="h-8 w-8 text-muted-foreground" />
      </div>

      <p className="mt-6 text-5xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
        404
      </p>
      <h1 className="mt-3 text-2xl font-bold text-foreground">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Alamat yang Anda tuju tidak tersedia. Mungkin tautannya sudah berubah
        atau properti tersebut telah dihapus.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="cursor-pointer" render={<Link href="/" />}>
          <Home className="mr-2 h-4 w-4" />
          Kembali ke Beranda
        </Button>
        <Button
          variant="outline"
          className="cursor-pointer"
          render={<Link href="/properties" />}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Lihat Daftar Properti
        </Button>
      </div>
    </div>
  );
}
