// app/(dashboard)/loading.tsx
//
// Kerangka (skeleton) untuk halaman internal. Ditempatkan di dalam route group
// sehingga otomatis membungkus semua halaman di bawahnya — /dashboard, /crm,
// /reports, /invoices, dan seterusnya — dalam satu <Suspense> boundary.
//
// Bentuknya sengaja meniru tata letak umum halaman internal (judul, kartu
// statistik, lalu tabel) supaya pergantian ke konten asli tidak terasa
// meloncat.

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Judul halaman */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Deretan kartu statistik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Blok konten utama / tabel */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
