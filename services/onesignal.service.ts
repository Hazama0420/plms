// services/onesignal.service.ts
//
// @deprecated — pakai `@/lib/onesignal` secara langsung.
//
// Berkas ini dipertahankan hanya sebagai penerus. Isi aslinya rusak dan tidak
// pernah dipanggil siapa pun: ia menggabungkan `process.env.ONESIGNAL_REST_API_KEY`
// (hanya ada di server) dengan `window.location.origin` (hanya ada di peramban)
// di dalam satu fungsi, sehingga mustahil berjalan di mana pun. Penargetannya
// juga memakai `include_external_user_ids`, API SDK v15 yang diabaikan oleh
// aplikasi OneSignal berbasis SDK v16 seperti proyek ini.
//
// Berkas ini boleh dihapus begitu tidak ada lagi impor yang mengarah ke sini.

import { sendPushToUsers, type PushResult } from "@/lib/onesignal";

export const oneSignalService = {
  /** @deprecated Gunakan sendPushToUsers() dari "@/lib/onesignal". */
  async sendNotificationToUser({
    userId,
    title,
    message,
    url,
  }: {
    /** ID user Supabase — sama dengan External ID di OneSignal. */
    userId: string;
    title: string;
    message: string;
    url?: string;
  }): Promise<PushResult> {
    return sendPushToUsers([userId], { title, message, url });
  },
};

export { sendPushToUsers, sendPushToSegments } from "@/lib/onesignal";
