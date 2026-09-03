// services/crm.service.ts
import { supabase } from "@/lib/supabase/client";
import type { CRMContact, CRMFollowup, CRMLead, LeadStatus } from "@/types/crm.types";
import {
  createCRMContactAction,
  updateCRMContactAction,
  deleteCRMContactAction,
} from "@/actions/crm-contacts.action";
import {
  createCRMFollowupAction,
  updateCRMFollowupAction,
  deleteCRMFollowupAction,
} from "@/actions/crm-followups.action";
import {
  createCRMLeadAction,
  updateCRMLeadAction,
  deleteCRMLeadAction,
  bulkUpdateCRMLeadsStatusAction,
  bulkAssignCRMLeadsAction,
} from "@/actions/crm-leads.action";
import {
  createCRMInterestAction,
  updateCRMInterestAction,
  deleteCRMInterestAction,
} from "@/actions/crm-interests.action";

// ============================================================
// TIPE UNTUK RELASI (didefinisikan di sini agar service konsisten)
// ============================================================
export interface LeadWithRelations extends Omit<CRMLead, "contact"> {
  contact: CRMContact; // contact wajib ada
  assigned_user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  interests: {
    id: string;
    property_id: string;
    interest_level?: string | null;
    notes?: string | null;
    property?: {
      id: string;
      title: string;
      listing_code: string;
      status: string;
      price?: {
        selling_price?: number | null;
        rental_price?: number | null;
      } | null;
    } | null;
  }[];
}

export interface LeadFilter {
  search?: string;
  status?: LeadStatus | "all";
  assigned_to?: string | "all";
  page?: number;
  limit?: number;
}

// ⚡ Helper internal untuk memicu kirim notifikasi WhatsApp ke agen
async function sendWaNotification(
  agentId: string,
  leadName?: string | null,
  clientPhone?: string | null,
  propertyInterest?: string | null
) {
  if (!agentId) return;
  try {
    await fetch("/api/notifications/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        leadName: leadName || "Tanpa Nama",
        clientPhone: clientPhone || "-",
        propertyInterest: propertyInterest || "Properti Pilihan",
      }),
    });
  } catch (err) {
    console.error("Gagal memicu WA notif otomatis:", err);
  }
}

// ⚡ Helper internal untuk memicu notifikasi lonceng + push saat lead ditugaskan.
async function sendAssignNotification(
  leadId: string,
  assignedTo: string,
  kind: "created" | "reassigned"
) {
  if (!leadId || !assignedTo) return;
  try {
    const res = await fetch(`/api/leads/${leadId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: assignedTo, kind }),
    });

    if (!res.ok) {
      console.error(
        `Gagal memicu notifikasi penugasan lead (${res.status}):`,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    console.error("Gagal memicu notifikasi penugasan lead:", err);
  }
}

// ============================================================
// CRM SERVICE
// ============================================================
export const crmService = {
  // ============================================================
  // CONTACTS
  // ============================================================
  async getContacts(search?: string) {
    let query = supabase
      .from("crm_contacts")
      .select("*")
      .order("full_name", { ascending: true });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as CRMContact[];
  },

  async getContactById(id: string) {
    const { data, error } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data as CRMContact;
  },

  async createContact(data: Partial<CRMContact>) {
    if (!data.full_name) {
      throw new Error("Nama kontak wajib diisi");
    }
    const result = await createCRMContactAction({
      full_name: data.full_name,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      occupation: data.occupation || null,
      city: data.city || null,
      notes: data.notes || null,
    });
    if (!result.success || !result.data) {
      throw new Error(result.error || "Gagal membuat kontak");
    }
    return result.data;
  },

  async updateContact(id: string, data: Partial<CRMContact>) {
    const result = await updateCRMContactAction(id, data);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Gagal memperbarui kontak");
    }
    return result.data;
  },

  async deleteContact(id: string) {
    const result = await deleteCRMContactAction(id);
    if (!result.success) {
      throw new Error(result.error || "Gagal menghapus kontak");
    }
    return true;
  },

  // ============================================================
  // LEADS
  // ============================================================
  async getLeads(filters: LeadFilter = {}) {
    const {
      search = "",
      status = "all",
      assigned_to = "all",
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from("crm_leads")
      .select(
        `
          *,
          contact:crm_contacts(*)
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (assigned_to !== "all") {
      query = query.eq("assigned_to", assigned_to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    let filteredData = data as CRMLead[];

    if (search && filteredData) {
      const lowerSearch = search.toLowerCase();
      filteredData = filteredData.filter((item: CRMLead) => {
        const name = item.contact?.full_name?.toLowerCase() || "";
        const phone = item.contact?.phone?.toLowerCase() || "";
        const email = item.contact?.email?.toLowerCase() || "";
        return (
          name.includes(lowerSearch) ||
          phone.includes(lowerSearch) ||
          email.includes(lowerSearch)
        );
      });
    }

    return {
      data: filteredData,
      count: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getLeadById(id: string): Promise<LeadWithRelations | null> {
    const { data, error } = await supabase
      .from("crm_leads")
      .select(
        `
        *,
        contact:crm_contacts(*),
        assigned_user:users!assigned_to(id, full_name, email, avatar_url),
        interests:crm_interests(
          id,
          property_id,
          interest_level,
          notes,
          property:properties(id, title, listing_code, status, price:property_price(selling_price, rental_price))
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const rawLead = data as unknown as Record<string, unknown>;

    // Fallback jika relasi contact tidak ikut terambil
    if (!rawLead.contact && typeof rawLead.contact_id === "string") {
      const { data: contactData, error: contactError } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("id", rawLead.contact_id)
        .maybeSingle();

      if (!contactError && contactData) {
        rawLead.contact = contactData;
      }
    }

    // Fallback assigned_user jika null
    const assignedUser = rawLead.assigned_user as { id?: string } | null;
    if (assignedUser && !assignedUser.id && typeof rawLead.assigned_to === "string") {
      const { data: userData } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .eq("id", rawLead.assigned_to)
        .maybeSingle();
      if (userData) {
        rawLead.assigned_user = userData;
      }
    }

    return rawLead as unknown as LeadWithRelations;
  },

  async createLead(data: {
    contact_id: string;
    assigned_to?: string;
    source?: string;
    status?: LeadStatus;
    interest_type?: string;
    budget?: number;
    property_ids?: string[];
  }) {
    const result = await createCRMLeadAction({
      contact_id: data.contact_id,
      assigned_to: data.assigned_to,
      source: data.source,
      status: data.status,
      interest_type: data.interest_type,
      budget: data.budget,
      property_ids: data.property_ids,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "Gagal membuat Lead");
    }

    const lead = result.data as CRMLead;

    if (lead.assigned_to) {
      try {
        const contact = await this.getContactById(data.contact_id);
        await sendWaNotification(
          lead.assigned_to,
          contact?.full_name,
          contact?.phone || contact?.whatsapp,
          data.interest_type || "Properti Pilihan"
        );
      } catch (waErr) {
        console.error("Gagal mengalirkan WA otomatis di createLead:", waErr);
      }

      await sendAssignNotification(lead.id, lead.assigned_to, "created");
    }

    return lead;
  },

  async updateLead(id: string, data: Partial<CRMLead>) {
    const {
      status,
      lost_reason: _1,
      lost_explanation: _2,
      deal_state: _3,
      deal_submitted_at: _4,
      deal_verified_at: _5,
      deal_rejection_reason: _6,
      ...leadData
    } = data;
    void _1; void _2; void _3; void _4; void _5; void _6;

    if (status) {
      const response = await fetch(`/api/leads/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal memperbarui status Lead");
      }
    }

    const oldLead = await this.getLeadById(id).catch(() => null);

    if (Object.keys(leadData).length > 0) {
      const updateResult = await updateCRMLeadAction(id, {
        contact_id: leadData.contact_id,
        notes: leadData.notes,
        budget: typeof leadData.budget === "number" ? leadData.budget : undefined,
        interest_type: leadData.interest_type,
        property_id: leadData.property_id,
        source: leadData.source,
        assigned_to: leadData.assigned_to,
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Gagal memperbarui data Lead");
      }
    }

    const updatedLead = await this.getLeadById(id);

    if (leadData.assigned_to && leadData.assigned_to !== oldLead?.assigned_to && updatedLead) {
      await sendWaNotification(
        leadData.assigned_to,
        updatedLead.contact?.full_name,
        updatedLead.contact?.phone || updatedLead.contact?.whatsapp,
        updatedLead.interest_type || "Properti Pilihan"
      );

      await sendAssignNotification(id, leadData.assigned_to, "reassigned");
    }

    return updatedLead;
  },

  async updateStatus(id: string, status: LeadStatus) {
    const response = await fetch(`/api/leads/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Gagal memperbarui status Lead");
    }
    return result.data;
  },

  async deleteLead(id: string) {
    const result = await deleteCRMLeadAction(id);
    if (!result.success) {
      throw new Error(result.error || "Gagal menghapus Lead");
    }
    return true;
  },

  // ============================================================
  // ACTIVITIES
  // ============================================================
  async getActivities(leadId: string) {
    const { data, error } = await supabase
      .from("crm_activities")
      .select(
        `
        *,
        user:users(id, full_name, avatar_url)
      `
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Activities join to users failed, falling back to basic query");
      const { data: basicData, error: basicError } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (basicError) throw new Error(basicError.message);
      return basicData || [];
    }

    return data || [];
  },

  async logActivity(data: {
    lead_id: string;
    activity_type: string;
    notes: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("crm_activities")
      .insert({
        lead_id: data.lead_id,
        user_id: user.id,
        activity_type: data.activity_type,
        notes: data.notes,
      });

    if (error) throw new Error(error.message);
  },

  // ============================================================
  // INTERESTS
  // ============================================================
  async addInterest(data: {
    lead_id: string;
    property_id: string;
    interest_level?: string;
    notes?: string;
    priority?: number;
  }) {
    const result = await createCRMInterestAction(data);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Gagal menambahkan minat properti");
    }
    return result.data;
  },

  async removeInterest(interestId: string) {
    const result = await deleteCRMInterestAction(interestId);
    if (!result.success) {
      throw new Error(result.error || "Gagal menghapus minat properti");
    }
    return true;
  },

  async updateInterest(interestId: string, data: {
    interest_level?: string;
    notes?: string;
    priority?: number;
  }) {
    const result = await updateCRMInterestAction(interestId, data);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Gagal memperbarui minat properti");
    }
    return true;
  },

  // ============================================================
  // AGENTS (USERS)
  // ============================================================
  async getAgents() {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAgentById(id: string) {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  // ============================================================
  // PROPERTIES
  // ============================================================
  async getPropertiesForLead() {
    const { data, error } = await supabase
      .from("properties")
      .select(
        `
        id,
        title,
        listing_code,
        status,
        price:property_price(selling_price, rental_price)
      `
      )
      .in("status", ["published", "active"])
      .order("title", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getPropertyById(id: string) {
    const { data, error } = await supabase
      .from("properties")
      .select(
        `
        *,
        address:property_address(*),
        price:property_price(*),
        media:property_media(*)
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  // ============================================================
  // FOLLOW-UPS
  // ============================================================
  async getFollowups(
    filters: {
      lead_id?: string;
      assigned_to?: string;
      status?: "pending" | "completed" | "cancelled" | "overdue";
      page?: number;
      limit?: number;
    } = {}
  ) {
    const {
      lead_id,
      assigned_to,
      status,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from("crm_followups")
      .select(
        `
          *,
          lead:crm_leads(id, contact:crm_contacts(full_name, phone)),
          assigned_user:users!assigned_to(id, full_name, avatar_url)
        `,
        { count: "exact" }
      )
      .order("followup_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (lead_id) query = query.eq("lead_id", lead_id);
    if (assigned_to) query = query.eq("assigned_to", assigned_to);
    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;

    if (error) {
      console.warn("Followups join to users failed, falling back to basic query");
      const basicQuery = supabase
        .from("crm_followups")
        .select(
          `
            *,
            lead:crm_leads(id, contact:crm_contacts(full_name, phone))
          `,
          { count: "exact" }
        )
        .order("followup_date", { ascending: true })
        .range(offset, offset + limit - 1);

      if (lead_id) basicQuery.eq("lead_id", lead_id);
      if (assigned_to) basicQuery.eq("assigned_to", assigned_to);
      if (status) basicQuery.eq("status", status);

      const { data: basicData, error: basicError, count: basicCount } = await basicQuery;
      if (basicError) throw new Error(basicError.message);

      return {
        data: basicData || [],
        count: basicCount || 0,
        page,
        totalPages: Math.ceil((basicCount || 0) / limit),
      };
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getFollowupById(id: string) {
    const { data, error } = await supabase
      .from("crm_followups")
      .select(
        `
        *,
        lead:crm_leads(id, contact:crm_contacts(*)),
        assigned_user:users!assigned_to(id, full_name, email, avatar_url)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      const { data: basicData, error: basicError } = await supabase
        .from("crm_followups")
        .select(
          `
          *,
          lead:crm_leads(id, contact:crm_contacts(*))
        `
        )
        .eq("id", id)
        .single();

      if (basicError) throw new Error(basicError.message);
      return basicData;
    }

    return data;
  },

  async createFollowup(data: {
    lead_id: string;
    assigned_to: string;
    followup_date: string;
    notes?: string;
  }) {
    const result = await createCRMFollowupAction({
      lead_id: data.lead_id,
      assigned_to: data.assigned_to,
      followup_date: data.followup_date,
      notes: data.notes || null,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "Gagal membuat agenda follow-up");
    }

    await this.logActivity({
      lead_id: data.lead_id,
      activity_type: "followup_scheduled",
      notes: `Follow-up dijadwalkan pada ${new Date(data.followup_date).toLocaleString("id-ID")}`,
    });

    return result.data;
  },

  async updateFollowup(
    id: string,
    data: {
      followup_date?: string;
      notes?: string;
      status?: "pending" | "completed" | "cancelled" | "overdue";
      assigned_to?: string;
    }
  ): Promise<{
    data: CRMFollowup;
    lifecycle: {
      didTransitionToCompleted: boolean;
      shouldOfferNextFollowup: boolean;
      leadId: string;
    };
  }> {
    const result = await updateCRMFollowupAction(id, {
      followup_date: data.followup_date,
      notes: data.notes,
      status: data.status === "overdue" ? undefined : data.status,
      assigned_to: data.assigned_to,
    });

    if (!result.success || !result.data || !result.lifecycle) {
      throw new Error(result.error || "Gagal memperbarui Follow-Up");
    }

    if (result.lifecycle.didTransitionToCompleted) {
      await this.logActivity({
        lead_id: result.lifecycle.leadId,
        activity_type: "followup_completed",
        notes: "Follow-up selesai",
      });
    }

    return { data: result.data, lifecycle: result.lifecycle };
  },

  async deleteFollowup(id: string) {
    const result = await deleteCRMFollowupAction(id);
    if (!result.success) {
      throw new Error(result.error || "Gagal menghapus Follow-Up");
    }
    return true;
  },

  // ============================================================
  // STATISTICS
  // ============================================================
  async getCRMStats() {
    const { count: totalLeads, error: totalError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true });

    if (totalError) throw new Error(totalError.message);

    const { count: newLeads, error: newError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new");

    if (newError) throw new Error(newError.message);

    const { count: contactedLeads, error: contactedError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "contacted");

    if (contactedError) throw new Error(contactedError.message);

    const { count: wonLeads, error: wonError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "won");

    if (wonError) throw new Error(wonError.message);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayLeads, error: todayError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (todayError) throw new Error(todayError.message);

    const { count: pendingFollowups, error: pendingError } = await supabase
      .from("crm_followups")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lte("followup_date", new Date().toISOString());

    if (pendingError) throw new Error(pendingError.message);

    return {
      totalLeads: totalLeads || 0,
      newLeads: newLeads || 0,
      contactedLeads: contactedLeads || 0,
      wonLeads: wonLeads || 0,
      todayLeads: todayLeads || 0,
      pendingFollowups: pendingFollowups || 0,
    };
  },

  // ============================================================
  // SEARCH & BULK
  // ============================================================
  async searchLeads(query: string) {
    if (!query || query.length < 2) {
      return { data: [], count: 0 };
    }

    const { data, error } = await supabase
      .from("crm_leads")
      .select(
        `
        *,
        contact:crm_contacts(*)
      `
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);

    const lowerQuery = query.toLowerCase();
    const filtered = (data || []).filter((item: CRMLead) => {
      const name = item.contact?.full_name?.toLowerCase() || "";
      const phone = item.contact?.phone?.toLowerCase() || "";
      const email = item.contact?.email?.toLowerCase() || "";
      const city = item.contact?.city?.toLowerCase() || "";
      return (
        name.includes(lowerQuery) ||
        phone.includes(lowerQuery) ||
        email.includes(lowerQuery) ||
        city.includes(lowerQuery)
      );
    });

    return { data: filtered, count: filtered.length };
  },

  async bulkUpdateStatus(leadIds: string[], status: LeadStatus) {
    const result = await bulkUpdateCRMLeadsStatusAction(leadIds, status);
    if (!result.success) {
      throw new Error(result.error || "Gagal memperbarui status Lead secara massal");
    }

    for (const leadId of leadIds) {
      await this.logActivity({
        lead_id: leadId,
        activity_type: "status_change",
        notes: `Status berubah menjadi ${status} (bulk update)`,
      });
    }

    return true;
  },

  async bulkAssign(leadIds: string[], assignedTo: string) {
    const result = await bulkAssignCRMLeadsAction(leadIds, assignedTo);
    if (!result.success) {
      throw new Error(result.error || "Gagal menugaskan Lead secara massal");
    }

    for (const leadId of leadIds) {
      try {
        const lead = await this.getLeadById(leadId);
        if (!lead) continue;
        await sendWaNotification(
          assignedTo,
          lead.contact?.full_name,
          lead.contact?.phone || lead.contact?.whatsapp,
          lead.interest_type || "Properti Pilihan"
        );
      } catch (err) {
        console.error("Gagal kirim WA bulkAssign:", err);
      }
    }

    return true;
  },

  // ============================================================
  // REPORTING
  // ============================================================
  async getLeadsReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("crm_leads")
      .select(
        `
        *,
        contact:crm_contacts(*)
      `
      )
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getFollowupReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("crm_followups")
      .select(
        `
        *,
        lead:crm_leads(contact:crm_contacts(full_name, phone)),
        assigned_user:users!assigned_to(full_name)
      `
      )
      .gte("followup_date", startDate)
      .lte("followup_date", endDate)
      .order("followup_date", { ascending: true });

    if (error) {
      const { data: basicData, error: basicError } = await supabase
        .from("crm_followups")
        .select(
          `
          *,
          lead:crm_leads(contact:crm_contacts(full_name, phone))
        `
        )
        .gte("followup_date", startDate)
        .lte("followup_date", endDate)
        .order("followup_date", { ascending: true });

      if (basicError) throw new Error(basicError.message);
      return basicData || [];
    }

    return data || [];
  },
};
