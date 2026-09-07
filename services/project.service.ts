// services/project.service.ts
//
// Satu-satunya pintu ke tabel `projects` dan `project_milestones`.
//
// Sebelumnya kedua halaman proyek memanggil `supabase.from(...)` langsung, dan
// masing-masing menyusun kolomnya sendiri — itulah kenapa keduanya sama-sama
// memakai kolom `name` yang tidak pernah ada tanpa ada yang menyadarinya.
//
// ATURAN YANG DITEGAKKAN BERKAS INI: setiap galat DILEMPAR, tidak pernah
// ditelan. Versi lama menutup kegagalan tulis dengan `catch {}` kosong sehingga
// stok material berubah di layar tanpa pernah tersimpan, dan halaman create
// menampilkan "berhasil" untuk insert yang gagal. Fungsi di bawah tidak pernah
// mengembalikan nilai palsu saat gagal.
import { supabase } from "@/lib/supabase/client";
import type {
  Project,
  ProjectFilter,
  ProjectInput,
  ProjectMilestone,
  ProjectStatus,
  MilestoneStatus,
} from "@/types/project.types";

export type { ProjectFilter };

/**
 * Kolom yang diambil untuk kartu di halaman daftar.
 *
 * Disebut satu per satu, bukan `*`: baris proyek akan tumbuh dan halaman daftar
 * tidak perlu ikut membesar. `users!manager_id` memakai nama kolom sebagai
 * petunjuk relasi — pola yang sama dengan `users!assigned_to` di
 * property.service.ts dan crm.service.ts.
 */
const LIST_COLUMNS = `
  id, code, title, description, location, status, progress,
  start_date, end_date, budget, spent, manager_id, team_count,
  created_by, created_at, updated_at,
  manager:users!manager_id(id, full_name, avatar_url, email)
`;

/**
 * PostgREST mengembalikan relasi satu-ke-satu kadang sebagai objek, kadang
 * sebagai larik berisi satu elemen. Pola penjagaan yang sama dipakai di
 * app/(dashboard)/properties/[id]/layout.tsx.
 */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeProject(row: Record<string, unknown>): Project {
  return {
    ...(row as unknown as Project),
    manager: firstOf(row.manager as never) ?? null,
  };
}

/**
 * Membuang karakter yang punya arti khusus di operator `ilike` PostgREST.
 *
 * Tanpa ini, mengetik "%" di kotak pencarian cocok dengan seluruh baris, dan
 * koma memecah nilainya menjadi dua argumen `or(...)` yang membuat kueri
 * ditolak.
 */
function escapePattern(value: string): string {
  return value.replace(/[%_,()]/g, " ").trim();
}

const projectService = {
  // ============================================================
  // DAFTAR PROYEK
  // ============================================================
  //
  // Penyaringan dan pengurutan dikerjakan basis data, bukan peramban. Versi
  // lama mengambil sekumpulan baris lalu menyaringnya di sisi klien, sehingga
  // hasil pencarian hanya berasal dari baris yang kebetulan sudah terambil.
  async getList(filters: ProjectFilter = {}) {
    const {
      search = "",
      status = "all",
      page = 1,
      limit = 12,
      sort_by = "created_at",
      sort_order = "desc",
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from("projects")
      .select(LIST_COLUMNS, { count: "exact" });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const keyword = escapePattern(search);
    if (keyword) {
      // Kode proyek ikut dicari: di lapangan orang menyebut "PRJ-2026-004",
      // bukan judul lengkapnya.
      query = query.or(
        `title.ilike.%${keyword}%,location.ilike.%${keyword}%,code.ilike.%${keyword}%`
      );
    }

    // nullsFirst: false — proyek tanpa tenggat tidak boleh menguasai baris atas
    // saat mengurutkan berdasarkan tenggat.
    query = query
      .order(sort_by, { ascending: sort_order === "asc", nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      data: (data ?? []).map((row) =>
        normalizeProject(row as unknown as Record<string, unknown>)
      ),
      count: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    };
  },

  // ============================================================
  // RINGKASAN UNTUK STRIP KPI
  // ============================================================
  //
  // Dihitung dari seluruh tabel, BUKAN dari halaman yang sedang tampil. Versi
  // lama menjumlahkan array di memori sehingga "Total Anggaran" sebenarnya cuma
  // total 12 proyek pertama — angka yang salah tapi terlihat meyakinkan.
  //
  // Hanya kolom yang benar-benar dipakai yang diambil, jadi biayanya tetap
  // ringan walau seluruh baris ikut terbaca.
  async getSummary() {
    const { data, error } = await supabase
      .from("projects")
      .select("status, budget, spent, end_date, progress");

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      status: ProjectStatus;
      budget: number | null;
      spent: number | null;
      end_date: string | null;
      progress: number;
    }>;

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      totalBudget: rows.reduce((sum, r) => sum + Number(r.budget ?? 0), 0),
      totalSpent: rows.reduce((sum, r) => sum + Number(r.spent ?? 0), 0),
      // Terlambat = tenggat sudah lewat sementara pekerjaannya masih terbuka.
      // Proyek selesai dan batal tidak ikut, sebesar apa pun keterlambatannya.
      overdue: rows.filter(
        (r) =>
          r.end_date !== null &&
          new Date(r.end_date) < hariIni &&
          r.status !== "completed" &&
          r.status !== "cancelled"
      ).length,
    };
  },

  // ============================================================
  // SATU PROYEK
  // ============================================================
  async getById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from("projects")
      .select(LIST_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const project = normalizeProject(data as unknown as Record<string, unknown>);
    project.milestones = await this.listMilestones(id);
    return project;
  },

  // ============================================================
  // TULIS
  // ============================================================

  /**
   * Membuat proyek beserta tahapan awalnya.
   *
   * Tahapan disisipkan SESUDAH proyeknya jadi karena butuh project_id. Bila
   * penyisipan tahapan gagal, proyek yang terlanjur dibuat DIHAPUS lagi supaya
   * tidak meninggalkan proyek separuh jadi — Supabase tidak memberi transaksi
   * lintas permintaan dari sisi klien, jadi ini penggantinya. Versi lama justru
   * membiarkannya dan hanya menulis console.error.
   */
  async create(
    input: ProjectInput,
    milestones: string[] = []
  ): Promise<Project> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw new Error(authError.message);
    if (!user) throw new Error("Sesi berakhir. Silakan masuk kembali.");

    const { data, error } = await supabase
      .from("projects")
      .insert({ ...input, created_by: user.id })
      .select(LIST_COLUMNS)
      .single();

    if (error) throw new Error(error.message);

    const project = normalizeProject(data as unknown as Record<string, unknown>);

    const judulTahapan = milestones.map((t) => t.trim()).filter(Boolean);
    if (judulTahapan.length > 0) {
      const { error: milestoneError } = await supabase
        .from("project_milestones")
        .insert(
          judulTahapan.map((title, index) => ({
            project_id: project.id,
            title,
            sort_order: index,
          }))
        );

      if (milestoneError) {
        await supabase.from("projects").delete().eq("id", project.id);
        throw new Error(
          `Tahapan pekerjaan gagal disimpan (${milestoneError.message}). Proyek dibatalkan.`
        );
      }
    }

    return project;
  },

  async update(id: string, input: Partial<ProjectInput>): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(input)
      .eq("id", id)
      .select(LIST_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    return normalizeProject(data as unknown as Record<string, unknown>);
  },

  async updateStatus(id: string, status: ProjectStatus) {
    return this.update(id, { status });
  },

  /**
   * Progres dibulatkan dan dijepit 0-100 di sini juga, bukan hanya di
   * constraint basis data. Ditolak PostgREST dengan pesan "violates check
   * constraint" bukan umpan balik yang bisa dipahami pengguna.
   */
  async updateProgress(id: string, progress: number) {
    const nilai = Math.max(0, Math.min(100, Math.round(progress)));
    return this.update(id, { progress: nilai });
  },

  async remove(id: string): Promise<void> {
    // Tahapan ikut terhapus lewat `on delete cascade`, tidak perlu dihapus
    // manual di sini.
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // TAHAPAN PEKERJAAN
  // ============================================================

  async listMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const { data, error } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectMilestone[];
  },

  async addMilestone(
    projectId: string,
    title: string,
    sortOrder: number,
    dueDate: string | null = null
  ): Promise<ProjectMilestone> {
    const { data, error } = await supabase
      .from("project_milestones")
      .insert({
        project_id: projectId,
        title: title.trim(),
        sort_order: sortOrder,
        due_date: dueDate,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as ProjectMilestone;
  },

  /**
   * `completed_at` sengaja TIDAK dikirim dari sini — trigger
   * touch_milestone_completed() yang mengisinya. Waktu selesai harus berasal
   * dari jam server; jam peramban di lapangan sering meleset dan bisa diubah
   * siapa saja.
   */
  async setMilestoneStatus(
    id: string,
    status: MilestoneStatus
  ): Promise<ProjectMilestone> {
    const { data, error } = await supabase
      .from("project_milestones")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as ProjectMilestone;
  },

  async removeMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from("project_milestones")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // PEMILIH MANAJER PROYEK
  // ============================================================
  //
  // `viewer` dikecualikan: mereka klien, bukan staf, dan tidak boleh muncul
  // sebagai calon penanggung jawab proyek. Batasan yang sama ada di
  // has_internal_role() pada 006_projects_construction.sql.
  async getAssignableManagers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, email")
      .in("role", ["super_admin", "admin", "agent", "marketing"])
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      email: string | null;
    }>;
  },
};

// ============================================================
// HANYA SATU EKSPOR : EKSPOR DEFAULT
// ============================================================
export default projectService;
