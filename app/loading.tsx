// app/loading.tsx
//
// Status loading untuk halaman publik. Ditampilkan saat navigasi awal atau
// saat segmen halaman publik sedang diambil (streaming).
//
// Loading.tsx adalah Server Component — tidak perlu directive "use client".

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      {/* Spinner sederhana yang cocok dengan palet tema */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="text-sm font-medium text-muted-foreground">
          Memuat...
        </span>
      </div>
    </div>
  );
}
