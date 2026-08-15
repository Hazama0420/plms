// lib/audit-log.ts
//
// Penulis jejak audit aksi administratif ke public.admin_audit_log
// (migrasi 011_admin_audit_log.sql).
//
// Selalu memakai service role: tabel itu sengaja tidak punya policy INSERT,
// sehingga tidak ada jalur lain yang bisa menulisnya — termasuk dari peramban.

import { createAdminClient } from "@/lib/supabase/admin";

/** Aksi yang dicatat. Sengaja union eksplisit, bukan string bebas: nilai yang
 *  salah ketik akan hilang dari tampilan tanpa jejak galat. */
export type AuditAction =
  | "user.role_change"
  | "user.status_change"
  | "user.delete"
  | "logs.delete"
  | "settings.ai_toggle"
  | "lead.pipeline_changed"
  | "lead.marked_lost"
  | "deal.submitted"
  | "deal.verified"
  | "deal.rejected"
  | "followup.created"
  | "followup.updated"
  | "followup.completed"
  | "followup.cancelled"
  | "followup.deleted"
  | "followup.overdue";

export interface AuditEntry {
  /** Konteks dari requireRole()/requireAuth() — id, email, dan role pelaku. */
  actor: { userId: string | null; email: string | null; role: string };
  action: AuditAction;
  targetId?: string | null;
  targetEmail?: string | null;
  targetRole?: string | null;
  detail?: Record<string, unknown>;
}

/** Bentuk baris seperti yang dibaca GET /api/admin/audit. */
export interface AuditLogRow {
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
}

/**
 * Mencatat satu aksi administratif.
 *
 * Panggil SETELAH operasinya berhasil — audit mencatat apa yang terjadi, bukan
 * apa yang diniatkan.
 *
 * Tidak pernah melempar. Aksinya sudah tersimpan di database saat fungsi ini
 * dipanggil; membatalkan respons sukses hanya karena pencatatannya gagal akan
 * membuat pemanggil percaya perubahannya tidak jadi, padahal sudah jadi —
 * keadaan setengah jadi yang lebih menyesatkan daripada catatan yang hilang.
 * Kegagalan tetap muncul di log server dengan awalan [audit] supaya bisa
 * ditelusuri, bukan ditelan diam-diam.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("admin_audit_log").insert({
      actor_id: entry.actor.userId,
      actor_email: entry.actor.email,
      actor_role: entry.actor.role,
      action: entry.action,
      target_id: entry.targetId ?? null,
      target_email: entry.targetEmail ?? null,
      target_role: entry.targetRole ?? null,
      detail: entry.detail ?? {},
    });

    if (error) {
      console.error(
        `[audit] Gagal mencatat "${entry.action}" oleh ${entry.actor.email ?? entry.actor.userId}:`,
        error.message
      );
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[audit] Gagal mencatat "${entry.action}":`, detail);
  }
}
