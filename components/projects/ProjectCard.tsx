// components/projects/ProjectCard.tsx
"use client";

import Link from "next/link";
import { MapPin, Users, CalendarClock, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  type Project,
  PROJECT_STATUS_CONFIG,
  budgetUsagePct,
  daysUntilDeadline,
  deriveScheduleHealth,
  formatCompactRupiah,
  formatTanggal,
} from "@/types/project.types";

/**
 * Satu batang kemajuan berlabel.
 *
 * Dipisah karena kartu ini menampilkan DUA batang berdampingan — progres fisik
 * dan serapan anggaran. Itu inti papan proyek konstruksi: satu angka progres
 * saja menyembunyikan keadaan "uang habis 80%, bangunan baru 40%", dan keadaan
 * itulah yang paling perlu terlihat lebih awal.
 */
function ProgressBar({
  label,
  value,
  caption,
  barClass,
  danger = false,
}: {
  label: string;
  value: number | null;
  caption: string;
  barClass: string;
  danger?: boolean;
}) {
  const shown = value ?? 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-[11px] font-bold tabular-nums",
            danger ? "text-rose-600 dark:text-rose-400" : "text-foreground"
          )}
        >
          {value === null ? "—" : `${value}%`}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barClass)}
          // Dijepit di 100 supaya serapan anggaran 130% tidak meluber keluar
          // kartu. Angka aslinya tetap tampil sebagai teks di atas.
          style={{ width: `${Math.min(100, Math.max(0, shown))}%` }}
        />
      </div>

      <p className="truncate text-[10px] text-muted-foreground">{caption}</p>
    </div>
  );
}

/** "Budi Santoso" -> "BS". Cadangan saat avatar belum diunggah. */
function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProjectCard({ project }: { project: Project }) {
  const status = PROJECT_STATUS_CONFIG[project.status];
  const sisaHari = daysUntilDeadline(project.end_date);
  const serapan = budgetUsagePct(project.budget, Number(project.spent ?? 0));
  const kesehatan = deriveScheduleHealth(project);

  const telat =
    sisaHari !== null &&
    sisaHari < 0 &&
    project.status !== "completed" &&
    project.status !== "cancelled";

  return (
    // Seluruh kartu adalah tautan. Versi lama hanya bereaksi pada
    // `onDoubleClick` dengan tulisan petunjuk "klik 2x" — mustahil dilakukan di
    // layar sentuh, tidak bisa dibuka di tab baru, dan tak terbaca pembaca
    // layar. Ini yang paling merusak kegunaan halaman lama.
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
    >
      {/* Pita status: penanda warna yang terbaca sekilas dari jauh, tanpa
          memerlukan kolom foto yang alur unggahnya belum ada. */}
      <div className={cn("h-1 w-full shrink-0", status.bar)} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Kepala */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
              {project.code ?? "—"}
            </span>
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px] font-bold", status.badge)}
            >
              {status.label}
            </Badge>
          </div>

          {/* line-clamp-2, bukan truncate: nama cluster sering panjang dan
              memotongnya di satu baris menghilangkan fasenya ("… Phase 2"). */}
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            {project.title}
          </h3>

          {project.location && (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-rose-500" />
              <span className="truncate">{project.location}</span>
            </p>
          )}
        </div>

        {/* Dua batang berdampingan */}
        <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-3">
          <ProgressBar
            label="Fisik"
            value={project.progress}
            caption={
              kesehatan === "behind"
                ? "Tertinggal jadwal"
                : kesehatan === "at_risk"
                  ? "Perlu perhatian"
                  : "Sesuai rencana"
            }
            barClass={
              kesehatan === "behind"
                ? "bg-rose-500"
                : kesehatan === "at_risk"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }
            danger={kesehatan === "behind"}
          />

          <ProgressBar
            label="Anggaran"
            value={serapan}
            caption={
              project.budget
                ? `${formatCompactRupiah(Number(project.spent ?? 0))} / ${formatCompactRupiah(project.budget)}`
                : "Pagu belum ditetapkan"
            }
            barClass={
              serapan !== null && serapan > 100
                ? "bg-rose-500"
                : serapan !== null && serapan > 85
                  ? "bg-amber-500"
                  : "bg-blue-500"
            }
            danger={serapan !== null && serapan > 100}
          />
        </div>

        {/* Kaki */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0 border border-border">
              <AvatarImage src={project.manager?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-muted text-[9px] font-bold">
                {initials(project.manager?.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[11px] font-semibold text-muted-foreground">
              {project.manager?.full_name ?? "Belum ada PM"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {project.team_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Users className="h-3 w-3" />
                {project.team_count}
              </span>
            )}

            {sisaHari !== null && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                  telat
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-muted text-muted-foreground"
                )}
                title={`Tenggat ${formatTanggal(project.end_date)}`}
              >
                {telat ? (
                  <TriangleAlert className="h-3 w-3" />
                ) : (
                  <CalendarClock className="h-3 w-3" />
                )}
                {telat ? `Telat ${Math.abs(sisaHari)}h` : `${sisaHari}h lagi`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ProjectCard;
