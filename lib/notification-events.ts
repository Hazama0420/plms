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
  | "lead"
  | "support";

/** Kunci di `users.preferences` yang dapat membungkam sebuah event. */
export type NotificationPrefKey =
  | "lead_alerts"
  | "property_updates"
  | "reminder_alerts"
  | "survey_alerts";

export type NotificationEventName =
  | "lead.created" // prospek baru masuk      → agen penanggung jawab
  | "lead.unassigned" // prospek tanpa agen      → semua admin
  | "lead.assigned" // lead dialihkan          → agen baru
  | "followup.created" // agenda follow-up dibuat → penanggung jawab
  | "followup.overdue" // agenda melewati waktu → penanggung jawab
  | "property.assigned" // listing ditugaskan      → agen baru
  | "property.status" // status listing berubah  → agen + pembuat listing
  | "survey.requested" // client ajukan survei    → agen properti
  | "survey.scheduled" // agen buat jadwal        → client pengaju
  | "survey.rejected" // pengajuan ditolak       → client pengaju
  | "survey.reminder" // T-1 jam sebelum survei  → agen + client
  | "support.request" // user minta bantuan     → semua admin
  | "account.registered" // agen baru mendaftar     → semua admin
  | "account.approved" // akun disetujui/aktif    → pemilik akun
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
  "followup.overdue": { uiType: "task", prefKey: "reminder_alerts" },
  "property.assigned": { uiType: "assignment", prefKey: "property_updates" },
  "property.status": { uiType: "property_update", prefKey: "property_updates" },

  // Prospek masuk tanpa agen penanggung jawab (M-18). Penerimanya seluruh admin,
  // bukan seorang agen — memang tidak ada agen untuk dikirimi.
  //
  // uiType "task", bukan "lead": ini bukan kabar bahwa ada prospek baru,
  // melainkan pekerjaan yang menunggu — seseorang harus menugaskannya.
  //
  // Tanpa prefKey, dengan alasan yang sama seperti support.request dan
  // account.registered di bawah: sakelar "lead_alerts" akan membuat satu admin
  // yang mematikannya kehilangan satu-satunya pemberitahuan yang ada untuk
  // keadaan ini, dan prospek yang tidak tertangani adalah calon pembeli yang
  // hilang tanpa jejak. Inilah tepatnya cacat yang M-18 tutup, jadi jangan
  // menyediakan kembali cara membungkamnya.
  "lead.unassigned": { uiType: "task", prefKey: null },

  // Alur survei. Pengajuan dan penolakan memakai "task" karena keduanya menuntut
  // tindakan penerimanya; konfirmasi jadwal memakai "reminder" agar tampil
  // dengan ikon jam bersama pengingat T-1 jam yang menyusul kemudian.
  "survey.requested": { uiType: "task", prefKey: "survey_alerts" },
  "survey.scheduled": { uiType: "reminder", prefKey: "survey_alerts" },
  "survey.rejected": { uiType: "task", prefKey: "survey_alerts" },
  // Sengaja memakai reminder_alerts, bukan survey_alerts: pengguna yang
  // mematikan "pengingat" memang bermaksud mematikan yang jenis ini.
  "survey.reminder": { uiType: "reminder", prefKey: "reminder_alerts" },

  // Pesan bantuan dari pengguna ke seluruh admin. Tanpa prefKey: admin tidak
  // boleh bisa membungkam permintaan bantuan lewat halaman Pengaturan — pesan
  // yang tidak sampai akan terlihat seperti fitur yang rusak bagi pengirimnya.
  "support.request": { uiType: "support", prefKey: null },

  // Alur akun. Keduanya tanpa prefKey dengan alasan yang sama seperti
  // support.request: admin tidak boleh membungkam antrean persetujuan, dan
  // pemilik akun harus tahu akunnya sudah aktif.
  "account.registered": { uiType: "task", prefKey: null },
  "account.approved": { uiType: "announcement", prefKey: null },

  // Pengumuman resmi admin sengaja tanpa prefKey: informasi kebijakan tidak
  // boleh bisa dibungkam lewat halaman Pengaturan.
  announcement: { uiType: "announcement", prefKey: null },
};
