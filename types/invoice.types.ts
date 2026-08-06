// types/invoice.types.ts
//
// Bentuk data invoice, satu sumber untuk seluruh aplikasi.
//
// Sebelumnya interface ini ada di tiga tempat dengan bentuk yang berbeda-beda:
// halaman daftar memakai field opsional dan `property?: { title, listing_code }`,
// halaman detail memakai `null` dan `property?: { id, title }`, sedangkan
// template cetak punya DTO-nya sendiri. Ketiganya membaca tabel yang sama,
// sehingga satu kolom baru berarti tiga suntingan yang mudah terlewat.

/**
 * Status invoice. Sengaja union, bukan `string`: halaman daftar dulu memakai
 * `| string` sehingga typo seperti "payed" lolos pemeriksaan tipe dan baru
 * terlihat sebagai badge kosong di layar.
 */
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

/**
 * Properti terkait, sebagaimana di-embed PostgREST lewat
 * `property:properties(id, title, listing_code, address)`.
 *
 * Semua field selain `id` opsional karena tiap pemanggil memilih kolom yang
 * berbeda — halaman daftar tidak butuh `address`, route cetak justru butuh.
 */
export interface InvoiceProperty {
  id?: string;
  title?: string | null;
  listing_code?: string | null;
  address?: string | null;
}

/**
 * Satu baris tagihan di dokumen cetak.
 *
 * Basis data belum punya tabel baris invoice — satu invoice masih satu nominal.
 * Tipe ini dipakai template sebagai repeater supaya menambah tabel baris nanti
 * tidak perlu menyentuh layout cetaknya lagi.
 */
export interface InvoiceLineItem {
  description: string;
  address?: string | null;
  qty?: number | null;
  unit_price?: number | null;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  property_id?: string | null;
  /** Nominal kanonik. Baca lewat `resolveInvoiceAmount`, jangan langsung. */
  total_amount?: number | null;
  /** Kolom lama yang masih terisi di baris-baris awal. Lihat catatan di bawah. */
  amount?: number | null;
  status: InvoiceStatus | string;
  due_date?: string | null;
  issue_date?: string | null;
  paid_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  property?: InvoiceProperty | null;
}

/**
 * Membaca nominal invoice dari dua kolom yang sama-sama masih ada.
 *
 * Tabel `invoices` punya `total_amount` dan `amount`: baris lama mengisi
 * `amount`, form buat sekarang menulis `total_amount`. Selama keduanya hidup,
 * setiap pembaca harus mencoba dua-duanya — dan itu dulu ditulis ulang secara
 * terpisah di tiga berkas, dengan `||` yang membuat nominal 0 yang sah jatuh ke
 * cabang berikutnya. `??` di sini menghormati 0.
 *
 * Ketika seluruh baris sudah dimigrasi ke `total_amount`, cukup satu fungsi ini
 * yang perlu disederhanakan.
 */
export function resolveInvoiceAmount(
  inv: Pick<Invoice, "total_amount" | "amount"> | null | undefined
): number {
  const value = inv?.total_amount ?? inv?.amount ?? 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
