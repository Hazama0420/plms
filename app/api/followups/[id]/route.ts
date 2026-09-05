import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit-log";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["super_admin", "admin", "agent"]);
  if (!auth.ok) return auth.response;
  const { supabase, userId, role } = auth.ctx;
  const { id } = await context.params;
  const body = await request.json();
  if (body.status === "overdue") {
    return NextResponse.json({ error: "Status overdue hanya dapat ditetapkan oleh processor terjadwal." }, { status: 400 });
  }
  if (body.status !== undefined && !["pending", "completed", "cancelled"].includes(body.status)) {
    return NextResponse.json({ error: "Status Follow-Up tidak valid." }, { status: 400 });
  }
  const { data: followup } = await supabase
    .from("crm_followups")
    .select("id, lead_id, assigned_to, status, lead:crm_leads(assigned_to, created_by, status)")
    .eq("id", id)
    .maybeSingle();
  if (!followup) return NextResponse.json({ error: "Follow-Up tidak ditemukan atau tidak berwenang." }, { status: 404 });

  const lead = Array.isArray(followup.lead) ? followup.lead[0] : followup.lead;
  const privileged = role === "admin" || role === "super_admin";
  const authorized = privileged || followup.assigned_to === userId || lead?.assigned_to === userId || lead?.created_by === userId;
  if (!authorized) return NextResponse.json({ error: "Anda tidak berwenang mengubah Follow-Up ini." }, { status: 403 });
  if (!privileged && body.assigned_to !== undefined) {
    return NextResponse.json({ error: "Agent tidak dapat mengubah penanggung jawab Follow-Up." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const didTransitionToCompleted = body.status === "completed" && followup.status !== "completed";
  const didTransitionToCancelled = body.status === "cancelled" && followup.status !== "cancelled";
  const shouldOfferNextFollowup = didTransitionToCompleted && Boolean(lead && lead.status !== "lost" && lead.status !== "won");
  const patch: Record<string, unknown> = { updated_at: now };
  for (const key of ["followup_date", "notes", "status"]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (privileged && body.assigned_to !== undefined) patch.assigned_to = body.assigned_to;
  if (didTransitionToCompleted) {
    patch.completed_at = now;
    patch.completed_by = userId;
  } else if (body.status === "pending" || body.status === "cancelled") {
    patch.completed_at = null;
    patch.completed_by = null;
  }
  const { data, error } = await supabase.from("crm_followups").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (didTransitionToCompleted || didTransitionToCancelled) {
    await recordAudit({
      actor: { userId, email: auth.ctx.email, role },
      action: didTransitionToCompleted ? "followup.completed" : "followup.cancelled",
      targetId: followup.lead_id,
      detail: { followup_id: id, previous_status: followup.status, status: body.status },
    });
  } else {
    await recordAudit({
      actor: { userId, email: auth.ctx.email, role },
      action: "followup.updated",
      targetId: followup.lead_id,
      detail: { followup_id: id, fields: Object.keys(body).filter((key) => key !== "assigned_to") },
    });
  }
  return NextResponse.json({
    success: true,
    data,
    lifecycle: { didTransitionToCompleted, shouldOfferNextFollowup, leadId: followup.lead_id },
  });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["super_admin", "admin", "agent"]);
  if (!auth.ok) return auth.response;
  const { supabase, userId, role } = auth.ctx;
  const { id } = await context.params;
  const { data: followup } = await supabase
    .from("crm_followups")
    .select("id, lead_id, assigned_to, lead:crm_leads(assigned_to, created_by)")
    .eq("id", id)
    .maybeSingle();
  if (!followup) return NextResponse.json({ error: "Follow-Up tidak ditemukan atau tidak berwenang." }, { status: 404 });
  const lead = Array.isArray(followup.lead) ? followup.lead[0] : followup.lead;
  const privileged = role === "admin" || role === "super_admin";
  const authorized = privileged || followup.assigned_to === userId || lead?.assigned_to === userId || lead?.created_by === userId;
  if (!authorized) return NextResponse.json({ error: "Anda tidak berwenang menghapus Follow-Up ini." }, { status: 403 });
  const { error } = await supabase.from("crm_followups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await recordAudit({
    actor: { userId, email: auth.ctx.email, role },
    action: "followup.deleted",
    targetId: followup.lead_id,
    detail: { followup_id: id },
  });
  return NextResponse.json({ success: true });
}
