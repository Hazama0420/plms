// lib/notification-events.ts
//
// Katalog event notifikasi.
//
// Satu tempat yang memetakan *kejadian di aplikasi* ke dua hal yang selama ini
// gampang meleset:
//
//   1. Nilai kolom `notifications.type`. Sebelumnya pengirim bebas menulis
//      apa saja; `sendSystemNotification` memakai "property" padahal lonceng
//      (components/notification-bell.tsx) hanya punya ikon untuk
//      "property_update" — hasilnya notifikasi tampil dengan ikon jatuhan 📌
//      dan badge bertuliskan "property" mentah.
//
//   2. Sakelar di Pengaturan → Notifikasi yang mengendalikan event tersebut.
//      Pemeriksaan preferensi dulu ditulis manual per-cabang di helper, jadi
//      menambah event baru berarti gampang lupa menambah cabangnya.
//
// Menambah event baru = menambah satu baris di EVENT_SPECS. Kompiler yang akan
// memaksa `uiType` tetap salah satu kunci ikon yang benar-benar ada.

/** Kunci ikon & label yang dikenal components/notification-bell.tsx. */
export type NotificationUiType =
  | "task"
  | "reminder"
  | "announcement"
  | "assignment"
  | "property_update"
  | "lead";

/** Kunci di `users.preferences` yang dapat membungkam sebuah event. */
export type NotificationPrefKey =
  | "lead_alerts"
  | "property_updates"
  | "reminder_alerts";

export type NotificationEventName =
  | "lead.created" // prospek baru masuk      → agen penanggung jawab
  | "lead.assigned" // lead dialihkan          → agen baru
  | "followup.created" // agenda follow-up dibuat → penanggung jawab
  | "property.assigned" // listing ditugaskan      → agen baru
  | "property.status" // status listing berubah  → agen + pembuat listing
  | "announcement"; // siaran admin            → sesuai targetRole

export interface EventSpec {
  /** Nilai yang ditulis ke kolom `notifications.type`. */
  uiType: NotificationUiType;
  /**
   * Sakelar yang mematikan event ini.
   * null = tidak dapat dibungkam pengguna.
   */
  prefKey: NotificationPrefKey | null;
}

export const EVENT_SPECS: Record<NotificationEventName, EventSpec> = {
  "lead.created": { uiType: "lead", prefKey: "lead_alerts" },
  "lead.assigned": { uiType: "assignment", prefKey: "lead_alerts" },
  "followup.created": { uiType: "reminder", prefKey: "reminder_alerts" },
  "property.assigned": { uiType: "assignment", prefKey: "property_updates" },
  "property.status": { uiType: "property_update", prefKey: "property_updates" },
  // Pengumuman resmi admin sengaja tanpa prefKey: informasi kebijakan tidak
  // boleh bisa dibungkam lewat halaman Pengaturan.
  announcement: { uiType: "announcement", prefKey: null },
};
