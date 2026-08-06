// lib/templates/invoice-template.ts
//
// Dokumen invoice siap cetak, dibangun sebagai HTML/CSS — bukan gambar latar.
// Teks tetap tajam pada resolusi cetak berapa pun, bisa diseleksi dan dicari,
// dan berkasnya tetap kecil.
//
// Empat masalah yang diperbaiki dari versi sebelumnya:
//
//   1. WARNA HILANG SAAT DICETAK. Dulu hanya ada `@page { size: A4 }` tanpa
//      `print-color-adjust: exact`, sehingga banner hijau, aksen emas, dan
//      baris abu rontok di Chrome kecuali pengguna mencentang "Background
//      graphics" secara manual. Ini bug visual terbesarnya.
//   2. TERKUNCI SATU HALAMAN. `.page-container` memakai `height: 297mm` dengan
//      `overflow: hidden` — isi yang lebih panjang terpotong diam-diam alih-alih
//      pindah ke halaman berikutnya.
//   3. TIDAK ADA ESCAPING. Nama klien dan catatan disisipkan mentah. Catatan
//      berasal dari form bebas DAN dari hasil OCR AI, jadi `<` merusak layout
//      dan `<img onerror=...>` benar-benar tereksekusi di tab cetak.
//   4. SATU BARIS HARDCODED. Tabel item tidak pernah punya `.map()`.
//
// Dokumen ini juga mencetak dirinya sendiri lewat `<script>` di bawah. Versi
// lama memasang `printWindow.onload` dari jendela pemanggil, yang untuk
// navigasi lintas-dokumen kerap tidak pernah menyala.

import type { InvoiceIssuer } from "@/lib/invoice-config";
import type { InvoiceLineItem } from "@/types/invoice.types";

/**
 * Palet merek, terpusat.
 *
 * Nilai-nilai ini dulu diulang belasan kali di seluruh blok CSS, sehingga
 * mengganti warna berarti mencari-ganti dan berharap tidak ada yang terlewat.
 */
const BRAND = {
  dark: "#0E2C24",
  gold: "#E2B23B",
  rowAlt: "#ECECEC",
  text: "#1a1a1a",
  textMuted: "#333333",
  textSoft: "#2b2b2b",
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
  logo_base64?: string;
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

  const itemRows = items
    .map((item, index) => {
      const zebra = index % 2 === 0 ? "row-alt" : "row-plain";
      const addressRow = item.address
        ? `<tr class="${zebra}">
             <td colspan="2" class="item-address">Alamat : ${escapeHtml(item.address)}</td>
           </tr>`
        : "";

      return `<tr class="${zebra}">
                <td class="item-title">${escapeHtml(item.description)}</td>
                <td class="item-price">${formatRupiah(item.amount)}</td>
              </tr>
              ${addressRow}`;
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
        /* Margin vertikal memberi ruang bagi halaman kedua dan seterusnya;
           versi lama memakai margin 0 dan mengandalkan padding absolut. */
        @page { size: A4; margin: 0; }

        /* Tanpa ini, seluruh warna latar rontok saat dicetak di Chrome:
           banner hijau jadi putih, baris abu jadi tak terlihat. */
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Helvetica Neue', Arial, sans-serif;
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

        .header-banner { width: 100%; height: 36mm; display: block; }
        .content { position: relative; z-index: 2; padding: 6mm 12mm 46mm 12mm; }

        .logo-container { position: absolute; top: 5mm; left: 12mm; z-index: 3; }
        .logo-img { max-height: 20mm; max-width: 68mm; object-fit: contain; }

        .meta-section { width: 100%; margin-bottom: 5mm; display: table; }
        .client-details {
          display: table-cell; width: 55%; vertical-align: top;
          font-size: 13pt; line-height: 1.5; color: ${BRAND.textSoft};
        }
        .client-address { font-size: 10.5pt; color: ${BRAND.textMuted}; line-height: 1.4; }
        .invoice-details { display: table-cell; width: 45%; vertical-align: top; text-align: right; }
        .invoice-title {
          font-size: 30pt; font-weight: 900; color: ${BRAND.dark};
          letter-spacing: 1px; margin: 0 0 1mm 0;
        }
        .invoice-meta-item { font-size: 11pt; color: ${BRAND.textMuted}; line-height: 1.4; }

        .divider { width: 100%; height: 2px; background-color: ${BRAND.dark}; margin: 3mm 0 4mm 0; }

        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }

        /* Header tabel ikut terulang di tiap halaman saat isi meluap. */
        .invoice-table thead { display: table-header-group; }
        .invoice-table tr { break-inside: avoid; page-break-inside: avoid; }

        .invoice-table th {
          background-color: ${BRAND.dark}; color: #ffffff; font-size: 12pt;
          font-weight: bold; padding: 3mm 4mm; text-transform: uppercase;
        }
        .invoice-table th.left { text-align: left; }
        .invoice-table th.right { text-align: right; }
        .invoice-table td { padding: 3mm 4mm; font-size: 11pt; vertical-align: top; }

        .row-alt { background-color: ${BRAND.rowAlt}; }
        .row-plain { background-color: #ffffff; }
        .item-title { font-size: 12pt; color: ${BRAND.text}; font-weight: bold; }
        .item-price { font-size: 12pt; color: ${BRAND.text}; font-weight: bold; text-align: right; }
        .item-address { font-size: 10.5pt; color: ${BRAND.textMuted}; line-height: 1.45; }

        .totals { width: 100%; margin-top: 4mm; text-align: right; }
        .total-row { font-size: 11pt; color: ${BRAND.textMuted}; margin-bottom: 1.5mm; }
        .total-row .label { display: inline-block; min-width: 40mm; }
        .total-row .value { display: inline-block; min-width: 40mm; font-weight: bold; color: ${BRAND.text}; }
        .grand-total {
          display: inline-block; border-top: 2px solid ${BRAND.dark};
          border-bottom: 2px solid ${BRAND.dark}; padding: 2mm 4mm;
          background-color: ${BRAND.rowAlt}; font-size: 11.5pt;
          font-weight: bold; color: ${BRAND.dark}; margin-top: 1mm;
        }
        .grand-total .label { margin-right: 7mm; color: ${BRAND.textMuted}; font-weight: normal; }

        .notes-section { margin-top: 6mm; font-size: 10.5pt; color: ${BRAND.textMuted}; line-height: 1.5; }
        .notes-title { font-weight: bold; color: ${BRAND.dark}; margin-bottom: 1mm; }

        .bottom-section { width: 100%; margin-top: 10mm; display: table; break-inside: avoid; }
        .payment-info { display: table-cell; width: 55%; vertical-align: top; font-size: 11pt; line-height: 1.6; }
        .payment-title { font-weight: bold; color: ${BRAND.dark}; text-decoration: underline; margin-bottom: 1mm; }
        .payment-bank { font-weight: bold; color: ${BRAND.dark}; font-size: 11.5pt; }
        .payment-an { font-weight: bold; color: ${BRAND.dark}; }

        .signature-section {
          display: table-cell; width: 45%; vertical-align: top;
          text-align: right; position: relative;
        }
        .director-title { font-size: 11pt; color: ${BRAND.textMuted}; margin-bottom: 15mm; }
        .director-name { font-size: 11pt; color: ${BRAND.textMuted}; font-weight: 500; }
        .watermark { position: absolute; right: 0; top: -4mm; opacity: 0.12; width: 45mm; }

        .footer { position: absolute; bottom: 0; left: 0; width: 100%; }
        .footer-banner { width: 100%; height: 33mm; display: block; }
        .footer-content {
          position: absolute; bottom: 3mm; left: 12mm; right: 12mm;
          color: #ffffff; font-size: 9pt; line-height: 1.7;
        }
        .footer-item { display: flex; align-items: center; gap: 2mm; margin-bottom: 0.5mm; }
        .footer-icon { width: 3.2mm; height: 3.2mm; flex-shrink: 0; fill: #ffffff; }

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
        <svg class="header-banner" viewBox="0 0 800 135" preserveAspectRatio="none">
            <polygon points="0,0 800,0 800,60 0,120" fill="${BRAND.dark}" />
            <polygon points="0,120 800,60 800,75 0,135" fill="${BRAND.gold}" />
        </svg>

        ${
          data.logo_base64
            ? `<div class="logo-container">
                 <img src="${data.logo_base64}" alt="${escapeHtml(issuer.company_name)}" class="logo-img" />
               </div>`
            : ""
        }

        <div class="content">
            <div class="meta-section">
                <div class="client-details">
                    Kepada yth.<br>
                    <strong>${escapeHtml(data.client_name) || "Klien Properti"}</strong>
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
                        <th class="right">UANG TANDA JADI / NOMINAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <div class="divider"></div>

            <div class="totals">
                ${
                  hasTax
                    ? `<div class="total-row">
                         <span class="label">Sub Total</span>
                         <span class="value">${formatRupiah(data.subtotal)}</span>
                       </div>
                       <div class="total-row">
                         <span class="label">PPN ${data.tax_rate}%</span>
                         <span class="value">${formatRupiah(data.tax_amount || 0)}</span>
                       </div>`
                    : ""
                }
                <div class="grand-total">
                    <span class="label">${hasTax ? "Total" : "Sub Total"}</span>
                    <span>${formatRupiah(data.total)}</span>
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
                    <svg class="watermark" viewBox="0 0 160 80">
                        <text x="20" y="35" font-family="Arial" font-weight="900" font-size="16"
                              fill="${BRAND.dark}" opacity="0.18">${escapeHtml(issuer.company_name)}</text>
                    </svg>
                    <div class="director-title">${escapeHtml(issuer.director_title)},</div>
                    <div class="director-name">(${escapeHtml(issuer.director_name)})</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <svg class="footer-banner" viewBox="0 0 800 125" preserveAspectRatio="none">
                <polygon points="0,0 800,25 800,38 0,13" fill="${BRAND.gold}" />
                <polygon points="0,13 800,38 800,125 0,125" fill="${BRAND.dark}" />
            </svg>

            <div class="footer-content">
                <div class="footer-item">
                    <svg class="footer-icon" viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>
                    <span>${escapeHtml(issuer.phone)}</span>
                </div>
                <div class="footer-item">
                    <svg class="footer-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    <span>${escapeHtml(issuer.email)}</span>
                </div>
                <div class="footer-item">
                    <svg class="footer-icon" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"/></svg>
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
