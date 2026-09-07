// lib/support-config.ts
//
// Batas panjang pesan bantuan (/api/support).
//
// Dipisahkan dari lib/validations.ts karena berkas itu mengimpor `NextResponse`
// dari "next/server" — modul khusus server. Modal chat di Pengaturan adalah
// komponen "use client" dan harus menegakkan angka yang sama, jadi angkanya
// tinggal di sini, bebas dependensi, agar kedua sisi bisa membacanya.
//
// Saat keduanya sempat berbeda, pesan 1-9 karakter lolos pemeriksaan peramban
// lalu ditolak server dengan "Data tidak valid." tanpa menyebut sebabnya.

export const SUPPORT_MESSAGE_MIN = 10;
export const SUPPORT_MESSAGE_MAX = 1000;
