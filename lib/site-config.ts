// lib/site-config.ts
//
// Satu sumber kebenaran untuk identitas situs dan tautan dokumen legal.
// Dipakai bersama oleh SiteFooter, halaman /legal/*, dan kartu halaman auth
// supaya nomor hotline dan daftar tautan tidak disalin ulang di banyak berkas.

import { normalizeWhatsAppNumber } from "@/lib/whatsapp-link";

export const SITE = {
  name: "Inland Property",
  tagline: "Property Listing & CRM Management System",
  /** Hotline resmi. Ditulis dalam format lokal supaya enak dibaca manusia. */
  whatsapp: "0851 9969 5550",
  copyrightYear: 2026,
  /** Tanggal berlaku dokumen legal — perbarui bila isinya diubah. */
  lastUpdated: "Agustus 2026",
} as const;

/**
 * Tautan wa.me sudah jadi, dibangun sekali di level modul.
 *
 * Sengaja tidak memakai `openWhatsApp()` dari lib/whatsapp-link.ts: helper itu
 * memanggil window.open sehingga menuntut event handler, dan itu akan memaksa
 * SiteFooter menjadi client component tanpa manfaat apa pun. Dengan href biasa
 * footer tetap bisa dirender sebagai markup statis.
 */
export const WHATSAPP_HREF = `https://wa.me/${normalizeWhatsAppNumber(
  SITE.whatsapp
)}`;

export type LegalLink = {
  label: string;
  href: string;
  /** Ringkasan singkat, dipakai di kartu daftar dokumen antar-halaman legal. */
  description: string;
};

export const LEGAL_LINKS: readonly LegalLink[] = [
  {
    label: "Syarat dan Ketentuan",
    href: "/legal/syarat-ketentuan",
    description:
      "Aturan penggunaan platform Inland Property bagi pengunjung maupun pengguna terdaftar.",
  },
  {
    label: "Pengecualian Tanggung Jawab",
    href: "/legal/pengecualian-tanggung-jawab",
    description:
      "Batasan tanggung jawab atas informasi listing, simulasi KPR, dan peringatan pembayaran.",
  },
  {
    label: "Kebijakan Privasi",
    href: "/legal/kebijakan-privasi",
    description:
      "Cara kami mengumpulkan, memakai, melindungi, dan menghapus data pribadi Anda.",
  },
  {
    label: "Pemberitahuan Hak Cipta",
    href: "/legal/pemberitahuan-hak-cipta",
    description:
      "Kepemilikan konten, merek dagang, serta prosedur pengaduan pelanggaran hak cipta.",
  },
] as const;
