import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";
import { notifyEvent } from "@/lib/notification-helper";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("crm_followups")
    .update({ status: "overdue", updated_at: now })
    .eq("status", "pending")
    .lte("followup_date", now)
    .select("id, lead_id, assigned_to, followup_date");

  if (error) {
    console.error("[cron/followups-overdue] Update gagal:", error.message);
    return NextResponse.json({ error: "Gagal memproses Follow-Up overdue." }, { status: 500 });
  }

  for (const followup of data ?? []) {
    await recordAudit({
      actor: { userId: null, email: null, role: "system" },
      action: "followup.overdue",
      targetId: followup.lead_id,
      detail: { followup_id: followup.id, previous_status: "pending", new_status: "overdue", detected_at: now },
    });
    await notifyEvent({
      event: "followup.overdue",
      userIds: [followup.assigned_to],
      title: "Follow-Up overdue",
      message: "Follow-Up Anda telah melewati waktu yang dijadwalkan.",
      link: `/crm/followups/${followup.id}`,
    });
  }

  return NextResponse.json({ processed: data?.length ?? 0, processed_at: now });
}
