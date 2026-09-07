// lib/activity-display.ts
//
// Helper tampilan yang dipakai bersama oleh tab "Aktivitas CRM" dan tab
// "Aksi Admin" di /admin/logs. Sebelumnya privat di halaman logs; dipindah ke
// sini agar tab kedua memakai pengelompokan tanggal yang sama alih-alih
// menyalinnya.

import { format, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Judul kelompok tanggal untuk timeline.
 * Log hari ini dan kemarin diberi label relatif; sisanya tanggal penuh.
 */
export function dateGroupLabel(dateStr: string): string {
  if (!dateStr) return "Tanpa Tanggal";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Tanpa Tanggal";
  if (isToday(date)) return "Hari ini";
  if (isYesterday(date)) return "Kemarin";
  return format(date, "EEEE, dd MMMM yyyy", { locale: id });
}

/**
 * Mengelompokkan daftar yang SUDAH terurut menurut waktu ke dalam blok tanggal.
 *
 * Mengandalkan urutan masukan, bukan mengurutkan ulang: kedua pemanggil sudah
 * meminta `order("created_at", { ascending: false })` dari database, dan
 * mengurutkan lagi di klien hanya akan menyembunyikan bila urutan itu berubah.
 */
export function groupByDate<T extends { created_at: string }>(
  items: T[]
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];

  items.forEach((item) => {
    const label = dateGroupLabel(item.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  });

  return groups;
}
