// app/(dashboard)/projects/[id]/page.tsx
//
// Halaman detail proyek konstruksi.
//
// Berkas ini sebelumnya TIDAK ADA, padahal ditautkan dari tiga tempat — jadi
// setiap upaya membuka detail proyek berakhir di 404.
//
// `params` adalah Promise sejak Next.js 15.0.0-RC dan client component tidak
// boleh async, jadi dibaca lewat React `use()`
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md:205-220).
"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Wallet,
  UsersRound,
  TriangleAlert,
  Trash2,
  Save,
  ListChecks,
  Plus,
  Check,
  Loader2,
  HardHat,
  Info,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import projectService from "@/services/project.service";
import {
  MILESTONE_STATUS_CONFIG,
  PROJECT_STATUS_CONFIG,
  budgetUsagePct,
  daysUntilDeadline,
  deriveScheduleHealth,
  formatCompactRupiah,
  formatRupiah,
  formatTanggal,
  type MilestoneStatus,
  type Project,
  type ProjectMilestone,
  type ProjectStatus,
} from "@/types/project.types";

const STATUS_OPTIONS: ProjectStatus[] = [
  "planning",
  "active",
  "paused",
  "completed",
  "cancelled",
];

/** Siklus centang tahapan. Blocked hanya bisa dipilih lewat menu, bukan lewat
 *  klik cepat — menandai pekerjaan terhambat harus disengaja. */
const NEXT_MILESTONE_STATUS: Record<MilestoneStatus, MilestoneStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
  blocked: "in_progress",
};

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Satu angka besar dengan label. Dipakai di strip ringkasan atas. */
function StatBox({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-base font-black tabular-nums sm:text-lg",
          tone === "danger"
            ? "text-rose-600 dark:text-rose-400"
            : tone === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : tone === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sunting cepat: nilai formulir dipisah dari `project` supaya angka yang
  // sedang diketik tidak ikut mengubah bar di layar sebelum disimpan.
  const [draftProgress, setDraftProgress] = useState("0");
  const [draftSpent, setDraftSpent] = useState("0");
  const [savingQuick, setSavingQuick] = useState(false);

  const [milestoneInput, setMilestoneInput] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [busyMilestone, setBusyMilestone] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ===== MUAT =====
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasil = await projectService.getById(id);
      if (!hasil) {
        setError("Proyek tidak ditemukan atau Anda tidak berhak melihatnya.");
        setProject(null);
        return;
      }
      setProject(hasil);
      setMilestones(hasil.milestones ?? []);
      setDraftProgress(String(hasil.progress));
      setDraftSpent(String(Number(hasil.spent ?? 0)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat proyek");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ===== SUNTING CEPAT =====
  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return;
    const sebelumnya = project.status;

    // Optimistis, TAPI dibatalkan lagi bila gagal. Versi lama halaman daftar
    // memperbarui layar lalu menelan kegagalannya dengan `catch {}` kosong,
    // sehingga angka di layar berbeda dari isi basis data.
    setProject({ ...project, status });
    try {
      await projectService.updateStatus(project.id, status);
      toast.success(`Status diubah ke ${PROJECT_STATUS_CONFIG[status].label}`);
    } catch (err: unknown) {
      setProject({ ...project, status: sebelumnya });
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status proyek"
      );
    }
  };

  const handleSaveQuick = async () => {
    if (!project) return;

    const progress = Number(draftProgress);
    const spent = Number(draftSpent);

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      toast.error("Progres fisik harus di antara 0 dan 100");
      return;
    }
    if (!Number.isFinite(spent) || spent < 0) {
      toast.error("Realisasi biaya tidak boleh negatif");
      return;
    }

    setSavingQuick(true);
    try {
      const hasil = await projectService.update(project.id, {
        progress: Math.round(progress),
        spent,
      });
      setProject({ ...hasil, milestones });
      toast.success("Progres dan realisasi biaya tersimpan");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan perubahan"
      );
    } finally {
      setSavingQuick(false);
    }
  };

  // ===== TAHAPAN =====
  const handleAddMilestone = async () => {
    const title = milestoneInput.trim();
    if (!title || !project) return;

    setAddingMilestone(true);
    try {
      const baru = await projectService.addMilestone(
        project.id,
        title,
        milestones.length
      );
      setMilestones((prev) => [...prev, baru]);
      setMilestoneInput("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menambah tahapan"
      );
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleCycleMilestone = async (m: ProjectMilestone) => {
    setBusyMilestone(m.id);
    try {
      const hasil = await projectService.setMilestoneStatus(
        m.id,
        NEXT_MILESTONE_STATUS[m.status]
      );
      setMilestones((prev) =>
        prev.map((x) => (x.id === hasil.id ? hasil : x))
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status tahapan"
      );
    } finally {
      setBusyMilestone(null);
    }
  };

  const handleRemoveMilestone = async (m: ProjectMilestone) => {
    setBusyMilestone(m.id);
    try {
      await projectService.removeMilestone(m.id);
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus tahapan"
      );
    } finally {
      setBusyMilestone(null);
    }
  };

  // ===== HAPUS PROYEK =====
  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await projectService.remove(project.id);
      toast.success("Proyek dihapus");
      router.push("/projects");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus proyek"
      );
      setDeleting(false);
    }
  };

  // ============================================================
  // MEMUAT / GAGAL
  // ============================================================
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-lg pt-10">
        <Card className="rounded-2xl border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TriangleAlert className="h-9 w-9 text-rose-600" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                Proyek tidak bisa dibuka
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
                {error}
              </p>
            </div>
            <Button
              render={<Link href="/projects" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
            >
              Kembali ke daftar proyek
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // TURUNAN
  // ============================================================
  const status = PROJECT_STATUS_CONFIG[project.status];
  const sisaHari = daysUntilDeadline(project.end_date);
  const serapan = budgetUsagePct(project.budget, Number(project.spent ?? 0));
  const kesehatan = deriveScheduleHealth(project);
  const telat =
    sisaHari !== null &&
    sisaHari < 0 &&
    project.status !== "completed" &&
    project.status !== "cancelled";

  const selesai = milestones.filter((m) => m.status === "done").length;
  const terhambat = milestones.filter((m) => m.status === "blocked").length;

  const adaPerubahan =
    Number(draftProgress) !== project.progress ||
    Number(draftSpent) !== Number(project.spent ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
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

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-muted-foreground">
              {project.code ?? "TANPA KODE"}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[10px] font-bold", status.badge)}
            >
              {status.label}
            </Badge>
            {telat && (
              <Badge
                variant="outline"
                className="gap-1 border-rose-200 bg-rose-50 text-[10px] font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
              >
                <TriangleAlert className="h-3 w-3" />
                Telat {Math.abs(sisaHari!)} hari
              </Badge>
            )}
          </div>

          <h1 className="text-lg font-black leading-tight tracking-tight sm:text-2xl">
            {project.title}
          </h1>

          {project.location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              {project.location}
            </p>
          )}
        </div>
      </div>

      {/* ============================================================
          STRIP RINGKASAN
          ============================================================ */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatBox
          icon={HardHat}
          label="Progres Fisik"
          value={`${project.progress}%`}
          sub={
            kesehatan === "behind"
              ? "Tertinggal jadwal"
              : kesehatan === "at_risk"
                ? "Perlu perhatian"
                : kesehatan === "unknown"
                  ? "Jadwal belum diisi"
                  : "Sesuai rencana"
          }
          tone={
            kesehatan === "behind"
              ? "danger"
              : kesehatan === "at_risk"
                ? "warning"
                : "success"
          }
        />
        <StatBox
          icon={Wallet}
          label="Serapan"
          value={serapan === null ? "—" : `${serapan}%`}
          sub={
            project.budget
              ? `${formatCompactRupiah(Number(project.spent ?? 0))} / ${formatCompactRupiah(project.budget)}`
              : "Pagu belum ditetapkan"
          }
          tone={
            serapan !== null && serapan > 100
              ? "danger"
              : serapan !== null && serapan > 85
                ? "warning"
                : "default"
          }
        />
        <StatBox
          icon={CalendarDays}
          label="Tenggat"
          value={
            sisaHari === null
              ? "—"
              : telat
                ? `${Math.abs(sisaHari)}h lewat`
                : `${sisaHari}h lagi`
          }
          sub={formatTanggal(project.end_date)}
          tone={telat ? "danger" : "default"}
        />
        <StatBox
          icon={ListChecks}
          label="Tahapan"
          value={
            milestones.length === 0
              ? "—"
              : `${selesai}/${milestones.length}`
          }
          sub={terhambat > 0 ? `${terhambat} terhambat` : "Tuntas terpantau"}
          tone={terhambat > 0 ? "warning" : "default"}
        />
      </div>

      {/* ============================================================
          SUNTING CEPAT
          ============================================================ */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="gap-1 border-b bg-muted/30 p-4">
          <CardTitle className="text-sm font-bold">Pembaruan Lapangan</CardTitle>
          <CardDescription className="text-xs">
            Tiga hal yang paling sering berubah. Sisanya — nama, lokasi, jadwal —
            belum bisa disunting dari sini.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-bold">
                Status
              </Label>
              <Select
                value={project.status}
                onValueChange={(v) => {
                  // `v` bisa null saat pilihan dibatalkan. Diabaikan, bukan
                  // diteruskan: status kosong akan ditolak check constraint.
                  if (v) handleStatusChange(v as ProjectStatus);
                }}
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
                Progres Fisik (%)
              </Label>
              <Input
                id="progress"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={draftProgress}
                onChange={(e) => setDraftProgress(e.target.value)}
                className="h-10 rounded-xl text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="spent" className="text-xs font-bold">
                Realisasi Biaya (Rp)
              </Label>
              <Input
                id="spent"
                type="number"
                inputMode="numeric"
                min={0}
                value={draftSpent}
                onChange={(e) => setDraftSpent(e.target.value)}
                className="h-10 rounded-xl text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Tombol simpan hanya muncul saat ada yang berubah — supaya tidak ada
              keraguan "tadi sudah kesimpan atau belum". Status langsung
              tersimpan sendiri saat dipilih, jadi tidak ikut di sini. */}
          {adaPerubahan && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Ada perubahan yang belum disimpan
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveQuick}
                disabled={savingQuick}
                className="h-8 shrink-0 gap-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {savingQuick ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Simpan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================
          TAHAPAN PEKERJAAN
          ============================================================ */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="gap-1 border-b bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <ListChecks className="h-4 w-4 text-amber-600" />
                Tahapan Pekerjaan
              </CardTitle>
              <CardDescription className="text-xs">
                Sentuh kotak di kiri untuk memutar status: belum mulai →
                dikerjakan → selesai.
              </CardDescription>
            </div>
            {milestones.length > 0 && (
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-bold tabular-nums"
              >
                {selesai}/{milestones.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4 sm:p-5">
          {milestones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              Belum ada tahapan untuk proyek ini.
            </p>
          ) : (
            <ol className="space-y-2">
              {milestones.map((m, i) => {
                const cfg = MILESTONE_STATUS_CONFIG[m.status];
                const sibuk = busyMilestone === m.id;

                return (
                  <li
                    key={m.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5",
                      m.status === "done" && "bg-emerald-50/40 dark:bg-emerald-950/20"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleCycleMilestone(m)}
                      disabled={sibuk}
                      // 36 px: batas bawah target sentuh yang masih nyaman
                      // ditekan dengan sarung tangan kerja.
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        m.status === "done"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : m.status === "in_progress"
                            ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950"
                            : m.status === "blocked"
                              ? "border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                      aria-label={`Ubah status ${m.title}`}
                    >
                      {sibuk ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : m.status === "done" ? (
                        <Check className="h-4 w-4" />
                      ) : m.status === "blocked" ? (
                        <TriangleAlert className="h-4 w-4" />
                      ) : (
                        <span className="text-[11px] font-black tabular-nums">
                          {i + 1}
                        </span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          m.status === "done" &&
                            "text-muted-foreground line-through"
                        )}
                      >
                        {m.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {cfg.label}
                        {m.completed_at &&
                          ` · ${formatTanggal(m.completed_at)}`}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMilestone(m)}
                      disabled={sibuk}
                      className="h-8 w-8 shrink-0 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                      aria-label={`Hapus tahapan ${m.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="flex gap-2">
            <Input
              value={milestoneInput}
              onChange={(e) => setMilestoneInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMilestone();
                }
              }}
              placeholder="Tambah tahapan baru…"
              className="h-10 flex-1 rounded-xl text-sm"
            />
            <Button
              type="button"
              onClick={handleAddMilestone}
              disabled={addingMilestone || !milestoneInput.trim()}
              className="h-10 shrink-0 gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {addingMilestone ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
          RINCIAN
          ============================================================ */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="gap-1 border-b bg-muted/30 p-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Info className="h-4 w-4 text-blue-600" />
            Rincian Proyek
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Penanggung Jawab
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarImage src={project.manager?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-muted text-[10px] font-bold">
                    {initials(project.manager?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-semibold">
                  {project.manager?.full_name ?? "Belum ditentukan"}
                </span>
              </dd>
            </div>

            <div>
              <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <UsersRound className="h-3 w-3" />
                Jumlah Pekerja
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {project.team_count > 0
                  ? `${project.team_count} orang`
                  : "Belum diisi"}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tanggal Mulai
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {formatTanggal(project.start_date)}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Target Selesai
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {formatTanggal(project.end_date)}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Nilai Kontrak
              </dt>
              {/* Rupiah penuh, bukan ringkas: di halaman inilah angka pastinya
                  memang dibutuhkan. */}
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {project.budget === null ? "—" : formatRupiah(project.budget)}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Realisasi Biaya
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {formatRupiah(Number(project.spent ?? 0))}
              </dd>
            </div>
          </dl>

          {project.description && (
            <div className="border-t border-border pt-4">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Deskripsi
              </dt>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================
          ZONA BAHAYA
          ============================================================ */}
      <Card className="rounded-2xl border-rose-200 dark:border-rose-900">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
              Hapus proyek
            </p>
            <p className="text-xs text-muted-foreground">
              Seluruh tahapan pekerjaannya ikut terhapus dan tidak bisa
              dikembalikan.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="h-9 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Proyek
          </Button>
        </CardContent>
      </Card>

      {/* Dialog biasa, bukan alert-dialog: komponen itu tidak ada di repositori
          ini. Konfirmasinya tetap menuntut satu tekanan sadar. */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <TriangleAlert className="h-4 w-4" />
              Hapus proyek ini?
            </DialogTitle>
            <DialogDescription className="text-xs">
              <span className="font-bold text-foreground">{project.title}</span>{" "}
              beserta {milestones.length} tahapan pekerjaannya akan dihapus
              permanen.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5 text-xs"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {deleting ? "Menghapus…" : "Ya, hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
