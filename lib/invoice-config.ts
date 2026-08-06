// lib/invoice-config.ts
//
// Identitas perusahaan yang tercetak di kop dan kaki invoice.
//
// SENGAJA TERPISAH dari `lib/site-config.ts`. Berkas itu memasok halaman publik
// (footer, halaman legal) yang boleh dilihat siapa saja; berkas ini memasok
// dokumen yang hanya dikirim ke klien bernama. Menggabungkannya akan membuat
// nomor telepon kantor dan alamat operasional ikut terbit ke halaman publik.
//
// Semua nilai bisa ditimpa lewat .env tanpa menyentuh kode, sehingga cabang
// atau badan usaha lain tidak perlu template sendiri.

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

export interface InvoiceIssuer {
  company_name: string;
  phone: string;
  email: string;
  address: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  director_name: string;
  director_title: string;
}

/**
 * Dibaca saat modul dimuat. Aman untuk route server; jangan diimpor dari
 * komponen klien — pratinjau di sisi peramban memakai `PREVIEW_ISSUER`.
 */
export function getInvoiceIssuer(): InvoiceIssuer {
  return {
    company_name: env("INVOICE_COMPANY_NAME", "PT Kaya Dari Properti"),
    phone: env("INVOICE_PHONE", "0813 88 805 58"),
    email: env("INVOICE_EMAIL", "ptkayadariproperti@gmail.com"),
    address: env(
      "INVOICE_ADDRESS",
      "Jl. Hartono Raya blok R No: 36, Modernland. RT003/RW01 Kel. Kelapa Indah, Kec./Kota Tangerang, Banten 15117"
    ),
    bank_name: env("INVOICE_BANK_NAME", "BCA"),
    bank_account: env("INVOICE_BANK_ACCOUNT", "658-090-9971"),
    bank_holder: env("INVOICE_BANK_HOLDER", "PT Kaya Dari Properti"),
    director_name: env("INVOICE_DIRECTOR_NAME", "Joan Setiadi"),
    director_title: env("INVOICE_DIRECTOR_TITLE", "Direktur"),
  };
}
