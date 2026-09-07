// app/api/followups/process-overdue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";
import { notifyEvent } from "@/lib/notification-helper";
import {
  sendFollowupDigestWa,
  type FollowupDigestPriorityItem,
} from "@/lib/fonnte";

function verifyCronAuth(request: NextRequest): { authorized: boolean; status?: number; error?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/followups-scheduler] CRON_SECRET belum dikonfigurasi di environment.");
    return { authorized: false, status: 503, error: "Endpoint belum dikonfigurasi." };
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);

  if (headerBuf.length !== expectedBuf.length || !timingSafeEqual(headerBuf, expectedBuf)) {
    return { authorized: false, status: 401, error: "Tidak diizinkan." };
  }

  return { authorized: true };
}

async function handleFollowupAutomation() {
  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Waktu Kanonik Asia/Jakarta (WIB)
  const jktDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now); // "YYYY-MM-DD"
  const startOfDayWib = new Date(`${jktDateStr}T00:00:00+07:00`).toISOString();
  const endOfDayWib = new Date(`${jktDateStr}T23:59:59.999+07:00`).toISOString();
  const dateFormattedWib = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
  }).format(now);

  // 2. Step 1: Atomic Sweep Overdue Status
  // Update status = 'overdue' untuk follow-up pending yang sudah lewat waktunya
  const { data: newlyOverdue, error: sweepErr } = await supabase
    .from("crm_followups")
    .update({ status: "overdue", updated_at: nowIso })
    .eq("status", "pending")
    .lt("followup_date", nowIso)
    .select("id, lead_id, assigned_to, followup_date");

  if (sweepErr) {
    console.error("[cron/followups-scheduler] Sweep overdue gagal:", sweepErr.message);
    return NextResponse.json({ error: "Gagal memperbarui status overdue." }, { status: 500 });
  }

  // Catat jejak audit untuk setiap item yang baru saja beralih ke status overdue
  for (const item of newlyOverdue ?? []) {
    await recordAudit({
      actor: { userId: null, email: null, role: "system" },
      action: "followup.overdue",
      targetId: item.lead_id,
      detail: {
        followup_id: item.id,
        previous_status: "pending",
        new_status: "overdue",
        detected_at: nowIso,
      },
    });
  }

  // 3. Step 2: Batch Fetch Active Follow-Ups untuk Hari Ini (Asia/Jakarta) & Overdue
  const { data: activeFollowups, error: fetchErr } = await supabase
    .from("crm_followups")
    .select(`
      id,
      lead_id,
      assigned_to,
      followup_date,
      status,
      notes,
      lead:crm_leads (
        id,
        interest_type,
        assigned_to,
        contact:crm_contacts (
          full_name,
          phone
        )
      )
    `)
    .in("status", ["pending", "overdue"])
    .order("followup_date", { ascending: true });

  if (fetchErr) {
    console.error("[cron/followups-scheduler] Fetch active follow-ups gagal:", fetchErr.message);
    return NextResponse.json({ error: "Gagal memuat agenda follow-up aktif." }, { status: 500 });
  }

  if (!activeFollowups || activeFollowups.length === 0) {
    return NextResponse.json({
      success: true,
      processed_at: nowIso,
      timezone: "Asia/Jakarta",
      date: jktDateStr,
      newly_overdue_count: newlyOverdue?.length ?? 0,
      agents_scanned: 0,
      notified: 0,
      skipped: 0,
      partial: 0,
      failed: 0,
    });
  }

  // 4. Step 3: Kelompokkan Agenda Berdasarkan Responsible Agent
  interface AgentGroup {
    agentId: string;
    dueToday: typeof activeFollowups;
    overdue: typeof activeFollowups;
  }

  const agentGroups = new Map<string, AgentGroup>();

  for (const item of activeFollowups) {
    // Abaikan status selesai atau batal jika ada anomali
    if (item.status === "completed" || item.status === "cancelled") continue;

    const leadData = Array.isArray(item.lead) ? item.lead[0] : item.lead;
    const recipientId = (item.assigned_to || leadData?.assigned_to) as string | null;
    if (!recipientId) continue;

    if (!agentGroups.has(recipientId)) {
      agentGroups.set(recipientId, {
        agentId: recipientId,
        dueToday: [],
        overdue: [],
      });
    }

    const group = agentGroups.get(recipientId)!;
    const itemDate = new Date(item.followup_date);
    const isDueToday = item.status === "pending" && itemDate >= new Date(startOfDayWib) && itemDate <= new Date(endOfDayWib);

    if (item.status === "overdue" || itemDate < new Date(startOfDayWib)) {
      group.overdue.push(item);
    } else if (isDueToday) {
      group.dueToday.push(item);
    }
  }

  // 5. Step 4: Batch Fetch Data Profil Agen & Preferensi
  const agentIds = Array.from(agentGroups.keys());
  let agentProfilesMap = new Map<string, { id: string; full_name: string; phone?: string; preferences?: Record<string, unknown> }>();

  if (agentIds.length > 0) {
    const { data: usersData, error: userErr } = await supabase
      .from("users")
      .select("id, full_name, phone, preferences")
      .in("id", agentIds);

    if (!userErr && usersData) {
      for (const u of usersData) {
        agentProfilesMap.set(u.id, u as any);
      }
    }
  }

  // 6. Step 5 & 6: Idempotency Check & Multi-Channel Dispatch dengan Failure Isolation
  let notifiedCount = 0;
  let skippedCount = 0;
  let partialCount = 0;
  let failedCount = 0;

  const agentResults: Record<string, { push: boolean; whatsapp: boolean; status: string; reason?: string }> = {};

  for (const [agentId, group] of agentGroups.entries()) {
    const totalReminders = group.dueToday.length + group.overdue.length;
    if (totalReminders === 0) continue;

    const agentProfile = agentProfilesMap.get(agentId);
    const agentName = agentProfile?.full_name || "Agen Properti";

    try {
      // 🔒 Idempotency Guard: Periksa apakah Daily Digest sudah dikirim hari ini untuk agen ini
      const { data: alreadySent } = await supabase
        .from("admin_audit_log")
        .select("id")
        .eq("action", "followup.daily_digest")
        .eq("target_id", agentId)
        .gte("created_at", startOfDayWib)
        .lte("created_at", endOfDayWib)
        .maybeSingle();

      if (alreadySent) {
        skippedCount++;
        agentResults[agentId] = { push: false, whatsapp: false, status: "skipped", reason: "Already dispatched today" };
        continue;
      }

      // Susun item prioritas untuk WhatsApp Digest
      const allSorted = [...group.overdue, ...group.dueToday].slice(0, 5);
      const priorityItems: FollowupDigestPriorityItem[] = allSorted.map((f) => {
        const leadObj = Array.isArray(f.lead) ? f.lead[0] : f.lead;
        const contactObj = Array.isArray(leadObj?.contact) ? leadObj?.contact[0] : leadObj?.contact;
        const timeStr = new Date(f.followup_date).toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB";

        return {
          contactName: contactObj?.full_name || "Klien",
          interestType: leadObj?.interest_type || null,
          scheduledTimeStr: timeStr,
          isOverdue: f.status === "overdue" || new Date(f.followup_date) < new Date(startOfDayWib),
        };
      });

      // Dispatch kanal Web Push & Lonceng via notifyEvent
      const pushPromise = notifyEvent({
        event: "followup.daily_digest",
        userIds: [agentId],
        title: "📋 Agenda Follow-Up Hari Ini",
        message: `Halo ${agentName}, Anda memiliki ${group.dueToday.length} agenda hari ini dan ${group.overdue.length} agenda tertunda. Silakan tindak lanjuti melalui CRM.`,
        link: "/crm/followups",
      });

      // Dispatch kanal WhatsApp via sendFollowupDigestWa
      const waPromise = sendFollowupDigestWa({
        agentId,
        agentName,
        agentPhone: agentProfile?.phone,
        agentPreferences: agentProfile?.preferences as Record<string, unknown>,
        dateFormattedWib,
        dueTodayCount: group.dueToday.length,
        overdueCount: group.overdue.length,
        priorityItems,
      });

      // Eksekusi secara terisolasi (Failure Isolation)
      const [pushOutcome, waOutcome] = await Promise.allSettled([pushPromise, waPromise]);

      const pushSuccess = pushOutcome.status === "fulfilled" && pushOutcome.value.success;
      const waSuccess = waOutcome.status === "fulfilled" && (waOutcome.value.success || waOutcome.value.skipped);

      // Catat jejak audit harian untuk mengunci idempotensi
      await recordAudit({
        actor: { userId: null, email: null, role: "system" },
        action: "followup.daily_digest",
        targetId: agentId,
        detail: {
          date: jktDateStr,
          due_today_count: group.dueToday.length,
          overdue_count: group.overdue.length,
          push_success: pushSuccess,
          whatsapp_success: waSuccess,
        },
      });

      if (pushSuccess && waSuccess) {
        notifiedCount++;
        agentResults[agentId] = { push: true, whatsapp: true, status: "notified" };
      } else if (pushSuccess || waSuccess) {
        partialCount++;
        agentResults[agentId] = { push: Boolean(pushSuccess), whatsapp: Boolean(waSuccess), status: "partial" };
      } else {
        failedCount++;
        agentResults[agentId] = { push: false, whatsapp: false, status: "failed" };
      }
    } catch (agentErr: any) {
      console.error(`[cron/followups-scheduler] Error memproses agen ${agentId}:`, agentErr);
      failedCount++;
      agentResults[agentId] = { push: false, whatsapp: false, status: "failed", reason: agentErr.message };
    }
  }

  return NextResponse.json({
    success: true,
    processed_at: nowIso,
    timezone: "Asia/Jakarta",
    date: jktDateStr,
    newly_overdue_count: newlyOverdue?.length ?? 0,
    agents_scanned: agentGroups.size,
    notified: notifiedCount,
    skipped: skippedCount,
    partial: partialCount,
    failed: failedCount,
    agent_results: agentResults,
  });
}

export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return handleFollowupAutomation();
}

export async function POST(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return handleFollowupAutomation();
}
