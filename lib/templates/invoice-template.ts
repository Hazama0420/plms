// lib/templates/invoice-template.ts
//
// Dokumen invoice siap cetak, dibangun sebagai HTML/CSS — bukan gambar latar.
// Teks tetap tajam pada resolusi cetak berapa pun, bisa diseleksi dan dicari,
// dan berkasnya tetap kecil.
//
// GEOMETRI DIUKUR DARI DESAIN REFERENSI. Semua posisi di bawah diturunkan dari
// gambar acuan berukuran 1414 x 2000 px yang dipetakan ke A4 (210 x 297 mm),
// dengan faktor 1 px = 0,1485 mm. Angka-angka mm di CSS bukan tebakan.
//
// Empat masalah yang diperbaiki dari versi lama masih dipertahankan di sini:
//
//   1. WARNA HILANG SAAT DICETAK. Tanpa `print-color-adjust: exact`, banner
//      hijau, aksen emas, dan baris abu rontok di Chrome kecuali pengguna
//      mencentang "Background graphics" secara manual.
//   2. TERKUNCI SATU HALAMAN. `height: 297mm` + `overflow: hidden` memotong isi
//      yang lebih panjang diam-diam alih-alih memindahkannya ke halaman baru.
//   3. TIDAK ADA ESCAPING. Nama klien dan catatan disisipkan mentah. `notes`
//      berasal dari form bebas DAN dari hasil OCR AI, jadi `<img onerror=...>`
//      benar-benar tereksekusi di tab cetak.
//   4. SATU BARIS HARDCODED. Tabel item tidak pernah punya `.map()`.
//
// Dokumen ini mencetak dirinya sendiri lewat `<script>` di bawah. Memasang
// `printWindow.onload` dari jendela pemanggil tidak bisa diandalkan: untuk
// navigasi lintas-dokumen, handle itu diganti saat dokumen baru dimuat.

import type { InvoiceIssuer } from "@/lib/invoice-config";
import type { InvoiceLineItem } from "@/types/invoice.types";

/**
 * Palet merek, diambil dari desain referensi.
 *
 * Perhatikan ada DUA warna gelap yang berbeda, dan itu memang begitu di
 * desainnya: judul "INVOICE" serta bilah tabel memakai hijau tua, sementara
 * garis pemisah, "Sub Total", dan "Pembayaran :" memakai biru tua.
 */
const BRAND = {
  /** Hijau tua: banner atas/bawah, judul INVOICE, bilah kepala tabel. */
  dark: "#1B3A30",
  /** Emas: pita diagonal di banner atas dan bawah. */
  gold: "#E2B33C",
  /** Biru tua: garis pemisah, label Sub Total, judul Pembayaran. */
  navy: "#17384A",
  /** Abu baris tabel. */
  rowAlt: "#E9E9E9",
  text: "#1a1a1a",
  textMuted: "#333333",
} as const;

export interface InvoiceTemplateData {
  invoice_number: string;
  formatted_date: string;
  /** Tanggal jatuh tempo, sudah diformat. Tidak dirender bila kosong. */
  due_date?: string;
  client_name: string;
  client_address?: string | null;
  /** Baris tagihan. Minimal satu; template merender seluruhnya. */
  items: InvoiceLineItem[];
  subtotal: number;
  /** Persen pajak, mis. 11. Nol atau kosong berarti baris pajak tidak dirender. */
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  /** Identitas penerbit dari lib/invoice-config.ts. */
  issuer: InvoiceIssuer;
  /** Catatan bebas, dirender di bagian sendiri — bukan sebagai deskripsi item. */
  notes?: string | null;
}

/**
 * Meloloskan teks pengguna ke dalam HTML.
 *
 * Wajib untuk SETIAP nilai yang berasal dari basis data: nama klien, deskripsi
 * item, dan catatan semuanya teks bebas, dan `notes` bahkan bisa datang dari
 * keluaran OCR AI yang tidak pernah ditinjau manusia.
 */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format rupiah gaya invoice: `Rp. 15.000.000,-` */
function formatRupiah(val: number): string {
  return (
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    })
      .format(val || 0)
      .replace("Rp", "Rp. ") + ",-"
  );
}

export function generateInvoiceHTML(data: InvoiceTemplateData): string {
  const issuer = data.issuer;

  // Jaring pengaman: invoice tanpa baris item tetap harus tercetak sebagai
  // dokumen yang sah, bukan tabel kosong tanpa penjelasan.
  const items: InvoiceLineItem[] =
    data.items && data.items.length > 0
      ? data.items
      : [{ description: "Transaksi Properti", amount: data.total || 0 }];

  // Alamat masuk ke sel yang sama dengan deskripsi, bukan baris terpisah.
  // Di desain referensi keduanya berada dalam satu blok abu yang sama.
  const itemRows = items
    .map((item) => {
      const addressLine = item.address
        ? `<div class="item-address">Alamat : ${escapeHtml(item.address)}</div>`
        : "";

      return `<tr>
                <td class="item-cell">
                  <div class="item-title">${escapeHtml(item.description)}</div>
                  ${addressLine}
                </td>
                <td class="item-price">${formatRupiah(item.amount)}</td>
              </tr>`;
    })
    .join("");

  const hasTax = Boolean(data.tax_rate && data.tax_amount);

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice ${escapeHtml(data.invoice_number)}</title>
    <style>
        @page { size: A4; margin: 0; }

        /* Tanpa ini, seluruh warna latar rontok saat dicetak di Chrome:
           banner hijau jadi putih, baris abu jadi tak terlihat. */
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }

        /* Tanpa font web: memuat Google Fonts menunda render, dan pemicu cetak
           bisa menyala sebelum fontnya turun — hasil cetak bergeser tata letak.
           Tumpukan sistem ini deterministik di semua mesin cetak. */
        body {
          margin: 0;
          padding: 0;
          font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: ${BRAND.text};
          background: #f1f5f9;
        }

        /* min-height, bukan height: isi yang panjang pindah halaman alih-alih
           terpotong diam-diam. Aturan "overflow: hidden" juga dilepas — selain
           tidak lagi diperlukan (kotaknya ikut tumbuh), aturan itu membuat
           sebagian mesin cetak enggan memecah isi antar halaman. */
        .page-container {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
        }

        /* ---- BANNER ATAS ----
           Hijau: tepi bawahnya turun dari 10,5mm di kanan ke 51mm di kiri.
           Emas: pita sejajar di bawahnya, menebal ke arah kanan. */
        .header-banner { width: 100%; height: 57mm; display: block; }

        /* Padding bawah 48mm menyisakan ruang bagi banner kaki yang diposisikan
           absolut, sehingga isi tidak menabraknya di halaman terakhir. */
        .content { position: relative; z-index: 2; padding: 4mm 20mm 48mm 20mm; }

        /* ---- KEPALA: Kepada yth. + INVOICE ---- */
        .meta-section { width: 100%; display: table; margin-bottom: 12mm; }
        .client-details {
          display: table-cell; width: 52%; vertical-align: top;
          /* Menurunkan "Kepada yth." agar sebaris dengan "No:", bukan dengan
             judul INVOICE yang jauh lebih tinggi. */
          padding-top: 8mm;
          font-size: 13pt; line-height: 1.5; color: ${BRAND.text};
        }
        .client-name { font-weight: 700; }
        .client-address {
          font-size: 10pt; color: ${BRAND.textMuted};
          line-height: 1.4; margin-top: 1mm;
        }

        .invoice-details {
          display: table-cell; width: 48%; vertical-align: top; text-align: right;
        }
        .invoice-title {
          font-size: 30pt; font-weight: 800; color: ${BRAND.dark};
          letter-spacing: 0.5pt; line-height: 1; margin: 0 0 4mm 0;
        }
        .invoice-meta-item {
          font-size: 12pt; color: ${BRAND.text}; line-height: 1.5;
        }

        /* ---- GARIS PEMISAH ---- */
        .divider { width: 100%; height: 0.5mm; background-color: ${BRAND.navy}; }

        /* ---- TABEL ITEM ----
           border-spacing memberi jarak vertikal antar blok abu, persis seperti
           di desain: baris-barisnya berdiri sendiri, tidak menempel. */
        .invoice-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 5mm;
          margin-top: 1mm;
        }

        /* Kepala tabel ikut terulang di tiap halaman saat isi meluap. */
        .invoice-table thead { display: table-header-group; }
        .invoice-table tr { break-inside: avoid; page-break-inside: avoid; }

        .invoice-table th {
          background-color: ${BRAND.dark}; color: #ffffff;
          font-size: 14pt; font-weight: 700;
          padding: 6mm 5mm; text-transform: uppercase; letter-spacing: 0.3pt;
        }
        .invoice-table th.left { text-align: left; }
        .invoice-table th.right { text-align: right; }

        .item-cell, .item-price {
          background-color: ${BRAND.rowAlt};
          padding: 4mm 5mm; vertical-align: top;
        }
        .item-title { font-size: 12pt; color: ${BRAND.text}; font-weight: 700; }
        .item-address {
          font-size: 10pt; color: ${BRAND.textMuted};
          line-height: 1.45; margin-top: 1.5mm; font-weight: 400;
        }
        .item-price {
          font-size: 12pt; color: ${BRAND.text};
          font-weight: 700; text-align: right; white-space: nowrap;
        }

        /* ---- TOTAL ----
           Kotak abu selebar 76mm, rata kanan, dengan garis tebal di bawahnya. */
        .totals { margin-top: 6mm; }
        .totals-box { width: 76mm; margin-left: auto; }
        .totals-table { width: 100%; border-collapse: collapse; }
        .totals-table td { padding: 2mm 4mm; font-size: 12pt; }
        .t-tax td { color: ${BRAND.textMuted}; font-size: 11pt; padding-bottom: 0; }
        .t-main td { background-color: ${BRAND.rowAlt}; color: ${BRAND.navy}; }
        .t-label { text-align: left; }
        .t-value { text-align: right; font-weight: 700; white-space: nowrap; }
        .totals-underline {
          height: 0.5mm; background-color: ${BRAND.navy}; margin-top: 3mm;
        }

        /* ---- CATATAN ---- */
        .notes-section {
          margin-top: 8mm; font-size: 10.5pt;
          color: ${BRAND.textMuted}; line-height: 1.5;
        }
        .notes-title { font-weight: 700; color: ${BRAND.navy}; margin-bottom: 1mm; }

        /* ---- PEMBAYARAN + TANDA TANGAN ---- */
        .bottom-section {
          width: 100%; margin-top: 4mm; display: table; break-inside: avoid;
        }
        .payment-info {
          display: table-cell; width: 52%; vertical-align: top;
          font-size: 11pt; line-height: 1.6;
        }
        .payment-title {
          font-weight: 700; color: ${BRAND.navy};
          text-decoration: underline; font-size: 12pt; margin-bottom: 2mm;
        }
        .payment-bank { font-weight: 700; color: ${BRAND.navy}; font-size: 11.5pt; }
        .payment-an { font-weight: 700; color: ${BRAND.navy}; }

        .signature-section {
          display: table-cell; width: 48%; vertical-align: top; text-align: right;
        }
        /* 20mm ruang tanda tangan antara jabatan dan nama, sesuai desain. */
        .director-title { font-size: 11.5pt; color: ${BRAND.text}; margin-bottom: 20mm; }
        .director-name { font-size: 12pt; color: ${BRAND.text}; }

        /* ---- BANNER KAKI ----
           Cerminan vertikal dari banner atas: baji hijau tetap paling tebal di
           sisi kiri, dengan pita emas tipis di atasnya. */
        .footer { position: absolute; bottom: 0; left: 0; width: 100%; }
        .footer-banner { width: 100%; height: 60mm; display: block; }
        .footer-content {
          position: absolute; bottom: 11mm; left: 12mm; right: 12mm;
          color: #ffffff; font-size: 12pt; line-height: 1.55;
        }
        /* align-items: flex-start supaya alamat yang membungkus ke beberapa
           baris tetap rata dengan kolom teks, bukan menggantung di bawah ikon. */
        .footer-item {
          display: flex; align-items: flex-start; gap: 2.5mm; margin-bottom: 1mm;
        }
        .footer-icon {
          width: 4.2mm; height: 4.2mm; flex-shrink: 0;
          fill: #ffffff; margin-top: 0.8mm;
        }

        /* Kendali di layar. Jaring pengaman bila cetak otomatis tak menyala,
           dan tidak pernah ikut tercetak. */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 99;
          display: flex; gap: 8px; justify-content: center;
          padding: 10px; background: ${BRAND.dark};
        }
        .toolbar button {
          font-family: inherit; font-size: 13px; font-weight: 600;
          padding: 8px 18px; border-radius: 6px; border: 0; cursor: pointer;
        }
        .btn-print { background: ${BRAND.gold}; color: ${BRAND.dark}; }
        .btn-close { background: transparent; color: #ffffff; border: 1px solid rgba(255,255,255,0.4); }
        .toolbar-spacer { height: 52px; }

        @media print {
          body { background: #ffffff; }
          .no-print { display: none !important; }
          .page-container { margin: 0; width: auto; min-height: auto; }
        }
    </style>
</head>
<body>
    <div class="toolbar no-print">
      <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
      <button class="btn-close" onclick="window.close()">Tutup</button>
    </div>
    <div class="toolbar-spacer no-print"></div>

    <div class="page-container">
        <svg class="header-banner" viewBox="0 0 800 190" preserveAspectRatio="none">
            <polygon points="0,0 800,0 800,35 0,170" fill="${BRAND.dark}" />
            <polygon points="0,170 800,35 800,75 0,190" fill="${BRAND.gold}" />
        </svg>

        <div class="content">
            <div class="meta-section">
                <div class="client-details">
                    Kepada yth.<br>
                    <span class="client-name">${escapeHtml(data.client_name) || "Klien Properti"}</span>
                    ${
                      data.client_address
                        ? `<div class="client-address">${escapeHtml(data.client_address)}</div>`
                        : ""
                    }
                </div>
                <div class="invoice-details">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta-item">No: ${escapeHtml(data.invoice_number)}</div>
                    <div class="invoice-meta-item">${escapeHtml(data.formatted_date)}</div>
                    ${
                      data.due_date
                        ? `<div class="invoice-meta-item">Jatuh tempo: ${escapeHtml(data.due_date)}</div>`
                        : ""
                    }
                </div>
            </div>

            <div class="divider"></div>

            <table class="invoice-table">
                <thead>
                    <tr>
                        <th class="left">KETERANGAN</th>
                        <th class="right">UANG TANDA JADI</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <div class="divider"></div>

            <div class="totals">
                <div class="totals-box">
                    <table class="totals-table">
                        ${
                          hasTax
                            ? `<tr class="t-tax">
                                 <td class="t-label">Sub Total</td>
                                 <td class="t-value">${formatRupiah(data.subtotal)}</td>
                               </tr>
                               <tr class="t-tax">
                                 <td class="t-label">PPN ${data.tax_rate}%</td>
                                 <td class="t-value">${formatRupiah(data.tax_amount || 0)}</td>
                               </tr>`
                            : ""
                        }
                        <tr class="t-main">
                            <td class="t-label">${hasTax ? "Total" : "Sub Total"}</td>
                            <td class="t-value">${formatRupiah(data.total)}</td>
                        </tr>
                    </table>
                    <div class="totals-underline"></div>
                </div>
            </div>

            ${
              data.notes
                ? `<div class="notes-section">
                     <div class="notes-title">Catatan :</div>
                     <div>${escapeHtml(data.notes)}</div>
                   </div>`
                : ""
            }

            <div class="bottom-section">
                <div class="payment-info">
                    <div class="payment-title">Pembayaran :</div>
                    <div class="payment-bank">${escapeHtml(issuer.bank_name)} ${escapeHtml(issuer.bank_account)}</div>
                    <div class="payment-an">a/n. ${escapeHtml(issuer.bank_holder)}</div>
                </div>

                <div class="signature-section">
                    <div class="director-title">${escapeHtml(issuer.director_title)},</div>
                    <div class="director-name">(${escapeHtml(issuer.director_name)})</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <svg class="footer-banner" viewBox="0 0 800 200" preserveAspectRatio="none">
                <polygon points="0,2 800,127 800,167 0,22" fill="${BRAND.gold}" />
                <polygon points="0,22 800,167 800,200 0,200" fill="${BRAND.dark}" />
            </svg>

            <div class="footer-content">
                <div class="footer-item">
                    <svg class="footer-icon" viewBox="0 0 24 24"><path d="M12 1.5A10.5 10.5 0 1 0 22.5 12 10.51 10.51 0 0 0 12 1.5zm0 1.6a8.9 8.9 0 1 1-8.9 8.9A8.91 8.91 0 0 1 12 3.1zm-3.1 3.6a1 1 0 0 0-1 1 8.5 8.5 0 0 0 8.5 8.5 1 1 0 0 0 1-1v-1.7a1 1 0 0 0-1-1 6.8 6.8 0 0 1-1.8-.3.9.9 0 0 0-.9.2l-1 1a9.4 9.4 0 0 1-3.2-3.2l1-1a.9.9 0 0 0 .2-.9 6.8 6.8 0 0 1-.3-1.8 1 1 0 0 0-1-1z"/></svg>
                    <span>${escapeHtml(issuer.phone)}</span>
                </div>
                <div class="footer-item">
                    <svg class="footer-icon" viewBox="0 0 24 24"><path d="M12 1.5A10.5 10.5 0 1 0 22.5 12 10.51 10.51 0 0 0 12 1.5zm0 1.6a8.9 8.9 0 1 1-8.9 8.9A8.91 8.91 0 0 1 12 3.1zM7 8.2h10a.8.8 0 0 1 .8.8v6a.8.8 0 0 1-.8.8H7a.8.8 0 0 1-.8-.8V9a.8.8 0 0 1 .8-.8zm.6 1.6L12 12.6l4.4-2.8z"/></svg>
                    <span>${escapeHtml(issuer.email)}</span>
                </div>
                <div class="footer-item">
                    <svg class="footer-icon" viewBox="0 0 24 24"><path d="M12 1.5A10.5 10.5 0 1 0 22.5 12 10.51 10.51 0 0 0 12 1.5zm0 1.6a8.9 8.9 0 1 1-8.9 8.9A8.91 8.91 0 0 1 12 3.1zm0 2.7a4.2 4.2 0 0 0-4.2 4.2c0 3.1 4.2 7.7 4.2 7.7s4.2-4.6 4.2-7.7A4.2 4.2 0 0 0 12 5.8zm0 2.7a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 12 8.5z"/></svg>
                    <span>${escapeHtml(issuer.address)}</span>
                </div>
            </div>
        </div>
    </div>

    <script>
      // Dokumen mencetak dirinya sendiri. Versi lama memasang onload dari
      // jendela pemanggil, dan untuk navigasi lintas-dokumen handle itu diganti
      // saat dokumen baru dimuat — sehingga dialog cetak kerap tak pernah muncul.
      window.addEventListener("load", function () {
        window.setTimeout(function () { window.print(); }, 250);
      });
    </script>
</body>
</html>`;
}
