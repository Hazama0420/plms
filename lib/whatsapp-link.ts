// lib/whatsapp-link.ts

/**
 * Helper untuk membuka WhatsApp dengan pesan awal.
 *
 * Fungsi ini sebelumnya ada di beberapa tempat sebagai `openWhatsApp` lokal:
 * - app/(dashboard)/surveys/page.tsx:425-436
 * - app/(dashboard)/settings/page.tsx:679-682
 * - Beberapa halaman CRM
 *
 * Dipindah ke sini supaya tidak disalin ulang setiap kali diperlukan.
 */

/**
 * Membersihkan nomor telepon untuk format WhatsApp.
 *
 * @param phone - Nomor telepon mentah (08xx, +62xx, atau dengan spasi/tanda)
 * @returns Nomor bersih dengan awalan 62, atau null bila tidak valid
 *
 * @example
 * ```ts
 * normalizeWhatsAppNumber("081234567890")  // "6281234567890"
 * normalizeWhatsAppNumber("+62 812-3456")  // "62812345"
 * normalizeWhatsAppNumber("---")           // null
 * ```
 */
export function normalizeWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;

  // Bersihkan semua karakter selain angka, lalu ganti awalan 0 dengan 62
  const clean = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");

  // Nomor yang isinya hanya tanda baca akan jadi string kosong di sini
  return clean.length >= 8 ? clean : null;
}

/**
 * Membuka WhatsApp Web/App dengan nomor dan pesan awal.
 *
 * @param phone - Nomor telepon (08xx atau +62xx, akan dibersihkan otomatis)
 * @param text - Pesan awal (opsional)
 * @returns true bila berhasil dibuka, false bila nomor tidak ada
 *
 * @example
 * ```ts
 * openWhatsApp("081234567890", "Halo, mengenai properti INL-001...");
 * openWhatsApp("+62 812-3456-7890"); // spasi dan tanda hubung dibersihkan
 * ```
 */
export function openWhatsApp(phone?: string | null, text?: string): boolean {
  const cleanPhone = normalizeWhatsAppNumber(phone);

  // Nomor yang isinya hanya tanda baca ikut tersaring di sini: tanpa
  // pemeriksaan ini wa.me akan dibuka tanpa tujuan dan tampak seperti berhasil.
  if (!cleanPhone) return false;

  const url = `https://wa.me/${cleanPhone}${
    text ? `?text=${encodeURIComponent(text)}` : ""
  }`;

  window.open(url, "_blank");
  return true;
}
