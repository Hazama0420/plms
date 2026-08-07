"use client";

// components/admin/AdminAuditTrail.tsx
//
// Tab "Aksi Admin" di /admin/logs — membaca public.admin_audit_log lewat
// GET /api/admin/audit. Hanya dirender untuk Super Admin.
//
// Berbeda dari tab aktivitas CRM: tidak ada tombol hapus. Tabel auditnya
// append-only (migrasi 011 sengaja tidak memasang policy DELETE), jadi
// menyediakan tombolnya hanya akan menjanjikan sesuatu yang selalu gagal.

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ArrowRight,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { groupByDate } from "@/lib/activity-display";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_id: string | null;
  target_email: string | null;
  target_role: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar: string | null;
  target_name: string | null;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; dot: string; icon: React.ReactNode }
> = {
  "user.role_change": {
    label: "Ubah Role",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
    icon: <UserCog className="w-3 h-3" />,
  },
  "user.status_change": {
    label: "Ubah Status",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  "user.delete": {
    label: "Hapus Akun",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
    icon: <UserX className="w-3 h-3" />,
  },
  "logs.delete": {
    label: "Hapus Log",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    icon: <Trash2 className="w-3 h-3" />,
  },
  "settings.ai_toggle": {
    label: "Fitur AI",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
    icon: <Sparkles className="w-3 h-3" />,
  },
};

const FALLBACK_CONFIG = {
  color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  dot: "bg-slate-400",
  icon: <ShieldAlert className="w-3 h-3" />,
};

/**
 * Ringkasan satu baris audit dalam bahasa manusia.
 *
 * Sasaran disebut dengan nama bila akunnya masih ada, dan dengan email salinan
 * bila tidak — untuk 'user.delete' barisnya memang sudah dihapus, jadi
 * target_name selalu null di sana.
 */
function describe(row: AuditRow): string {
  const detail = row.detail ?? {};
  const target = row.target_name || row.target_email || "akun yang sudah dihapus";

  switch (row.action) {
    case "user.role_change":
      return `Mengubah role ${target} dari ${String(detail.from ?? "?")} menjadi ${String(detail.to ?? "?")}.`;
    case "user.status_change": {
      const parts: string[] = [];
      const status = detail.status as { from?: string; to?: string } | undefined;
      const approved = detail.is_approved as { from?: boolean; to?: boolean } | undefined;
      if (status) parts.push(`status ${status.from ?? "?"} → ${status.to ?? "?"}`);
      if (approved) {
        parts.push(`persetujuan ${approved.from ? "ya" : "tidak"} → ${approved.to ? "ya" : "tidak"}`);
      }
      return `Memperbarui ${target}: ${parts.join(", ") || "tanpa perubahan tercatat"}.`;
    }
    case "user.delete":
      return detail.permanent
        ? `Menghapus permanen akun ${target} (termasuk akun autentikasinya).`
        : `Menghapus profil akun ${target}.`;
    case "logs.delete":
      return `Menghapus ${String(detail.count ?? "?")} baris log aktivitas CRM.`;
    case "settings.ai_toggle":
      return `${detail.enabled ? "Menyalakan" : "Mematikan"} fitur ringkasan AI di dashboard.`;
    default:
      return `Aksi ${row.action}.`;
  }
}

export function AdminAuditTrail() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const fetchAudit = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?page=${targetPage}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat jejak audit.");
      setRows(json.data ?? []);
      setTotalCount(json.count ?? 0);
      setPageSize(json.pageSize ?? 50);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Gagal memuat jejak audit", { description: message });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit(page);
  }, [page, fetchAudit]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const groups = groupByDate(rows);

  return (
    <Card className="border border-border shadow-2xs bg-card overflow-hidden text-card-foreground">
      <CardHeader className="p-3.5 border-b border-border bg-muted/30">
        <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Jejak Aksi Administratif
          </span>
          <Badge variant="outline" className="text-[10px] bg-background font-mono border-border">
            Hal. {page}/{totalPages} · {totalCount} catatan
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600 dark:text-purple-400" />
            <p>Memuat jejak audit...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <ShieldCheck className="w-8 h-8 opacity-40 mx-auto" />
            <p className="font-semibold text-foreground">Belum ada aksi administratif tercatat.</p>
            <p className="text-xs">
              Perubahan role, status akun, penghapusan log, dan pengaturan fitur akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="relative">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-2">
                  <h3 className="text-xs font-bold text-foreground">{group.label}</h3>
                </div>

                <div className="relative pl-6 py-2">
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                  {group.items.map((row) => {
                    const config = ACTION_CONFIG[row.action] ?? {
                      label: row.action,
                      ...FALLBACK_CONFIG,
                    };
                    const actorName =
                      row.actor_name || row.actor_email || "Akun yang sudah dihapus";

                    return (
                      <div key={row.id} className="relative flex items-start gap-3 pb-4 pr-4">
                        <div
                          className={cn(
                            "absolute left-[-13px] w-3 h-3 rounded-full border-2 border-background z-10",
                            config.dot
                          )}
                        />

                        <Avatar className="h-8 w-8 border border-border shrink-0 mt-0.5">
                          <AvatarImage src={row.actor_avatar || undefined} />
                          <AvatarFallback className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                            {actorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{actorName}</span>
                            {row.actor_role && (
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-muted/60 text-muted-foreground border-border"
                              >
                                {row.actor_role.replace("_", " ")}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 border flex items-center gap-1",
                                config.color
                              )}
                            >
                              {config.icon}
                              {config.label}
                            </Badge>
                          </div>

                          <p className="text-[13px] text-foreground/90 leading-relaxed break-words bg-muted/30 p-2.5 rounded-lg border border-border/40 flex items-start gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                            <span>{describe(row)}</span>
                          </p>

                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {row.created_at
                              ? format(new Date(row.created_at), "HH:mm", { locale: localeId })
                              : "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {!loading && totalPages > 1 && (
        <div className="border-t border-border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} dari{" "}
            {totalCount} catatan
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 px-3 text-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-9 px-3 text-xs cursor-pointer"
            >
              Berikutnya
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
