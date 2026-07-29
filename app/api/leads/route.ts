// app/api/leads/route.ts
import { NextResponse } from "next/server";
import { sendSystemNotification } from "@/lib/notification-helper";
import { supabase } from "@/lib/supabase/client"; // Atau helper supabase server Anda

export async function POST(req: Request) {
  try {
    // 🔒 1. CEK AUTH & BLOKIR JIKA ROLE ADALAH REVIEWER
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Anda harus login terlebih dahulu." },
        { status: 401 }
      );
    }

    // Ambil data role user dari database/metadata
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();

    // 🛑 REVIEWER DILARANG MENAMBAH LEAD
    if (role === "viewer" || role === "reviewer") {
      return NextResponse.json(
        { error: "Reviewer tidak memiliki izin untuk menambahkan lead baru." },
        { status: 403 }
      );
    }

    // 2. Parse payload request
    const body = await req.json();
    const { name, phone, property_id } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama calon pembeli wajib diisi." }, { status: 400 });
    }

    // 3. Simpan lead baru ke tabel 'leads'
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({ name, phone, property_id })
      .select("*, properties(title, user_id)") // Relasi ke properti & pemiliknya
      .single();

    if (leadError) throw leadError;

    // 4. Ambil ID agen pemilik properti secara NYATA
    const ownerAgentId = newLead.properties?.user_id; 
    const propertyTitle = newLead.properties?.title || "Properti Anda";

    // 5. Kirim notifikasi otomatis ke agen pemilik properti
    if (ownerAgentId) {
      await sendSystemNotification({
        userId: ownerAgentId,
        title: "🔥 Calon Pembeli Baru (Lead)!",
        message: `${name} tertarik dengan listing ${propertyTitle}. Segera hubungi!`,
        type: "lead",
        link: `/crm`,
      });
    }

    return NextResponse.json({ success: true, data: newLead });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: error.message || "Gagal menyimpan lead" }, { status: 500 });
  }
}