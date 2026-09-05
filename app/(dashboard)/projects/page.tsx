// app/(dashboard)/projects/page.tsx
//
// Papan proyek konstruksi.
//
// Versi sebelumnya ditulis untuk tabel yang bentuknya tidak pernah ada: kolom
// `name`, `progress`, `budget`, dan tabel `project_materials` semuanya fiktif,
// sehingga daftar selalu kosong dan tombol stok mengubah angka di layar tanpa
// pernah menyimpannya. Seluruh isi berkas ini disusun ulang di atas
// projectService dan tabel yang sungguh ada (006_projects_construction.sql).
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  HardHat,
  Wallet,
  TriangleAlert,
  Activity,
  X,
  Inbox,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import ProjectCard from "@/components/projects/ProjectCard";
import { useProjects } from "@/hooks/use-projects";
import {
  PROJECT_STATUS_CONFIG,
  formatCompactRupiah,
  type ProjectFilter,
  type ProjectStatus,
} from "@/types/project.types";

/** Urutan chip status. "all" selalu pertama. */
const STATUS_TABS: Array<{ value: ProjectStatus | "all"; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: PROJECT_STATUS_CONFIG.active.label },
  { value: "planning", label: PROJECT_STATUS_CONFIG.planning.label },
  { value: "paused", label: PROJECT_STATUS_CONFIG.paused.label },
  { value: "completed", label: PROJECT_STATUS_CONFIG.completed.label },
  { value: "cancelled", label: PROJECT_STATUS_CONFIG.cancelled.label },
];

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <Card className="rounded-2xl border-border shadow-xs">
      <CardContent className="flex items-start gap-3 p-3.5 sm:p-4">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tone === "danger"
              ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
              : tone === "success"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-lg font-black leading-none tabular-nums text-foreground sm:text-xl">
            {value}
          </p>
          {hint && (
            <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectsPage() {
  const {
    data,
    summary,
    loading,
    error,
    totalItems,
    totalPages,
    filters,
    page,
    searchInput,
    setSearchInput,
    hasActiveFilters,
    updateFilters,
    goToPage,
    resetFilters,
    refetch,
  } = useProjects();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ============================================================
          1. KEPALA HALAMAN
          ============================================================ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <HardHat className="h-5 w-5 text-emerald-600" />
            Proyek Konstruksi
          </h1>
          <p className="text-xs text-muted-foreground">
            Pantau progres fisik, serapan anggaran, dan tenggat seluruh lokasi
            pembangunan.
          </p>
        </div>

        {/* Di ponsel baris ini melebar penuh sehingga tombol utama tetap besar
            dan mudah disentuh.
            Sengaja BUKAN bilah melayang di dasar layar: BottomNav sudah
            menempati posisi itu dengan z-50, dan widget obrolan AI memakai
            sudut kanan bawah — tombol melayang di sini akan tertimbun keduanya.
            (Tabrakan yang sama sudah ada di properties/[id]/page.tsx.) */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="h-10 w-10 shrink-0 rounded-xl sm:h-9 sm:w-9"
            aria-label="Muat ulang data proyek"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>

          {/* `render` + `nativeButton={false}`, bukan `asChild`: Button di
              repositori ini dibangun di atas @base-ui/react yang memakai pola
              render prop. Hasilnya <a> sungguhan, jadi bisa dibuka di tab baru
              dan terbaca sebagai tautan oleh pembaca layar. */}
          <Button
            render={<Link href="/projects/create" />}
            nativeButton={false}
            className="h-10 flex-1 gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 sm:h-9 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Tambah Proyek
          </Button>
        </div>
      </div>

      {/* ============================================================
          2. STRIP KPI
          ============================================================
          Angkanya berasal dari getSummary() yang menghitung SELURUH tabel.
          Versi lama menjumlahkan array halaman yang sedang tampil, jadi "total
          anggaran" sebenarnya hanya total 12 proyek pertama. */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <KpiCard
          icon={HardHat}
          label="Total Proyek"
          value={String(summary.total)}
          hint={`${summary.active} sedang berjalan`}
        />
        <KpiCard
          icon={Activity}
          label="Berjalan"
          value={String(summary.active)}
          hint="Status aktif"
          tone="success"
        />
        <KpiCard
          icon={Wallet}
          label="Nilai Kontrak"
          value={formatCompactRupiah(summary.totalBudget)}
          hint={`Terpakai ${formatCompactRupiah(summary.totalSpent)}`}
        />
        <KpiCard
          icon={TriangleAlert}
          label="Lewat Tenggat"
          value={String(summary.overdue)}
          hint={summary.overdue > 0 ? "Perlu ditindak" : "Semua sesuai jadwal"}
          tone={summary.overdue > 0 ? "danger" : "default"}
        />
      </div>

      {/* ============================================================
          3. PENCARIAN, URUTAN, CHIP STATUS
          ============================================================ */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {/* Tanpa onKeyDown Enter: pencarian berjalan sendiri lewat debounce
                350 ms di useProjects. Versi lama mengirim satu kueri per
                ketukan tombol. */}
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama proyek, lokasi, atau kode…"
              className="h-9 rounded-xl pl-9 pr-9 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Bersihkan pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select
            value={`${filters.sort_by}:${filters.sort_order}`}
            // Select di repositori ini memancarkan `string | null` — null saat
            // pilihan dibatalkan. Diabaikan saja: urutan yang sedang berlaku
            // tetap dipakai, bukan diganti nilai kosong.
            onValueChange={(v) => {
              if (!v) return;
              const [sortBy, sortOrder] = v.split(":");
              updateFilters({
                sort_by: sortBy as ProjectFilter["sort_by"],
                sort_order: sortOrder as "asc" | "desc",
              });
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at:desc" className="text-xs">
                Terbaru dibuat
              </SelectItem>
              <SelectItem value="end_date:asc" className="text-xs">
                Tenggat terdekat
              </SelectItem>
              <SelectItem value="progress:asc" className="text-xs">
                Progres terendah
              </SelectItem>
              <SelectItem value="budget:desc" className="text-xs">
                Anggaran terbesar
              </SelectItem>
              <SelectItem value="title:asc" className="text-xs">
                Nama A–Z
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chip status yang bisa digeser mendatar. Pola yang sama dipakai
            CrmKanbanBoard: di layar 390 px, enam tab berjejer akan saling
            menghimpit sampai labelnya tidak terbaca. */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_TABS.map((tab) => {
            const aktif = (filters.status ?? "all") === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateFilters({ status: tab.value })}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                  aktif
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          4. RINGKASAN HASIL
          ============================================================ */}
      {!loading && !error && data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="text-xs text-muted-foreground">
            Menampilkan{" "}
            <span className="font-bold text-foreground">{data.length}</span> dari{" "}
            <span className="font-bold text-foreground">{totalItems}</span> proyek
          </p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Hapus filter
            </Button>
          )}
        </div>
      )}

      {/* ============================================================
          5. DAFTAR
          ============================================================ */}
      {error ? (
        // Galat DITAMPILKAN, tidak ditelan diam-diam. Kebiasaan menelan galat
        // itulah yang membuat versi lama tampak berfungsi padahal tidak.
        <Card className="rounded-2xl border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TriangleAlert className="h-8 w-8 text-rose-600" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                Gagal memuat proyek
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 rounded-lg text-xs"
            >
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="h-9 w-9 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-bold">
                {hasActiveFilters
                  ? "Tidak ada proyek yang cocok"
                  : "Belum ada proyek konstruksi"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters
                  ? "Coba ubah kata kunci atau pilih status lain."
                  : "Mulai dengan mendaftarkan lokasi pembangunan pertama Anda."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-8 rounded-lg text-xs"
              >
                Hapus filter
              </Button>
            ) : (
              <Button
                render={<Link href="/projects/create" />}
                nativeButton={false}
                size="sm"
                className="h-8 gap-1.5 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Proyek
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* ============================================================
          6. HALAMAN
          ============================================================ */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="h-8 rounded-lg text-xs"
          >
            Sebelumnya
          </Button>
          <span className="px-2 text-xs font-semibold tabular-nums text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="h-8 rounded-lg text-xs"
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
