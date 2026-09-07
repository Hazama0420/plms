// lib/crm-pipeline.ts
//
// Definisi tunggal untuk urutan tahapan pipeline CRM dan transisi yang
// diizinkan. Dipakai oleh actions/ dan validasi server-side lainnya.
//
// Urutan: new → contacted → qualified → proposal → negotiation → won/lost
// (sesuai Kanban board dan dokumentasi bisnis).

export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export function isPipelineStage(value: string): value is (typeof PIPELINE_STAGES)[number] {
  return PIPELINE_STAGES.includes(value as (typeof PIPELINE_STAGES)[number]);
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["proposal", "lost"],
  proposal: ["negotiation", "lost"],
  negotiation: ["won", "lost"],
  won: [],
  lost: ["new"],
};

export function isPipelineTransitionAllowed(
  currentStatus: string,
  newStatus: string
): boolean {
  if (currentStatus === newStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

export const LOST_REASONS = [
  "customer_not_responding",
  "budget_mismatch",
  "not_interested",
  "chose_another_property",
  "purchase_postponed",
  "property_unsuitable",
  "duplicate",
  "other",
] as const;

export type LostReason = (typeof LOST_REASONS)[number];

export function isLostReason(value: string): value is LostReason {
  return LOST_REASONS.includes(value as LostReason);
}
