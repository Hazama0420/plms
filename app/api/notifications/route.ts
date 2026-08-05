// app/api/notifications/route.ts
//
// Endpoint notifikasi milik pengguna yang sedang login.
//
// Ditulis ulang karena tiga hal pada versi sebelumnya:
//   1. Memakai getSession(), yang hanya membaca cookie tanpa verifikasi ke
//      server Auth. Kini lewat requireAuth() di lib/api-auth.ts.
//   2. Memanggil notification.service.ts yang berbasis klien peramban. Di dalam
//      Route Handler klien itu tidak punya sesi, sehingga GET selalu kosong dan
//      POST selalu menolak dengan "Pengguna tidak terautentikasi".
//   3. Push-nya disiarkan ke segment "All" walau penerimanya sudah ditentukan.
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/onesignal";
import { notificationCreateSchema, validate } from "@/lib/validations";

// ============================================================
// GET – Daftar notifikasi milik pengguna
// ============================================================
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const searchParams = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const isReadParam = searchParams.get("is_read");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("notifications")
    .select("*, sender:sender_id(id, full_name, avatar_url)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (isReadParam !== null) {
    query = query.eq("is_read", isReadParam === "true");
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const total = count ?? 0;

  return NextResponse.json({
    success: true,
    data: data ?? [],
    count: total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

// ============================================================
// POST – Kirim notifikasi ke user tertentu / satu kelompok role
// ============================================================
export async function POST(req: NextRequest) {
  try {
    // Menulis baris untuk akun orang lain, jadi dibatasi ke admin.
    const auth = await requireRole(["admin", "super_admin"]);
    if (!auth.ok) return auth.response;

    const parsed = validate(notificationCreateSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const { recipient_type, user_ids, type, title, message, link } = parsed.data;

    // Klien admin diperlukan: RLS melarang pengguna menyisipkan baris atas nama
    // akun lain, dan itu memang perilaku yang benar untuk klien biasa.
    const supabaseAdmin = createAdminClient();

    let targetUserIds: string[] = [];

    if (recipient_type === "specific") {
      // Disaring lewat tabel users agar id yang sudah tidak ada tidak ikut
      // membuat insert gagal seluruhnya karena pelanggaran foreign key.
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("id", user_ids ?? []);
      if (error) throw new Error("Gagal memeriksa penerima: " + error.message);
      targetUserIds = (data ?? []).map((u) => u.id as string);
    } else {
      const roles =
        recipient_type === "all_agents"
          ? ["agent"]
          : recipient_type === "all_admins"
            ? ["super_admin", "admin"]
            : null;

      let query = supabaseAdmin.from("users").select("id");
      if (roles) query = query.in("role", roles);

      const { data, error } = await query;
      if (error) throw new Error("Gagal mengambil daftar penerima: " + error.message);
      targetUserIds = (data ?? []).map((u) => u.id as string);
    }

    targetUserIds = targetUserIds.filter(Boolean);

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada penerima yang valid." },
        { status: 422 }
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(
        targetUserIds.map((userId) => ({
          user_id: userId,
          sender_id: auth.ctx.userId,
          type,
          title,
          message,
          link: link ?? null,
          action_url: link ?? null,
          is_read: false,
        }))
      )
      .select("id, user_id");

    if (insertError) throw new Error("Gagal menyimpan notifikasi: " + insertError.message);

    // Push hanya ke penerima yang barisnya benar-benar tersimpan.
    const push = await sendPushToUsers(targetUserIds, {
      title,
      message,
      url: link,
      data: { type, link: link ?? null },
    });

    return NextResponse.json({
      success: true,
      recipients: targetUserIds.length,
      data: inserted ?? [],
      push: {
        delivered: push.recipients,
        ok: push.success,
        ...(push.skipped ? { note: push.skipped } : {}),
        ...(push.error ? { error: push.error } : {}),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[notifikasi] POST:", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}

// ============================================================
// PUT – Tandai satu / semua notifikasi sebagai sudah dibaca
// ============================================================
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const body = await req.json().catch(() => ({}));
  const { action, notificationId } = body ?? {};

  if (action === "mark_all") {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "mark_one" && typeof notificationId === "string" && notificationId) {
    // Penyaringan user_id tetap ditulis walau RLS sudah menjaganya — ini
    // lapisan kedua, sesuai pola guard di lib/api-auth.ts.
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: "action tidak dikenal. Gunakan 'mark_all' atau 'mark_one' beserta notificationId." },
    { status: 400 }
  );
}
