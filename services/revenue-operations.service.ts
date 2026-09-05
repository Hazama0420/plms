// services/revenue-operations.service.ts
//
// Phase 11: Sales & Revenue Operations Service
// Source of truth untuk:
// 1. Deal -> Closing Invoice creation
// 2. Commission Ledger creation & tracking
// 3. Idempotent retry & duplicate protection
// 4. Financial relationship validation & reconciliation

import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit-log";

export interface RevenueOperationsResult {
  success: boolean;
  alreadyProcessed?: boolean;
  invoiceId?: string;
  commissionId?: string;
  propertyId?: string;
  propertyStatus?: string;
  saleAmount?: number;
  commissionAmount?: number;
  error?: string | null;
}

export interface CommissionLedgerEntry {
  id: string;
  agent_id: string;
  lead_id: string;
  deal_id: string;
  property_id: string;
  invoice_id?: string | null;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  notes?: string | null;
  created_at: string;
  updated_at: string;
  agent?: { full_name: string; email: string };
  property?: { title: string; listing_code: string };
  invoice?: { invoice_number: string; status: string };
}

export const revenueOperationsService = {
  /**
   * Memproses penutupan transaksi (Closing Deal) secara aman dan idempoten.
   * Menggunakan PostgreSQL Stored Procedure (RPC) jika tersedia untuk atomisitas database level,
   * dengan graceful fallback di level aplikasi.
   */
  async processDealClosing(
    leadId: string,
    actor: { userId: string; email?: string | null; role: string },
    commissionRate = 0.0250
  ): Promise<RevenueOperationsResult> {
    const supabase = createAdminClient();

    try {
      // Satu-satunya path mutasi: PostgreSQL Atomic Function.
      // Jika RPC belum di-apply, return error eksplisit (JANGAN fallback ke direct insert).
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "process_deal_closing_atomic",
        {
          p_lead_id: leadId,
          p_actor_id: actor.userId,
          p_commission_rate: commissionRate,
        }
      );

      if (rpcErr) {
        // RPC function tidak ditemukan — migration 031 belum di-apply
        if (rpcErr.code === "PGRST202" || rpcErr.message?.includes("process_deal_closing_atomic")) {
          console.error("[revenueOperationsService] RPC process_deal_closing_atomic tidak ditemukan. Pastikan migration 031 sudah di-apply.");
          return {
            success: false,
            error: "Fungsi closing atomik belum tersedia. Hubungi administrator untuk menerapkan migration 031.",
          };
        }
        console.error("[revenueOperationsService] RPC error:", rpcErr.message);
        return { success: false, error: rpcErr.message };
      }

      if (!rpcData || typeof rpcData !== "object") {
        return { success: false, error: "Respons RPC tidak valid." };
      }

      const res = rpcData as Record<string, any>;

      if (!res.success) {
        return { success: false, error: res.error || "Gagal memproses closing deal." };
      }

      // Catat audit hanya jika transaksi baru (bukan idempotent re-run)
      if (!res.already_processed) {
        await recordAudit({
          actor: { userId: actor.userId, email: actor.email ?? null, role: actor.role },
          action: "invoice.closing_created",
          targetId: res.invoice_id,
          detail: {
            lead_id: leadId,
            property_id: res.property_id,
            commission_id: res.commission_id,
            sale_amount: res.sale_amount,
            commission_amount: res.commission_amount,
          },
        });
      }

      return {
        success: true,
        alreadyProcessed: !!res.already_processed,
        invoiceId: res.invoice_id,
        commissionId: res.commission_id,
        propertyId: res.property_id,
        propertyStatus: res.property_status,
        saleAmount: res.sale_amount,
        commissionAmount: res.commission_amount,
      };
    } catch (err: any) {
      console.error("[revenueOperationsService] Exception saat processDealClosing:", err);
      return { success: false, error: err?.message || "Terjadi kesalahan internal pada layanan revenue." };
    }
  },


  /**
   * Mengambil daftar komisi agen (dengan join data properti & invoice)
   */
  async getCommissionLedgers(params?: {
    agentId?: string;
    status?: string;
    limit?: number;
  }): Promise<CommissionLedgerEntry[]> {
    const supabase = createAdminClient();
    let query = supabase
      .from("commission_ledger")
      .select(`
        *,
        agent:users!commission_ledger_agent_id_fkey(full_name, email),
        property:properties(title, listing_code),
        invoice:invoices(invoice_number, status)
      `)
      .order("created_at", { ascending: false })
      .limit(params?.limit || 50);

    if (params?.agentId) {
      query = query.eq("agent_id", params.agentId);
    }
    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[revenueOperationsService] Error getCommissionLedgers:", error.message);
      return [];
    }
    return (data || []) as CommissionLedgerEntry[];
  },

  /**
   * Memperbarui status pembayaran komisi (hanya oleh Admin/SuperAdmin)
   */
  async updateCommissionStatus(
    commissionId: string,
    status: "pending" | "approved" | "paid" | "cancelled",
    actor: { userId: string; email?: string | null; role: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!["admin", "super_admin", "superadmin"].includes(actor.role)) {
      return { success: false, error: "Hanya Admin yang berwenang mengubah status komisi." };
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("commission_ledger")
      .update({ status, updated_at: now })
      .eq("id", commissionId);

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAudit({
      actor: { userId: actor.userId, email: actor.email ?? null, role: actor.role },
      action: "commission.status_updated",
      targetId: commissionId,
      detail: { new_status: status },
    });

    return { success: true };
  },
};
