// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";
import { notifyEvent } from "@/lib/notification-helper";

const USER_FIELDS =
  "id, email, full_name, avatar_url, role, status, is_approved, created_at, updated_at";

/** Nilai status yang dikenal sistem. Membatasi apa yang boleh masuk lewat body. */
const VALID_STATUSES = ["active", "pending", "suspended"];

/**
 * Role yang boleh ditulis lewat endpoint ini — sama dengan kunci USER_ROLES di
 * types/user.types.ts. Tanpa daftar putih ini, route memakai service role yang
 * melewati RLS, sehingga salah ketik akan tersimpan sebagai role tak dikenal:
 * is_staff() dan is_internal_staff() tidak mengenalinya dan pengguna terkunci
 * di luar seluruh sistem.
 */
const VALID_ROLES = ["super_admin", "admin", "agent", "marketing", "viewer"];

/** Kedua ejaan dianggap sama; baris lama memakai 'superadmin' tanpa garis bawah. */
const isSuperAdminRole = (role?: string | null) =>
  role === "super_admin" || role === "superadmin";

export async function GET() {
  const auth = await requireRole(["super_admin", "admin"]);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(USER_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

/**
 * Memperbarui role dan/atau status persetujuan seorang pengguna.
 *
 * Dua kewenangan yang berbeda lewat satu pintu:
 *   - `role`               → hanya super_admin. Menyetujui agen tidak sama
 *                            dengan boleh menaikkan pangkat orang.
 *   - `status`/`is_approved` → admin dan super_admin.
 *
 * Route ini memakai service role sehingga melewati RLS; trigger
 * guard_users_privileged_columns sengaja meloloskan pemanggil tanpa auth.uid().
 * Karena itu pemeriksaan wewenang di bawah inilah satu-satunya yang berlaku.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireRole(["super_admin", "admin"]);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { userId, role, status, is_approved } = body;

  if (!userId) {
    return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
  }

  const callerIsSuperAdmin = isSuperAdminRole(auth.ctx.role);
  const admin = createAdminClient();

  // Role target dibaca lebih dulu: seluruh pemeriksaan di bawah bergantung pada
  // apakah yang disentuh seorang super_admin, dan itu tidak boleh disimpulkan
  // dari body — pemanggil bisa mengirim apa saja. Nilai lama (role, status,
  // is_approved) ikut diambil karena catatan audit di bawah mencatat perubahan
  // sebagai pasangan from → to; setelah update dijalankan, nilai lamanya sudah
  // tidak bisa dibaca lagi.
  const { data: target, error: targetError } = await admin
    .from("users")
    .select("id, email, role, status, is_approved")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ success: false, error: targetError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json(
      { success: false, error: "Pengguna tidak ditemukan." },
      { status: 404 }
    );
  }

  // Super Admin adalah peran tertinggi: hanya Super Admin yang boleh
  // menyentuhnya — termasuk status dan persetujuannya, bukan hanya rolenya.
  // Tanpa ini seorang admin bisa menonaktifkan super_admin dan mengunci
  // pemegang wewenang tertinggi di luar sistemnya sendiri.
  if (isSuperAdminRole(target.role) && !callerIsSuperAdmin) {
    return NextResponse.json(
      { success: false, error: "Akun Super Admin hanya dapat diubah oleh Super Admin." },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (role !== undefined) {
    if (!callerIsSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Hanya super_admin yang dapat mengubah role." },
        { status: 403 }
      );
    }
    if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: `role harus salah satu dari: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }
    // Menurunkan pangkat diri sendiri akan mencabut wewenang yang sedang
    // dipakai, dan bila ini super_admin terakhir tidak ada yang bisa
    // memulihkannya.
    if (userId === auth.ctx.userId && !isSuperAdminRole(role)) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat menurunkan role akun sendiri." },
        { status: 400 }
      );
    }
    updates.role = role;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `status harus salah satu dari: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = status;
  }

  if (is_approved !== undefined) {
    if (typeof is_approved !== "boolean") {
      return NextResponse.json(
        { success: false, error: "is_approved harus boolean" },
        { status: 400 }
      );
    }
    updates.is_approved = is_approved;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: "Tidak ada perubahan: kirim role, status, atau is_approved." },
      { status: 400 }
    );
  }

  // Menonaktifkan diri sendiri akan mengunci pengurus terakhir di luar sistem.
  if (userId === auth.ctx.userId && updates.status && updates.status !== "active") {
    return NextResponse.json(
      { success: false, error: "Tidak dapat menonaktifkan akun sendiri." },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select(USER_FIELDS)
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Jejak audit — dicatat setelah update berhasil.
  //
  // Perubahan role dan perubahan status dicatat sebagai baris terpisah meski
  // datang dalam satu permintaan: keduanya kewenangan yang berbeda (role hanya
  // super_admin, status juga admin), dan menggabungkannya membuat penelusuran
  // "siapa saja yang pernah menaikkan pangkat" harus membongkar isi detail.
  if (updates.role !== undefined) {
    await recordAudit({
      actor: auth.ctx,
      action: "user.role_change",
      targetId: target.id,
      targetEmail: target.email,
      targetRole: target.role,
      detail: { from: target.role, to: updates.role },
    });
  }

  if (updates.status !== undefined || updates.is_approved !== undefined) {
    await recordAudit({
      actor: auth.ctx,
      action: "user.status_change",
      targetId: target.id,
      targetEmail: target.email,
      targetRole: target.role,
      detail: {
        ...(updates.status !== undefined
          ? { status: { from: target.status, to: updates.status } }
          : {}),
        ...(updates.is_approved !== undefined
          ? { is_approved: { from: target.is_approved, to: updates.is_approved } }
          : {}),
      },
    });
  }

  // Notifikasi persetujuan akun — dikirim hanya untuk peralihan dari "pending"
  // ke "active", yaitu saat admin menyetujui akun yang sedang menunggu.
  //
  // Reaktivasi akun "suspended" sengaja tidak ikut: alurnya berbeda di
  // antarmuka (handleReactivate, bukan handleApprove) dan kalimat "akun Anda
  // disetujui" akan salah bagi orang yang akunnya pernah dinonaktifkan.
  //
  // `is_approved` diperiksa dengan `!== false`, bukan `=== true`: halaman admin
  // selalu mengirim keduanya, tetapi pemanggil API yang hanya mengirim status
  // juga tetap dianggap menyetujui. Yang dikecualikan hanya kombinasi
  // kontradiktif status active + is_approved false.
  //
  // Kegagalan notifikasi sengaja tidak dilempar: update sudah berhasil dan
  // akunnya sudah aktif. Pemberitahuan yang tidak sampai lebih baik daripada
  // persetujuan yang terblokir — pemilik akun tetap bisa masuk.
  if (
    target.status === "pending" &&
    updates.status === "active" &&
    updates.is_approved !== false
  ) {
    const agentName = data.full_name?.trim() || target.email?.split("@")[0] || "Anda";

    try {
      await notifyEvent({
        event: "account.approved",
        userIds: [target.id],
        title: "Akun Anda Disetujui",
        message: `Selamat, ${agentName}! Akun Anda telah disetujui dan kini aktif. Silakan masuk ke aplikasi.`,
        link: "/dashboard",
        senderId: auth.ctx.userId,
      });
    } catch (notifyErr) {
      console.warn(
        `[admin/users] Notifikasi persetujuan untuk ${target.id} gagal dikirim:`,
        notifyErr
      );
    }
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
  }
  if (userId === auth.ctx.userId) {
    return NextResponse.json({ success: false, error: "Tidak bisa hapus sendiri" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Akun Super Admin tidak bisa dihapus oleh siapa pun lewat endpoint ini,
  // termasuk oleh Super Admin lain. Peran ini yang memegang seluruh kewenangan
  // sistem; menghapusnya lewat satu permintaan HTTP terlalu mudah untuk aksi
  // yang tidak bisa dibatalkan. Pencabutan dilakukan dengan menurunkan rolenya
  // lebih dulu (PUT), baru menghapus akunnya.
  const { data: target, error: targetError } = await admin
    .from("users")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ success: false, error: targetError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json(
      { success: false, error: "Pengguna tidak ditemukan." },
      { status: 404 }
    );
  }
  if (isSuperAdminRole(target.role)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Akun Super Admin tidak dapat dihapus. Turunkan rolenya lebih dulu bila memang perlu dihapus.",
      },
      { status: 403 }
    );
  }

  const { error } = await admin.from("users").delete().eq("id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Email dan role target disalin ke catatan audit karena barisnya baru saja
  // dihapus — tanpa salinan itu yang tersisa hanya sebuah uuid tanpa arti.
  await recordAudit({
    actor: auth.ctx,
    action: "user.delete",
    targetId: target.id,
    targetEmail: target.email,
    targetRole: target.role,
    detail: { permanent: false, auth_user_deleted: false },
  });

  return NextResponse.json({ success: true });
}