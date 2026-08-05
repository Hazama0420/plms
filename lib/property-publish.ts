// lib/property-publish.ts
//
// Aturan tunggal: sebuah listing hanya boleh terbit bila sudah punya agen
// penanggung jawab. Bila belum, statusnya otomatis turun ke draf.
//
// Ditaruh di lib/ dan dibuat murni (tanpa I/O, tanpa impor Supabase) supaya bisa
// dipakai bersama oleh route handler di sisi server maupun komponen klien —
// jalur pembuatan listing tersebar di keduanya.

/** Satu-satunya status yang membuat listing terlihat oleh tamu dan viewer. */
export const PUBLIC_STATUS = "published";

/**
 * Pesan yang ditampilkan saat sebuah permintaan publikasi diturunkan menjadi
 * draf. Diekspor agar teksnya sama persis di respons API dan di toast.
 */
export const NO_AGENT_MESSAGE =
  "Listing belum punya agen penanggung jawab, jadi disimpan sebagai draf. Tugaskan agen lalu publikasikan kembali.";

/** Status yang mensyaratkan adanya agen penanggung jawab. */
export function requiresAgent(status?: string | null): boolean {
  return status === PUBLIC_STATUS;
}

/**
 * Menurunkan `published` menjadi `draft` bila `assignedTo` kosong.
 *
 * Status lain (draft, review, sold, rented, archived) dilewatkan apa adanya:
 * hanya `published` yang membuat listing terlihat publik, dan hanya itu yang
 * dijaga oleh filter tamu/viewer. Menurunkan `sold` atau `archived` justru akan
 * merusak riwayat listing lama yang penanggung jawabnya sudah keluar.
 *
 * @returns `downgraded` bernilai true hanya bila status benar-benar berubah,
 * sehingga pemanggil bisa memberi tahu pengguna alih-alih diam-diam mengubah
 * pilihannya.
 */
export function resolvePublishStatus(
  status: string | null | undefined,
  assignedTo: string | null | undefined
): { status: string; downgraded: boolean } {
  const requested = status || "draft";
  const hasAgent = Boolean(assignedTo && String(assignedTo).trim() !== "");

  if (requiresAgent(requested) && !hasAgent) {
    return { status: "draft", downgraded: true };
  }

  return { status: requested, downgraded: false };
}
