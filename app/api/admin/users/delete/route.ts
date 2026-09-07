// app/api/admin/users/delete/route.ts
//
// Penghapusan akun permanen: melepas relasi di tabel operasional, menghapus
// akun auth.users, lalu menghapus baris public.users.
//
// Otorisasi lewat requireRole(["super_admin"]) di lib/api-auth.ts. Versi
// sebelumnya membangun klien sesi sendiri dan mencocokkan role secara manual —
// jalur itu melewatkan pemeriksaan status akun yang dilakukan getAuthContext().
//
//
// PHASE 2 / H-1 — MENGAPA URUTANNYA DIBALIK
//
// Versi sebelumnya menghapus public.users LEBIH DULU, baru auth.users. Karena
// crm_leads.created_by menunjuk auth.users tanpa ON DELETE (H-3), langkah kedua
// selalu gagal untuk akun yang pernah membuat lead. Yang tersisa: profil publik
// hilang, baris crm_activities ikut hilang lewat CASCADE, akun auth menggantung,
// dan recordAudit tidak pernah tercapai. Tidak bisa dibatalkan dan tidak
// terlihat — pemanggil hanya menerima 500.
//
// Sekarang langkah yang paling mungkin gagal dijalankan lebih dulu, selagi belum
// ada yang hilang. Migrasi 015 sudah mengubah FK itu menjadi ON DELETE SET NULL,
// jadi penghapusan auth.users menyisakan lead pelanggan dengan created_by NULL
// alih-alih menolak. Bila toh masih ada FK lain yang menghalangi, kegagalannya
// terjadi sebelum profil publik disentuh.
//
// Tidak ada transaksi yang melingkupi keseluruhan: auth.users hanya terjangkau
// lewat API Admin GoTrue, bukan lewat koneksi SQL yang sama. Yang bisa dilakukan
// adalah menyusun urutannya sehingga kegagalan di titik mana pun meninggalkan
// keadaan yang bisa dijelaskan, dan mencatat keadaan itu.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";

/** Kolom penugasan yang dilepas sebelum akun dihapus.
 *
 *  crm_activities SENGAJA TIDAK ADA DI SINI. Versi sebelumnya menulis
 *  `crm_activities.assigned_to`; kolom itu tidak pernah ada. Diperiksa lewat
 *  PostgREST (SELECT satu kolom, limit 0) pada 2026-08-08 dan 2026-08-10:
 *  400 / 42703 undefined_column. Kolom pelakunya bernama `user_id`, dan
 *  me-null-kannya bukan bagian dari H-1: baris aktivitas tanpa pelaku adalah
 *  riwayat yang kehilangan artinya. Hari ini FK-nya ke public.users berlaku
 *  CASCADE (baseline §4), sehingga baris itu ikut terhapus bersama profilnya —
 *  perilaku lama yang tidak diubah di fase ini dan tercatat sebagai M-1.
 *
 *  PI-1 tidak mengubah itu. Yang ditambahkan hanya HITUNGANNYA
 *  (`activities_authored` pada pra-pemeriksaan), supaya baris yang lenyap lewat
 *  CASCADE punya angka di catatan audit alih-alih hilang tanpa bekas. Menghitung
 *  bukan mencegah: perilaku hapus dan schema tetap sama persis. */
const UNASSIGN_TARGETS = [
  { table: "properties", column: "assigned_to", label: "properti" },
  { table: "crm_leads", column: "assigned_to", label: "lead CRM" },
  { table: "crm_followups", column: "assigned_to", label: "follow-up CRM" },
] as const;

/** Hitungan yang diambil sebelum apa pun disentuh. Dipakai untuk isi catatan
 *  audit dan untuk menjelaskan kegagalan, bukan untuk memutuskan boleh-tidaknya
 *  menghapus. */
interface PreflightCounts {
  properties_assigned: number;
  leads_assigned: number;
  leads_created: number;
  followups_assigned: number;
  activities_authored: number;
}

/** Apakah galat penghapusan auth.users berbau baris lain yang masih menunjuk
 *  akun ini?
 *
 *  GoTrue tidak meneruskan SQLSTATE-nya — kegagalan FK sampai ke sini sebagai
 *  "Database error deleting user" dengan status 500. Jadi ini memang pencocokan
 *  teks, dan teks bisa berubah sewaktu-waktu. Karena itu ia hanya dipakai untuk
 *  MEMILIH KODE STATUS yang lebih tepat; jalur 500 di bawah tetap membawa pesan
 *  dan hitungan yang sama, sehingga tebakan yang meleset tidak menyembunyikan
 *  apa pun. */
function looksLikeDependencyConflict(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("foreign key") ||
    m.includes("23503") ||
    m.includes("still referenced") ||
    m.includes("violates")
  );
}

export async function POST(req: Request) {
  const auth = await requireRole(["super_admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Target User ID wajib diisi" }, { status: 400 });
    }

    if (auth.ctx.userId === targetUserId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri!" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Lindungi akun Super Admin.
    //
    // Role target dibaca dengan service role, bukan dengan klien sesi: policy
    // users_select memang mengizinkan orang dalam membaca baris ini, tetapi
    // keputusan otorisasi tidak boleh bergantung pada policy yang bisa berubah.
    //
    // Berlaku juga bagi Super Admin lain. Role ini memegang seluruh kewenangan
    // sistem, dan penghapusannya menyentuh auth.users — tidak bisa dibatalkan.
    // Bila memang perlu dihapus, turunkan rolenya lebih dulu lewat
    // PUT /api/admin/users.
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { error: `Gagal memeriksa akun target: ${targetError.message}` },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const targetRole = (targetProfile.role || "").toLowerCase();
    if (targetRole === "super_admin" || targetRole === "superadmin") {
      return NextResponse.json(
        {
          error:
            "Akun Super Admin tidak dapat dihapus. Turunkan rolenya lebih dulu bila memang perlu dihapus.",
        },
        { status: 403 }
      );
    }

    // Email dan role disalin SEKARANG, selagi barisnya masih ada. Tanpa salinan
    // ini catatan auditnya hanya berisi sebuah uuid tanpa arti.
    const targetEmail = targetProfile.email;
    const targetRoleRaw = targetProfile.role;

    // ------------------------------------------------------------------
    // 1. PRA-PEMERIKSAAN — membaca, tidak menyentuh apa pun
    // ------------------------------------------------------------------
    //
    // Ini BUKAN penjaga yang menolak penghapusan. Sejak migrasi 015 dijalankan
    // (diverifikasi 2026-08-10), crm_leads.created_by berlaku ON DELETE SET
    // NULL, jadi lead yang dibuat akun ini tidak lagi menghalangi apa pun —
    // menolak dengan 409 di sini justru akan menggagalkan penghapusan yang
    // sebenarnya sah.
    //
    // Gunanya dua: mengisi catatan audit dengan apa yang sebenarnya terpengaruh,
    // dan memberi angka pada pesan galat bila auth.users kelak tetap menolak.
    //
    // Kegagalan membaca DIPERLAKUKAN SEBAGAI FATAL. Ini SELECT dengan service
    // role di jalur yang sedetik lagi menghancurkan sebuah akun; bila database
    // bahkan tidak bisa dibaca, melanjutkan berarti menghapus dengan mata
    // tertutup.
    const preflight: PreflightCounts = {
      properties_assigned: 0,
      leads_assigned: 0,
      leads_created: 0,
      followups_assigned: 0,
      activities_authored: 0,
    };

    const preflightQueries = [
      { key: "properties_assigned", table: "properties", column: "assigned_to" },
      { key: "leads_assigned", table: "crm_leads", column: "assigned_to" },
      { key: "leads_created", table: "crm_leads", column: "created_by" },
      { key: "followups_assigned", table: "crm_followups", column: "assigned_to" },
      { key: "activities_authored", table: "crm_activities", column: "user_id" },
    ] as const;

    for (const q of preflightQueries) {
      const { count, error } = await supabaseAdmin
        .from(q.table)
        .select("id", { count: "exact", head: true })
        .eq(q.column, targetUserId);

      if (error) {
        console.error(
          `[user.delete] Pra-pemeriksaan gagal pada ${q.table}.${q.column}:`,
          error.message
        );
        return NextResponse.json(
          {
            error:
              `Gagal membaca ${q.table} sebelum penghapusan: ${error.message}. ` +
              "Tidak ada yang dihapus.",
          },
          { status: 500 }
        );
      }

      preflight[q.key] = count ?? 0;
    }

    // ------------------------------------------------------------------
    // 2. LEPAS PENUGASAN
    // ------------------------------------------------------------------
    //
    // supabase-js MENGEMBALIKAN galat di `{ error }`, tidak melemparnya. Versi
    // sebelumnya membungkus keempat pemanggilan ini dalam try/catch tanpa
    // memeriksa `error`, sehingga catch-nya tidak pernah menyala dan 42703 dari
    // crm_activities dibuang diam-diam — tampak tertangani justru karena ada
    // try/catch di sekelilingnya. Sekarang setiap galat diperiksa dan
    // menghentikan alur.
    //
    // Berhenti di sini berarti sebagian penugasan mungkin sudah terlepas.
    // Itu disebutkan apa adanya dalam respons: melaporkannya lebih baik daripada
    // membiarkan pemanggil mengira tidak ada yang berubah.
    const unassigned: string[] = [];

    for (const target of UNASSIGN_TARGETS) {
      const { error } = await supabaseAdmin
        .from(target.table)
        .update({ [target.column]: null })
        .eq(target.column, targetUserId);

      if (error) {
        console.error(
          `[user.delete] Gagal melepas ${target.table}.${target.column}:`,
          error.message
        );

        await recordAudit({
          actor: auth.ctx,
          action: "user.delete",
          targetId: targetUserId,
          targetEmail,
          targetRole: targetRoleRaw,
          detail: {
            outcome: "failed_unassign",
            failed_table: target.table,
            failed_column: target.column,
            error: error.message,
            unassigned_before_failure: unassigned,
            preflight,
            auth_user_deleted: false,
            public_profile_deleted: false,
          },
        });

        return NextResponse.json(
          {
            error:
              `Gagal melepas penugasan ${target.label}: ${error.message}. ` +
              "Akun TIDAK dihapus.",
            unassigned_before_failure: unassigned,
          },
          { status: 500 }
        );
      }

      unassigned.push(target.table);
    }

    // ------------------------------------------------------------------
    // 3. HAPUS auth.users — langkah yang paling mungkin gagal, dijalankan
    //    selagi profil publik masih utuh
    // ------------------------------------------------------------------
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUserId
    );

    if (deleteAuthError) {
      const message =
        deleteAuthError.message || "Gagal menghapus akun autentikasi dari auth.users";
      console.error("[user.delete] Gagal hapus dari auth.users:", message);

      await recordAudit({
        actor: auth.ctx,
        action: "user.delete",
        targetId: targetUserId,
        targetEmail,
        targetRole: targetRoleRaw,
        detail: {
          outcome: "failed_auth_delete",
          error: message,
          unassigned,
          preflight,
          auth_user_deleted: false,
          public_profile_deleted: false,
        },
      });

      const isConflict = looksLikeDependencyConflict(message);

      return NextResponse.json(
        {
          error: isConflict
            ? "Akun tidak dapat dihapus karena masih ada baris lain yang menunjuknya. " +
              "Profil publik TIDAK dihapus."
            : `${message} Profil publik TIDAK dihapus.`,
          detail: message,
          references: preflight,
          unassigned,
        },
        { status: isConflict ? 409 : 500 }
      );
    }

    // ------------------------------------------------------------------
    // 4. HAPUS public.users
    // ------------------------------------------------------------------
    //
    // Nol baris terhapus BUKAN kegagalan: bila public.users.id menunjuk
    // auth.users dengan CASCADE, langkah 3 sudah membawanya serta. Yang
    // dibedakan hanyalah galat sungguhan dari selesai-tanpa-baris, dan angkanya
    // ikut dicatat supaya keduanya bisa dibedakan belakangan.
    const { data: deletedRows, error: publicDeleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", targetUserId)
      .select("id");

    if (publicDeleteError) {
      console.error(
        "[user.delete] auth.users terhapus tetapi public.users gagal:",
        publicDeleteError.message
      );

      // Keadaan separuh jadi yang tersisa adalah kebalikan dari cacat lama, dan
      // jauh lebih ringan: profil publik yatim bisa dihapus manual, sedangkan
      // akun auth yatim tidak punya jalur perbaikan dari UI mana pun. Tetap
      // dicatat sebagai kegagalan supaya tidak lolos sebagai sukses.
      await recordAudit({
        actor: auth.ctx,
        action: "user.delete",
        targetId: targetUserId,
        targetEmail,
        targetRole: targetRoleRaw,
        detail: {
          outcome: "partial_public_profile_remains",
          error: publicDeleteError.message,
          unassigned,
          preflight,
          auth_user_deleted: true,
          public_profile_deleted: false,
        },
      });

      return NextResponse.json(
        {
          error:
            `Akun autentikasi sudah dihapus, tetapi profil di tabel users gagal dihapus: ` +
            `${publicDeleteError.message}. Hapus baris users dengan id ${targetUserId} secara manual.`,
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 5. AUDIT
    // ------------------------------------------------------------------
    await recordAudit({
      actor: auth.ctx,
      action: "user.delete",
      targetId: targetUserId,
      targetEmail,
      targetRole: targetRoleRaw,
      detail: {
        outcome: "success",
        permanent: true,
        auth_user_deleted: true,
        public_profile_deleted: (deletedRows?.length ?? 0) > 0,
        unassigned,
        preflight,
      },
    });

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus secara permanen dari sistem.",
    });
  } catch (error) {
    // Sisa jaring pengaman untuk galat yang memang DILEMPAR — req.json() pada
    // badan yang bukan JSON, createAdminClient() tanpa service role key, atau
    // kegagalan jaringan. Galat dari kueri supabase-js tidak sampai ke sini;
    // semuanya sudah diperiksa di tempatnya masing-masing.
    const detail = error instanceof Error ? error.message : String(error);
    console.error("API User Delete Exception:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
