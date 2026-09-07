// types/project.types.ts
//
// Bentuk data proyek konstruksi, satu sumber untuk seluruh aplikasi.
//
// Sebelumnya interface `Project` dan peta warna statusnya ditulis ulang di dalam
// app/(dashboard)/projects/page.tsx, dan halaman create punya bentuk formulirnya
// sendiri yang berbeda lagi. Keduanya menulis ke tabel yang sama, sehingga satu
// kolom baru berarti dua suntingan yang mudah terlewat — dan itulah yang
// terjadi: kedua halaman memakai kolom `name` yang tidak pernah ada di basis
// data.

/**
 * Status proyek. Sengaja union murni, bukan `| string` seperti versi lama.
 *
 * Dengan `| string`, typo semacam "actve" lolos pemeriksaan tipe dan baru
 * terlihat sebagai badge kosong di layar. Daftar ini juga persis sama dengan
 * check constraint `projects_status_check` di 006_projects_construction.sql;
 * bila salah satu berubah, yang lain harus ikut.
 */
export type ProjectStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type MilestoneStatus = "pending" | "in_progress" | "done" | "blocked";

/**
 * Manajer proyek sebagaimana di-embed PostgREST lewat
 * `manager:users!projects_manager_id_fkey(id, full_name, avatar_url)`.
 *
 * Semua field selain `id` opsional: baris `users` bisa saja belum mengisi nama
 * atau avatar, dan `manager_id` sendiri boleh null (proyek belum berpenanggung
 * jawab).
 */
export interface ProjectManager {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

export interface Project {
  id: string;
  /** "PRJ-2026-001". Diisi trigger basis data, tidak pernah dari formulir. */
  code: string | null;
  /**
   * Nama proyek. Kolomnya `title`, seragam dengan `properties.title` — bukan
   * `name` seperti yang dipakai kode lama.
   */
  title: string;
  description: string | null;
  location: string | null;
  status: ProjectStatus;
  /** Progres FISIK 0-100, bukan progres anggaran. */
  progress: number;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  spent: number;
  manager_id: string | null;
  team_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Hanya terisi bila kueri memintanya lewat embed. */
  manager?: ProjectManager | null;
  /** Ringkasan tahapan, diisi getById(). */
  milestones?: ProjectMilestone[];
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  status: MilestoneStatus;
  due_date: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload formulir. `id`, `code`, dan kolom waktu diurus basis data. */
export interface ProjectInput {
  title: string;
  description?: string | null;
  location?: string | null;
  status: ProjectStatus;
  progress: number;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  spent?: number;
  manager_id?: string | null;
  team_count?: number;
}

export interface ProjectFilter {
  page?: number;
  limit?: number;
  search?: string;
  /** "all" berarti tanpa penyaringan status. */
  status?: ProjectStatus | "all";
  sort_by?: "created_at" | "end_date" | "progress" | "budget" | "title";
  sort_order?: "asc" | "desc";
}

/**
 * Label dan warna status, satu tempat.
 *
 * `Record<ProjectStatus, ...>` — bukan `Record<string, ...>` seperti versi lama.
 * Bedanya nyata: menambah status baru ke union tanpa menambah warnanya di sini
 * akan gagal saat build, bukan tampil sebagai badge putih di produksi.
 */
export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badge: string; dot: string; bar: string }
> = {
  planning: {
    label: "Perencanaan",
    badge:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
  },
  active: {
    label: "Berjalan",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  paused: {
    label: "Ditunda",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  completed: {
    label: "Selesai",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  cancelled: {
    label: "Dibatalkan",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};

export const MILESTONE_STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; badge: string }
> = {
  pending: {
    label: "Belum mulai",
    badge: "bg-muted text-muted-foreground border-border",
  },
  in_progress: {
    label: "Dikerjakan",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  done: {
    label: "Selesai",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  },
  blocked: {
    label: "Terhambat",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  },
};

/**
 * Tahapan baku proyek konstruksi perumahan, dipakai tombol preset di halaman
 * create. Urutannya adalah urutan pekerjaan di lapangan, bukan abjad.
 */
export const DEFAULT_MILESTONE_PRESET: string[] = [
  "Persiapan Lahan",
  "Pondasi",
  "Struktur",
  "Atap",
  "Finishing",
  "Serah Terima",
];

/**
 * Kesehatan jadwal: membandingkan progres fisik dengan waktu yang sudah
 * terpakai.
 *
 * Inilah nilai yang tidak bisa dibaca dari satu angka progres saja. Proyek 40%
 * terdengar wajar sampai ketahuan 80% waktunya sudah habis. Perhitungan ini
 * murni turunan — tidak ada kolom basis data yang menyimpannya, jadi tidak ada
 * yang bisa basi.
 */
export type ScheduleHealth = "on_track" | "at_risk" | "behind" | "unknown";

export function deriveScheduleHealth(project: {
  progress: number;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
}): ScheduleHealth {
  if (project.status === "completed" || project.status === "cancelled") {
    return "on_track";
  }
  if (!project.start_date || !project.end_date) return "unknown";

  const start = new Date(project.start_date).getTime();
  const end = new Date(project.end_date).getTime();
  const now = Date.now();

  // Proyek yang belum dimulai belum bisa dinilai terlambat.
  if (now <= start) return "on_track";
  if (end <= start) return "unknown";

  const elapsedPct = Math.min(100, ((now - start) / (end - start)) * 100);
  const gap = elapsedPct - project.progress;

  // Ambang 15 poin, bukan 0: pekerjaan konstruksi tidak pernah maju rata setiap
  // hari, dan menandai merah setiap proyek yang meleset seminggu hanya membuat
  // peringatannya diabaikan.
  if (gap > 25) return "behind";
  if (gap > 15) return "at_risk";
  return "on_track";
}

/** Sisa hari sampai tenggat. Negatif berarti sudah lewat. */
export function daysUntilDeadline(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;

  // Dibandingkan per hari kalender, bukan per milidetik: tenggat "hari ini"
  // harus terbaca 0, bukan -1 karena jamnya sudah lewat tengah hari.
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  return Math.round(
    (startOfDay(end) - startOfDay(new Date())) / (1000 * 60 * 60 * 24)
  );
}

/** Serapan anggaran dalam persen. null bila pagunya belum ditetapkan. */
export function budgetUsagePct(
  budget: number | null,
  spent: number
): number | null {
  if (!budget || budget <= 0) return null;
  return Math.min(999, Math.round((spent / budget) * 100));
}

/**
 * Rupiah ringkas: "4,5 M", "750 jt", "1.200".
 *
 * Angka miliaran merusak kartu di layar sempit bila ditulis utuh. Pendekatan
 * ini sama dengan formatCompactRupiah di components/crm/CrmKanbanBoard.tsx.
 */
export function formatCompactRupiah(value: number | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "Rp 0";

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${Math.round(abs / 1_000_000)} jt`;
  }
  return `${sign}Rp ${new Intl.NumberFormat("id-ID").format(abs)}`;
}

/** Rupiah utuh untuk halaman detail, tempat angka pastinya memang dibutuhkan. */
export function formatRupiah(value: number | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
}

/** "12 Mar 2026". Tanda pisah untuk tanggal kosong. */
export function formatTanggal(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
