// app/api/notifications/send/route.ts
//
// Menyiarkan pengumuman resmi: satu baris `notifications` per penerima nyata,
// lalu satu push ke perangkat mereka.
//
// Perubahan penting dari versi sebelumnya:
//   1. Penerima ditentukan dari tabel `users`, bukan dari nama segment OneSignal
//      yang harus dikonfigurasi manual di dasbor mereka ("Active Users" dsb.
//      tidak ada secara bawaan, jadi push-nya diam-diam nihil atau salah orang).
//   2. Baris lonceng ditulis di sini, bukan di klien. Klien sebelumnya menyimpan
//      satu baris tanpa `user_id`, sementara pembacaannya menyaring
//      `.eq("user_id", ...)` — sehingga pengumumannya tidak pernah tampil.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/onesignal";
import { ADMIN_ROLES_FOR_QUERY } from "@/lib/notification-helper";
import { notificationSendSchema, validate } from "@/lib/validations";

/**
 * Peran yang tercakup oleh tiap pilihan targetRole.
 *
 * Bagian adminnya diambil dari ADMIN_ROLES_FOR_QUERY: kolom `users.role` memuat
 * dua ejaan Super Admin, dan daftar yang ditulis manual di sini melewatkan
 * pemegang ejaan "superadmin" dari setiap pengumuman internal.
 */
const ROLE_GROUPS: Record<"internal" | "viewer" | "all", string[] | null> = {
  internal: [...ADMIN_ROLES_FOR_QUERY, "agent", "marketing"],
  viewer: ["viewer"],
  all: null, // null berarti tanpa penyaringan peran
};

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["admin", "super_admin"]);
    if (!auth.ok) return auth.response;

    const parsed = validate(notificationSendSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { title, message, targetRole, category, type, actionUrl } = parsed.data;

    const supabaseAdmin = createAdminClient();

    // 1. Kumpulkan penerima.
    let query = supabaseAdmin.from("users").select("id");
    const roles = ROLE_GROUPS[targetRole];
    if (roles) query = query.in("role", roles);

    const { data: recipients, error: recipientErr } = await query;
    if (recipientErr) throw new Error("Gagal mengambil daftar penerima: " + recipientErr.message);

    const userIds = (recipients ?? []).map((u) => u.id as string).filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: `Tidak ada pengguna dengan target "${targetRole}".` },
        { status: 422 }
      );
    }

    // 2. Tulis baris lonceng untuk masing-masing penerima.
    //
    // `link` dan `action_url` diisi nilai yang sama: antarmuka membaca keduanya
    // (action_url lebih dulu) dan kolom mana yang terpakai berbeda antar layar.
    const { error: dbError } = await supabaseAdmin.from("notifications").insert(
      userIds.map((userId) => ({
        user_id: userId,
        sender_id: auth.ctx.userId,
        type: type || "announcement",
        category: category || "admin",
        target_role: targetRole,
        title,
        message,
        link: actionUrl ?? null,
        action_url: actionUrl ?? null,
        is_read: false,
      }))
    );

    if (dbError) throw new Error("Gagal menyimpan notifikasi: " + dbError.message);

    // 3. Push ke perangkat penerima.
    const push = await sendPushToUsers(userIds, {
      title,
      message,
      url: actionUrl,
      data: {
        category: category || "admin",
        type: type || "announcement",
        targetRole,
      },
    });

    // Kegagalan push tidak membatalkan pengumuman — barisnya sudah tersimpan
    // dan tetap terbaca di lonceng web. Statusnya dilaporkan apa adanya agar
    // admin tahu apakah perangkat benar-benar menerima.
    return NextResponse.json({
      success: true,
      message: push.success
        ? `Pengumuman tersimpan untuk ${userIds.length} pengguna, push terkirim ke ${push.recipients} perangkat.`
        : `Pengumuman tersimpan untuk ${userIds.length} pengguna, tetapi push gagal dikirim.`,
      recipients: userIds.length,
      push: {
        delivered: push.recipients,
        ok: push.success,
        ...(push.skipped ? { note: push.skipped } : {}),
        ...(push.error ? { error: push.error } : {}),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[notifikasi/send]", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
