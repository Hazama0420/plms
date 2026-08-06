// app/api/invoices/[id]/print/route.ts
//
// Mengembalikan dokumen invoice siap cetak sebagai HTML. Peramban yang
// mengubahnya menjadi PDF lewat dialog cetak bawaan ("Save as PDF").
//
// Sebelumnya route ini bernama `/pdf` padahal isinya `text/html` — tidak pernah
// ada PDF yang dihasilkan, dan tidak ada satu pun pustaka PDF di proyek ini.
// Nama barunya jujur soal apa yang dikirimkan.
import { NextRequest, NextResponse } from "next/server";
import { generateInvoiceHTML } from "@/lib/templates/invoice-template";
import { getInvoiceIssuer } from "@/lib/invoice-config";
import { requireAuth } from "@/lib/api-auth";
import { resolveInvoiceAmount } from "@/types/invoice.types";
import fs from "fs/promises";
import path from "path";

/**
 * Logo di-cache setelah pembacaan pertama.
 *
 * Berkasnya ~95 KB dan tidak pernah berubah selama proses hidup, tetapi versi
 * lama membacanya dengan `fs.readFileSync` lalu mengubahnya ke base64 pada
 * SETIAP permintaan — memblokir event loop sekaligus mengulang kerja yang sama.
 * `null` berarti belum pernah dicoba; `""` berarti sudah dicoba dan tidak ada.
 */
let logoCache: string | null = null;

async function readLogoBase64(): Promise<string> {
  if (logoCache !== null) return logoCache;

  try {
    const logoPath = path.join(process.cwd(), "public", "logo-inland.png");
    const fileBuffer = await fs.readFile(logoPath);
    logoCache = `data:image/png;base64,${fileBuffer.toString("base64")}`;
  } catch {
    // Logo tidak wajib: dokumen tetap tercetak, hanya tanpa gambar di kop.
    logoCache = "";
  }

  return logoCache;
}

function formatTanggalPanjang(value?: string | null): string {
  const parsed = value ? new Date(value) : new Date();
  const safe = isNaN(parsed.getTime()) ? new Date() : parsed;

  return safe.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID Invoice tidak valid." }, { status: 400 });
    }

    let { data: inv, error } = await supabase
      .from("invoices")
      .select("*, property:properties(title, address)")
      .eq("id", id)
      .maybeSingle();

    if (error || !inv) {
      // Fallback kueri murni tabel invoices, untuk baris tanpa properti tertaut.
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

    const amount = resolveInvoiceAmount(inv);
    const logoBase64 = await readLogoBase64();

    // Alamat properti bisa berupa teks biasa atau objek relasi, tergantung baris
    // mana yang terbaca. Hanya bentuk string yang layak dicetak.
    const rawAddress = inv.property?.address;
    const itemAddress = typeof rawAddress === "string" ? rawAddress : null;

    const htmlContent = generateInvoiceHTML({
      invoice_number: inv.invoice_number || `INV/${id}`,
      formatted_date: formatTanggalPanjang(inv.issue_date || inv.created_at),
      due_date: inv.due_date ? formatTanggalPanjang(inv.due_date) : undefined,
      client_name: inv.client_name || "Klien Properti",
      // Deskripsi item TIDAK lagi mengambil `notes`. Versi lama memakainya,
      // sehingga memilih preset pembayaran menaruh kalimat "Transfer melalui
      // Bank BCA No. Rek..." di kolom KETERANGAN. Catatan kini punya bagiannya
      // sendiri di bawah tabel.
      items: [
        {
          description: inv.property?.title || "Transaksi / Sewa Properti",
          address: itemAddress,
          amount,
        },
      ],
      subtotal: amount,
      total: amount,
      notes: inv.notes || null,
      // Identitas penerbit datang dari satu sumber. Versi lama hanya mengirim 6
      // dari 14 field, sisanya jatuh ke literal yang tertanam di template.
      issuer: getInvoiceIssuer(),
      logo_base64: logoBase64 || undefined,
    });

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Dokumen memuat nama klien dan nominal: jangan disimpan proxy bersama.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Print Invoice Route Error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal memproses cetak invoice.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
