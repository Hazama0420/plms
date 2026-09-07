// app/(dashboard)/projects/create/page.tsx
//
// Formulir pembuatan proyek konstruksi.
//
// Versi sebelumnya mengirim kolom `name`, `project_manager`, dan `team_count`
// ke tabel yang tidak punya satu pun dari ketiganya — setiap simpan selalu
// gagal. Lebih buruk lagi, kegagalan penyisipan material hanya dicatat ke
// console lalu tetap diakhiri toast "berhasil dibuat!", sehingga pengguna
// mengira datanya tersimpan. Kedua hal itu dicabut di sini: penyimpanan lewat
// projectService yang selalu melempar galat, dan bagian Material diganti
// Tahapan Pekerjaan yang benar-benar punya tabelnya.
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  HardHat,
  CalendarDays,
  MapPin,
  Wallet,
  UsersRound,
  ListChecks,
  GripVertical,
  Sparkles,
  Save,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import projectService from "@/services/project.service";
import {
  DEFAULT_MILESTONE_PRESET,
  PROJECT_STATUS_CONFIG,
  formatCompactRupiah,
  type ProjectStatus,
} from "@/types/project.types";

/** Opsi status yang boleh dipilih saat proyek baru dibuat.
 *  "cancelled" sengaja tidak ada: membuat proyek yang langsung batal tidak
 *  masuk akal, dan statusnya masih bisa diubah dari halaman detail. */
const STATUS_OPTIONS: ProjectStatus[] = [
  "planning",
  "active",
  "paused",
  "completed",
];

interface ManagerOption {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

/** Tahapan yang disusun di formulir; belum punya id basis data. */
interface DraftMilestone {
  key: string;
  title: string;
}

/** Nilai sentinel untuk "belum ditentukan".
 *  Radix Select melarang SelectItem bernilai string kosong, jadi tidak bisa
 *  memakai "" langsung. */
const NO_MANAGER = "__none__";

export default function CreateProjectPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    status: "planning" as ProjectStatus,
    progress: "0",
    start_date: "",
    end_date: "",
    budget: "",
    manager_id: NO_MANAGER,
    team_count: "",
  });

  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [managersLoading, setManagersLoading] = useState(true);

  const [milestones, setMilestones] = useState<DraftMilestone[]>([]);
  const [milestoneInput, setMilestoneInput] = useState("");

  // ===== DAFTAR CALON MANAJER =====
  useEffect(() => {
    let batal = false;

    projectService
      .getAssignableManagers()
      .then((rows) => {
        if (!batal) setManagers(rows);
      })
      .catch((err: unknown) => {
        // Tidak fatal: proyek tetap bisa disimpan tanpa manajer. Tapi tetap
        // diberitahukan, bukan didiamkan.
        if (!batal) {
          toast.error(
            err instanceof Error
              ? `Daftar penanggung jawab gagal dimuat: ${err.message}`
              : "Daftar penanggung jawab gagal dimuat"
          );
        }
      })
      .finally(() => {
        if (!batal) setManagersLoading(false);
      });

    return () => {
      batal = true;
    };
  }, []);

  const setField = (name: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  // ===== TAHAPAN =====
  const addMilestone = (title: string) => {
    const bersih = title.trim();
    if (!bersih) return;

    // Nama tahapan ganda hampir selalu salah tekan, dan membuat daftar di
    // halaman detail membingungkan.
    if (
      milestones.some((m) => m.title.toLowerCase() === bersih.toLowerCase())
    ) {
      toast.error(`"${bersih}" sudah ada di daftar tahapan`);
      return;
    }

    setMilestones((prev) => [
      ...prev,
      { key: `${prev.length}-${bersih}`, title: bersih },
    ]);
    setMilestoneInput("");
  };

  const applyPreset = () => {
    const adaSekarang = new Set(
      milestones.map((m) => m.title.toLowerCase())
    );
    const tambahan = DEFAULT_MILESTONE_PRESET.filter(
      (t) => !adaSekarang.has(t.toLowerCase())
    ).map((title, i) => ({ key: `preset-${i}-${title}`, title }));

    if (tambahan.length === 0) {
      toast.info("Seluruh tahapan standar sudah ada di daftar");
      return;
    }

    setMilestones((prev) => [...prev, ...tambahan]);
  };

  const removeMilestone = (key: string) =>
    setMilestones((prev) => prev.filter((m) => m.key !== key));

  const moveMilestone = (index: number, arah: -1 | 1) => {
    const target = index + arah;
    if (target < 0 || target >= milestones.length) return;

    setMilestones((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ===== SIMPAN =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = form.title.trim();
    if (!title) {
      toast.error("Nama proyek wajib diisi");
      return;
    }

    // Diperiksa di sini juga supaya pengguna tidak menerima pesan mentah
    // "violates check constraint projects_date_order_check" dari PostgREST.
    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      toast.error("Target selesai tidak boleh lebih awal dari tanggal mulai");
      return;
    }

    const progress = Number(form.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      toast.error("Progres fisik harus di antara 0 dan 100");
      return;
    }

    setSaving(true);
    try {
      const project = await projectService.create(
        {
          title,
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          status: form.status,
          progress: Math.round(progress),
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          budget: form.budget ? Number(form.budget) : null,
          manager_id:
            form.manager_id === NO_MANAGER ? null : form.manager_id,
          team_count: form.team_count ? Number(form.team_count) : 0,
        },
        milestones.map((m) => m.title)
      );

      toast.success(`Proyek ${project.code ?? ""} berhasil dibuat`.trim());
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      // Galat ditampilkan apa adanya. Tidak ada jalur "gagal tapi tetap
      // bilang berhasil" seperti versi lama.
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan proyek"
      );
    } finally {
      setSaving(false);
    }
  };

  const anggaranPreview = form.budget ? Number(form.budget) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* ============================================================
          KEPALA
          ============================================================ */}
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => router.push("/projects")}
          className="h-9 w-9 shrink-0 rounded-xl"
          aria-label="Kembali ke daftar proyek"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <HardHat className="h-5 w-5 text-emerald-600" />
            Proyek Baru
          </h1>
          <p className="text-xs text-muted-foreground">
            Kode proyek dibuat otomatis setelah disimpan. Hanya nama proyek yang
            wajib diisi — sisanya bisa dilengkapi belakangan dari halaman detail.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ============================================================
            1. IDENTITAS & LOKASI
            ============================================================ */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="gap-1 border-b bg-muted/30 p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <HardHat className="h-4 w-4 text-emerald-600" />
              Identitas &amp; Lokasi
            </CardTitle>
            <CardDescription className="text-xs">
              Yang dipakai untuk mengenali proyek di papan dan di lapangan.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold">
                Nama Proyek / Cluster <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Contoh: Cluster Green BSD Phase 2"
                className="h-10 rounded-xl text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="location"
                className="flex items-center gap-1 text-xs font-bold"
              >
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                Lokasi
              </Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="BSD City Sektor 1.2, Tangerang Selatan"
                className="h-10 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-bold">
                  Status Awal
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    // `v` bertipe `string | null`. Tanpa penjaga ini, `as`
                    // meloloskan null menjadi ProjectStatus dan status proyek
                    // tersimpan kosong — lolos typecheck, gagal di basis data.
                    setField("status", (v as ProjectStatus | null) ?? "planning")
                  }
                >
                  <SelectTrigger
                    id="status"
                    className="h-10 rounded-xl bg-background text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              PROJECT_STATUS_CONFIG[s].dot
                            )}
                          />
                          {PROJECT_STATUS_CONFIG[s].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="progress" className="text-xs font-bold">
                  Progres Fisik Awal (%)
                </Label>
                <Input
                  id="progress"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => setField("progress", e.target.value)}
                  className="h-10 rounded-xl text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold">
                Deskripsi &amp; Spesifikasi
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Tipe rumah, spesifikasi struktur, atau catatan khusus konstruksi…"
                rows={3}
                className="rounded-xl text-sm leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* ============================================================
            2. JADWAL & ANGGARAN
            ============================================================ */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="gap-1 border-b bg-muted/30 p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Jadwal &amp; Anggaran
            </CardTitle>
            <CardDescription className="text-xs">
              Dua tanggal ini yang dipakai papan untuk menghitung keterlambatan.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-bold">
                  Tanggal Mulai
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setField("start_date", e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date" className="text-xs font-bold">
                  Target Selesai
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  // Batas bawah ikut tanggal mulai supaya pemilih tanggalnya
                  // sendiri yang mencegah urutan terbalik.
                  min={form.start_date || undefined}
                  value={form.end_date}
                  onChange={(e) => setField("end_date", e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="budget"
                className="flex items-center gap-1 text-xs font-bold"
              >
                <Wallet className="h-3.5 w-3.5 text-amber-500" />
                Nilai Kontrak / Pagu Anggaran
              </Label>
              <Input
                id="budget"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.budget}
                onChange={(e) => setField("budget", e.target.value)}
                placeholder="4500000000"
                className="h-10 rounded-xl text-sm tabular-nums"
              />
              {/* Pratinjau ini bukan hiasan: angka miliaran mudah salah nol,
                  dan "Rp 450 jt" langsung terbaca salah oleh yang mengetiknya. */}
              {anggaranPreview > 0 && (
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Terbaca sebagai{" "}
                  <span className="text-foreground">
                    {formatCompactRupiah(anggaranPreview)}
                  </span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Realisasi biaya diisi belakangan dari halaman detail proyek.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================
            3. TIM
            ============================================================ */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="gap-1 border-b bg-muted/30 p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <UsersRound className="h-4 w-4 text-purple-600" />
              Tim Lapangan
            </CardTitle>
            <CardDescription className="text-xs">
              Penanggung jawab dipilih dari akun pengguna, bukan diketik bebas —
              supaya bisa dihubungi dan ikut menentukan hak sunting proyek.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div className="space-y-1.5">
              <Label htmlFor="manager_id" className="text-xs font-bold">
                Penanggung Jawab (PM)
              </Label>
              <Select
                value={form.manager_id}
                onValueChange={(v) => setField("manager_id", v ?? NO_MANAGER)}
                disabled={managersLoading}
              >
                <SelectTrigger
                  id="manager_id"
                  className="h-10 rounded-xl bg-background text-sm"
                >
                  <SelectValue
                    placeholder={
                      managersLoading ? "Memuat…" : "Belum ditentukan"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MANAGER} className="text-xs">
                    Belum ditentukan
                  </SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.full_name?.trim() || m.email || "Tanpa nama"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team_count" className="text-xs font-bold">
                Jumlah Pekerja
              </Label>
              <Input
                id="team_count"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.team_count}
                onChange={(e) => setField("team_count", e.target.value)}
                placeholder="0"
                className="h-10 rounded-xl text-sm tabular-nums"
              />
            </div>
          </CardContent>
        </Card>

        {/* ============================================================
            4. TAHAPAN PEKERJAAN
            ============================================================
            Menggantikan bagian "Logistik Material Awal" yang menulis ke tabel
            yang tidak pernah ada. Tahapan adalah inti papan proyek konstruksi:
            yang ingin diketahui pengawas bukan berapa sak semen tersisa,
            melainkan pondasi sudah selesai atau belum. */}
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="gap-1 border-b bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <ListChecks className="h-4 w-4 text-amber-600" />
                  Tahapan Pekerjaan
                </CardTitle>
                <CardDescription className="text-xs">
                  Opsional. Urutannya adalah urutan pengerjaan di lapangan, dan
                  bisa dicentang satu per satu dari halaman detail.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-bold tabular-nums"
              >
                {milestones.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={milestoneInput}
                onChange={(e) => setMilestoneInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter menambah tahapan, BUKAN mengirim formulir. Tanpa
                  // preventDefault, satu Enter di sini menyimpan proyek yang
                  // belum selesai disusun.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMilestone(milestoneInput);
                  }
                }}
                placeholder="Tulis tahapan, mis. Pemasangan Kusen"
                className="h-10 flex-1 rounded-xl text-sm"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => addMilestone(milestoneInput)}
                  disabled={!milestoneInput.trim()}
                  className="h-10 flex-1 gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 sm:flex-none"
                >
                  <Plus className="h-4 w-4" />
                  Tambah
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={applyPreset}
                  className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-bold sm:flex-none"
                  title="Isi dengan tahapan standar konstruksi perumahan"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Standar
                </Button>
              </div>
            </div>

            {milestones.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                Belum ada tahapan. Tekan{" "}
                <span className="font-bold text-foreground">Standar</span> untuk
                memakai urutan {DEFAULT_MILESTONE_PRESET.join(" → ")}.
              </p>
            ) : (
              <ol className="space-y-2">
                {milestones.map((m, i) => (
                  <li
                    key={m.key}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />

                    <span className="w-5 shrink-0 text-center text-[11px] font-black tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {m.title}
                    </span>

                    {/* Tombol naik/turun, bukan seret. Menyeret item di layar
                        sentuh sambil halaman ikut bergulir sulit dilakukan
                        dengan satu tangan di lokasi proyek. */}
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={i === 0}
                        onClick={() => moveMilestone(i, -1)}
                        className="h-8 w-8 rounded-lg text-muted-foreground"
                        aria-label={`Naikkan ${m.title}`}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={i === milestones.length - 1}
                        onClick={() => moveMilestone(i, 1)}
                        className="h-8 w-8 rounded-lg text-muted-foreground"
                        aria-label={`Turunkan ${m.title}`}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMilestone(m.key)}
                        className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                        aria-label={`Hapus ${m.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* ============================================================
            AKSI
            ============================================================
            Urutan dibalik di ponsel (`flex-col-reverse`) supaya tombol simpan
            berada paling bawah — dalam jangkauan ibu jari, bukan tombol Batal.
            Tidak dibuat melayang karena BottomNav sudah menempati dasar layar
            di ukuran itu. */}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
            disabled={saving}
            className="h-11 rounded-xl text-xs font-bold sm:h-9 sm:px-6"
          >
            Batal
          </Button>

          <Button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="h-11 gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 sm:h-9 sm:px-6 sm:text-xs"
          >
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan…" : "Simpan Proyek"}
          </Button>
        </div>
      </form>
    </div>
  );
}
