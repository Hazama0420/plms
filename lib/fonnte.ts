// lib/fonnte.ts
import { createAdminClient } from "@/lib/supabase/admin";

interface SendWaParams {
  agentId: string;
  // Ketiga field ini opsional: penyusun pesan di bawah sudah menyiapkan teks
  // penggantinya sendiri ("Tanpa Nama", "-", "Properti Pilihan"), dan pemanggil
  // kerap meneruskan nilai yang bisa kosong dari basis data.
  leadName?: string;
  clientPhone?: string;
  propertyInterest?: string;
}

export async function sendWaToAgent({
  agentId,
  leadName,
  clientPhone,
  propertyInterest,
}: SendWaParams) {
  if (!agentId) {
    return { success: false, reason: "agentId tidak boleh kosong" };
  }

  const supabase = createAdminClient();

  // 1. Ambil nomor HP agen dari tabel users
  const { data: agentData, error: agentErr } = await supabase
    .from("users")
    .select("phone, full_name, preferences")
    .eq("id", agentId)
    .maybeSingle();

  if (agentErr || !agentData || !agentData.phone) {
    console.error(`[Fonnte Error] Nomor HP agen tidak ditemukan untuk ID: ${agentId}`);
    return { success: false, reason: "Nomor HP agen tidak ditemukan di database" };
  }

  // 2. Hormati sakelar "Notifikasi WhatsApp Gateway" di halaman Pengaturan.
  //
  // Sebelumnya berkas ini tidak pernah membaca preferences sama sekali, jadi
  // mematikan sakelar itu tidak berpengaruh apa pun — pesan tetap terkirim dan
  // tetap memotong kuota Fonnte. Diperiksa `=== false` agar akun yang belum
  // pernah menyimpan preferensi tetap menerima pesan seperti semula.
  const prefs = (agentData.preferences ?? {}) as Record<string, unknown>;
  if (prefs.whatsapp_notifications === false) {
    return {
      success: false,
      reason: "Agen menonaktifkan notifikasi WhatsApp di halaman Pengaturan",
      skipped: true,
    };
  }

  // 3. Format nomor HP agen (ubah awalan 0 menjadi 62)
  const cleanPhone = agentData.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");

  // 4. Susun Teks Pesan WhatsApp
  const message = `🔔 *INFO PROSPEK BARU - INLAND PROPERTY*\n\nHalo Kak *${agentData.full_name}*,\nAda leads/prospek baru yang telah ditugaskan kepada Anda:\n\n👤 Nama Klien: *${leadName || "Tanpa Nama"}*\n📞 No HP Klien: ${clientPhone || "-"}\n🏠 Minat Properti: *${propertyInterest || "Properti Pilihan"}*\n\nSegera buka dashboard CRM Inland Property untuk melakukan follow-up sekarang!`;

  // 5. Kirim ke Fonnte WhatsApp Gateway
  const fonnteToken = process.env.FONNTE_TOKEN || "";
  if (!fonnteToken) {
    console.error("[Fonnte Error] FONNTE_TOKEN tidak ditemukan di .env.local");
    return { success: false, reason: "FONNTE_TOKEN belum diisi" };
  }

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: fonnteToken,
    },
    body: new URLSearchParams({
      target: cleanPhone,
      message: message,
    }),
  });

  const result = await response.json();
  console.log("[Fonnte Response Status]:", result);

  return { success: response.ok && result.status, result };
}

export interface FollowupDigestPriorityItem {
  contactName: string;
  interestType?: string | null;
  scheduledTimeStr: string;
  isOverdue?: boolean;
}

export interface SendFollowupDigestParams {
  agentId: string;
  agentName?: string;
  agentPhone?: string;
  agentPreferences?: Record<string, unknown>;
  dateFormattedWib: string;
  dueTodayCount: number;
  overdueCount: number;
  priorityItems?: FollowupDigestPriorityItem[];
}

/**
 * Mengirim pesan Daily Digest Agenda Follow-Up ke agen via WhatsApp (Fonnte).
 * Menghormati preferensi `whatsapp_notifications !== false`.
 */
export async function sendFollowupDigestWa({
  agentId,
  agentName,
  agentPhone,
  agentPreferences,
  dateFormattedWib,
  dueTodayCount,
  overdueCount,
  priorityItems = [],
}: SendFollowupDigestParams) {
  if (!agentId) {
    return { success: false, reason: "agentId tidak boleh kosong" };
  }

  let phone = agentPhone;
  let fullName = agentName;
  let prefs = agentPreferences;

  // Jika data agen belum disertakan pemanggil, ambil dari tabel users
  if (!phone || !fullName || !prefs) {
    const supabase = createAdminClient();
    const { data: agentData, error: agentErr } = await supabase
      .from("users")
      .select("phone, full_name, preferences")
      .eq("id", agentId)
      .maybeSingle();

    if (agentErr || !agentData || !agentData.phone) {
      console.error(`[Fonnte Error] Nomor HP agen tidak ditemukan untuk ID: ${agentId}`);
      return { success: false, reason: "Nomor HP agen tidak ditemukan di database" };
    }

    phone = agentData.phone;
    fullName = agentData.full_name || "Agen";
    prefs = (agentData.preferences ?? {}) as Record<string, unknown>;
  }

  // Periksa preferensi notifikasi WhatsApp pengguna
  if (prefs?.whatsapp_notifications === false) {
    return {
      success: false,
      reason: "Agen menonaktifkan notifikasi WhatsApp di halaman Pengaturan",
      skipped: true,
    };
  }

  if (!phone) {
    return { success: false, reason: "Nomor HP agen tidak ditemukan" };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, reason: "Nomor HP agen tidak valid" };
  }

  // Susun daftar prioritas singkat (max 5)
  let priorityListText = "";
  if (priorityItems && priorityItems.length > 0) {
    priorityListText = "\n\n*Agenda Prioritas:*\n" + priorityItems
      .slice(0, 5)
      .map((item, idx) => {
        const tag = item.isOverdue ? " ⚠️ _(Overdue)_" : "";
        const interest = item.interestType ? ` • ${item.interestType}` : "";
        return `${idx + 1}. *${item.contactName}*${interest}\n   ⏰ ${item.scheduledTimeStr}${tag}`;
      })
      .join("\n");
  }

  const message = `📋 *PENGINGAT AGENDA CRM — INLAND PROPERTY*\n\nHalo Kak *${fullName}*,\nBerikut ringkasan agenda follow-up Anda untuk hari ini (${dateFormattedWib}):\n\n📌 *Jatuh Tempo Hari Ini:* ${dueTodayCount} agenda\n⚠️ *Terlambat / Overdue:* ${overdueCount} agenda${priorityListText}\n\nSilakan buka dashboard CRM untuk menindaklanjuti:\n🔗 https://inlandproperty.com/crm/followups`;

  const fonnteToken = process.env.FONNTE_TOKEN || "";
  if (!fonnteToken) {
    console.error("[Fonnte Error] FONNTE_TOKEN tidak ditemukan di environment");
    return { success: false, reason: "FONNTE_TOKEN belum diisi" };
  }

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonnteToken,
      },
      body: new URLSearchParams({
        target: cleanPhone,
        message: message,
      }),
    });

    const result = await response.json();
    return { success: response.ok && Boolean(result.status), result };
  } catch (err: any) {
    console.error("[Fonnte Error] Gagal mengirim digest WhatsApp:", err);
    return { success: false, reason: err.message || "Network error Fonnte" };
  }
}