// app/api/support/route.ts
//
// Pesan bantuan dari pengguna menuju kotak masuk admin (/admin/support).
//
// Sebelumnya halaman Pengaturan menyimpan sendiri ke tabel `support_tickets`
// langsung dari peramban, sementara kotak masuk admin membaca `notifications`
// dengan `type = "support"` — dua tabel berbeda tanpa jembatan, sehingga tidak
// ada satu pesan pun yang pernah sampai. Nilai `type` itu bahkan tidak pernah
// ditulis di mana pun; satu-satunya kemunculannya adalah pada kueri yang
// membacanya.
//
// Penulisan dipindahkan ke sini karena tiga alasan:
//   1. RLS melarang klien menulis baris atas nama akun lain, dan satu pesan
//      bantuan harus menjadi satu baris untuk SETIAP admin.
//   2. `sender_id` wajib berasal dari sesi server, bukan dari body — kalau
//      tidak, pengirim bisa menyamar sebagai orang lain.
//   3. Kotak masuk admin melakukan join lewat `sender_id`; insert lama hanya
//      mengisi `user_id`, jadi nama pengirim akan selalu kosong.
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRecipientIds, notifyEvent } from "@/lib/notification-helper";
import { supportMessageSchema, validate } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    // Sengaja requireAuth, bukan requireRole: setiap pengguna yang sah berhak
    // meminta bantuan. Gerbang status di getAuthContext() sudah menyaring akun
    // pending/nonaktif.
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const parsed = validate(supportMessageSchema, await req.json());
    if (!parsed.ok) return parsed.response;

    const supabaseAdmin = createAdminClient();

    // Nama pengirim dan daftar admin diambil sekaligus. Judul notifikasi memuat
    // nama agar admin bisa mengenali pengirim dari lonceng, tanpa harus membuka
    // kotak masuk.
    const [adminIds, senderRes] = await Promise.all([
      getAdminRecipientIds(supabaseAdmin),
      supabaseAdmin
        .from("users")
        .select("full_name")
        .eq("id", auth.ctx.userId)
        .maybeSingle(),
    ]);

    // Tanpa penerima, notifyEvent() melaporkan sukses dengan delivered: 0 dan
    // pesannya lenyap tanpa jejak. Lebih baik pengirimnya tahu.
    //
    // Daftar kosong juga mencakup kasus kueri gagal — getAdminRecipientIds()
    // sengaja tidak melempar. Keduanya berujung pada hal yang sama bagi
    // pengirim: pesannya tidak akan sampai ke siapa pun.
    if (adminIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Belum ada admin yang dapat menerima pesan. Hubungi kantor melalui WhatsApp.",
        },
        { status: 503 }
      );
    }

    const senderName =
      senderRes.data?.full_name?.trim() ||
      auth.ctx.email?.split("@")[0] ||
      "Pengguna";

    const result = await notifyEvent({
      event: "support.request",
      userIds: adminIds,
      title: `Pesan bantuan dari ${senderName}`,
      message: parsed.data.message,
      link: "/admin/support",
      senderId: auth.ctx.userId,
    });

    if (!result.success) {
      throw new Error(result.error ?? "Gagal menyimpan pesan bantuan.");
    }

    return NextResponse.json({ success: true, delivered: result.delivered });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[support] Gagal mengirim pesan bantuan:", detail);
    return NextResponse.json({ success: false, error: detail }, { status: 500 });
  }
}
