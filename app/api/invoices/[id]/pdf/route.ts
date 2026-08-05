// app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateInvoiceHTML } from "@/lib/templates/invoice-template";
import { requireAuth } from "@/lib/api-auth";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Invoice memuat nama klien & nominal transaksi. Tanpa penjagaan ini,
    // siapa pun bisa menebak ID dan mengunduh invoice milik orang lain.
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { supabase } = auth.ctx;

    // 1. Resolve Next.js Async Params
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID Invoice tidak valid." }, { status: 400 });
    }

    // 2. Ambil Data Invoice Aktual dari Supabase
    let { data: inv, error } = await supabase
      .from("invoices")
      .select("*, property:properties(title, address)")
      .eq("id", id)
      .maybeSingle();

    if (error || !inv) {
      // Fallback kueri murni tabel invoices
      const fallback = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      inv = fallback.data;
    }

    if (!inv) {
      return NextResponse.json(
        { error: `Invoice dengan ID '${id}' tidak ditemukan di database.` },
        { status: 404 }
      );
    }

    // 3. Format Tanggal Terbit Otomatis & Paling Baru
    let formattedDate = "";
    const targetDateStr = inv.issue_date || inv.created_at;

    if (targetDateStr) {
      const dateObj = new Date(targetDateStr);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }

    // Jika tidak ada tanggal terbit, gunakan tanggal hari ini
    if (!formattedDate) {
      formattedDate = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    // 4. BACA LOGO DARI FOLDER public/logo-inland.png OTOMATIS
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "logo-inland.png");
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${fileBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn("Gagal membaca file logo dari folder public:", err);
    }

    // 5. Generate HTML dengan Data Asli & Sinkron
    const htmlContent = generateInvoiceHTML({
      invoice_number: inv.invoice_number || `INV/${id}`,
      formatted_date: formattedDate, // Tanggal terbaru Indonesia
      client_name: inv.client_name || "Klien Properti", // Nama Klien Asli
      item_title: inv.notes || inv.property?.title || "Transaksi / Sewa Properti",
      item_address: inv.property?.address || undefined,
      amount: Number(inv.total_amount || inv.amount || 0), // Nominal Rupiah Asli
      logo_base64: logoBase64, // Base64 Gambar Logo
    });

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("PDF Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses cetak invoice." },
      { status: 500 }
    );
  }
}