// actions/commissions.action.ts
'use server';

import { revenueOperationsService, type CommissionLedgerEntry } from "@/services/revenue-operations.service";
import { createServerClientInstance } from "@/lib/supabase/server";
import { canManageAllCRM, getCRMAuthoritativeActor } from "@/lib/crm-auth";

export interface CommissionActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | null;
}

export async function getCommissionLedgersAction(params?: {
  agentId?: string;
  status?: string;
  limit?: number;
}): Promise<CommissionActionResult<CommissionLedgerEntry[]>> {
  try {
    const supabase = await createServerClientInstance();
    const actor = await getCRMAuthoritativeActor(supabase);
    if (!actor) {
      return { success: false, data: [], error: "Sesi tidak valid. Silakan login kembali." };
    }

    // Otorisasi backend: hanya internal staf yang berwenang
    if (!["admin", "super_admin", "commissioner", "agent"].includes(actor.role)) {
      return { success: false, data: [], error: "Anda tidak berwenang mengakses data komisi." };
    }

    // Jika peran agen, paksa hanya membaca komisi miliknya sendiri
    const effectiveParams =
      actor.role === "agent" ? { ...params, agentId: actor.user.id } : params;

    const ledgers = await revenueOperationsService.getCommissionLedgers(effectiveParams);
    return { success: true, data: ledgers };
  } catch (err: any) {
    console.error("[getCommissionLedgersAction] Exception:", err);
    return {
      success: false,
      data: [],
      error: err?.message || "Terjadi kesalahan internal saat memuat data komisi.",
    };
  }
}

export async function updateCommissionStatusAction(
  commissionId: string,
  status: "pending" | "approved" | "paid" | "cancelled"
): Promise<CommissionActionResult> {
  try {
    const supabase = await createServerClientInstance();
    const authoritativeActor = await getCRMAuthoritativeActor(supabase);
    if (!authoritativeActor) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }
    if (!canManageAllCRM(authoritativeActor.role)) {
      return { success: false, error: "Hanya Admin yang berwenang mengubah status komisi." };
    }

    const actor = {
      userId: authoritativeActor.user.id,
      email: authoritativeActor.user.email ?? null,
      role: authoritativeActor.role,
    };

    const result = await revenueOperationsService.updateCommissionStatus(commissionId, status, actor);
    return result;
  } catch (err: any) {
    console.error("[updateCommissionStatusAction] Exception:", err);
    return {
      success: false,
      error: err?.message || "Terjadi kesalahan internal saat memperbarui status komisi.",
    };
  }
}
