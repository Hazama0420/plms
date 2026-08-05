// app/api/notifications/push-test/route.ts
//
// Uji coba push tanpa menyentuh tabel `notifications` — untuk memastikan
// kredensial OneSignal dan pendaftaran External ID sudah benar.
//
// Default targetRole-nya "self": mengirim hanya ke perangkat admin yang menekan
// tombol. Uji coba tidak semestinya mengganggu seluruh pengguna, dan versi
// sebelumnya menyiarkannya ke segment "All".
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/onesignal";
import { pushTestSchema, validate } from "@/lib/validations";

const ROLE_GROUPS: Record<"internal" | "viewer" | "all", string[] | null> = {
  internal: ["super_admin", "admin", "agent", "marketing"],
  viewer: ["viewer"],
  all: null,
};

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["admin", "super_admin"]);
    if (!auth.ok) return auth.response;

    const parsed = validate(pushTestSchema, await request.json());
    if (!parsed.ok) return parsed.response;

    const { title, message, targetRole, category, actionUrl } = parsed.data;

    let userIds: string[];

    if (targetRole === "self") {
      userIds = [auth.ctx.userId];
    } else {
      const supabaseAdmin = createAdminClient();
      let query = supabaseAdmin.from("users").select("id");

      const roles = ROLE_GROUPS[targetRole];
      if (roles) query = query.in("role", roles);

      const { data, error } = await query;
      if (error) throw new Error("Gagal mengambil daftar penerima: " + error.message);

      userIds = (data ?? []).map((u) => u.id as string).filter(Boolean);
    }

    if (userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: `Tidak ada pengguna dengan target "${targetRole}".` },
        { status: 422 }
      );
    }

    const push = await sendPushToUsers(userIds, {
      title,
      message,
      url: actionUrl,
      data: { category: category || "admin", targetRole, test: true },
    });

    if (!push.success) {
      return NextResponse.json({ success: false, error: push.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      targeted: userIds.length,
      delivered: push.recipients,
      // Nol perangkat bukan kegagalan: penerima mungkin belum pernah menekan
      // "Izinkan", atau External ID-nya belum terdaftar karena belum pernah
      // membuka aplikasi sejak penautan akun diaktifkan.
      ...(push.skipped ? { note: push.skipped } : {}),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[notifikasi/push-test]", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
