// actions/commissions.action.ts
'use server';

import { revenueOperationsService, type CommissionLedgerEntry } from "@/services/revenue-operations.service";
import { createServerClientInstance } from "@/lib/supabase/server";
import { normalizeRole } from "@/lib/permissions";

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
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { success: false, data: [], error: "Sesi tidak valid. Silakan login kembali." };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = normalizeRole(profile?.role ?? user.user_metadata?.role);

    // Otorisasi backend: hanya internal staf yang berwenang
    if (!["admin", "super_admin", "commissioner", "agent"].includes(role)) {
      return { success: false, data: [], error: "Anda tidak berwenang mengakses data komisi." };
    }

    // Jika peran agen, paksa hanya membaca komisi miliknya sendiri
    const effectiveParams =
      role === "agent" ? { ...params, agentId: user.id } : params;

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
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = normalizeRole(profile?.role ?? user.user_metadata?.role);

    const actor = {
      userId: user.id,
      email: user.email ?? null,
      role,
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
