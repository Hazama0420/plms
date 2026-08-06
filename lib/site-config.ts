// lib/site-config.ts
//
// Satu sumber kebenaran untuk identitas situs dan tautan dokumen legal.
// Dipakai bersama oleh SiteFooter, halaman /legal/*, dan kartu halaman auth
// supaya nomor hotline dan daftar tautan tidak disalin ulang di banyak berkas.

import { normalizeWhatsAppNumber } from "@/lib/whatsapp-link";

export const SITE = {
  name: "Inland Property",
  tagline: "Property Listing & CRM Management System",
  /**
   * Origin kanonik situs, dipakai sebagai `metadataBase`, dasar sitemap, dan
   * canonical URL di setiap halaman publik.
   *
   * Nilainya WAJIB absolut, menyertakan skema, dan tanpa garis miring penutup —
   * `new URL()` di app/layout.tsx melempar bila formatnya keliru, dan itu
   * menggagalkan seluruh build. Fallback localhost hanya untuk pengembangan;
   * saat deploy isi NEXT_PUBLIC_SITE_URL dengan domain sungguhan.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /**
   * Deskripsi baku untuk hasil pencarian dan kartu berbagi, dipakai bila
   * halaman tidak punya deskripsi sendiri. Ditulis untuk manusia, bukan untuk
   * menumpuk kata kunci: mesin pencari menampilkan kalimat ini apa adanya.
   */
  description:
    "Temukan rumah, apartemen, tanah, ruko, dan properti komersial di Indonesia. " +
    "Listing terverifikasi, simulasi KPR, dan pendampingan agen profesional.",
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

/**
 * Field Open Graph yang sama untuk seluruh halaman.
 *
 * Wajib disebar (`...OG_BASE`) di setiap metadata yang menulis `openGraph`
 * sendiri. Penggabungan metadata di Next bersifat dangkal: begitu sebuah
 * segmen mendefinisikan `openGraph`, SELURUH objek openGraph milik induknya
 * dibuang — bukan digabung field per field. Tanpa penyebaran ini, halaman
 * properti akan kehilangan `og:site_name` dan `og:locale` yang dipasang di
 * app/layout.tsx. Dokumen Next menganjurkan persis pola variabel bersama ini
 * (generate-metadata.md, bagian "Overwriting fields").
 */
export const OG_BASE = {
  siteName: SITE.name,
  locale: "id_ID",
} as const;

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
