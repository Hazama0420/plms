// services/crm.service.ts
import { supabase } from "@/lib/supabase/client";
import type { CRMContact, CRMLead, LeadStatus } from "@/types/crm.types";

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
    const { data: contact, error } = await supabase
      .from("crm_contacts")
      .insert({
        contact_code: `CONT-${Date.now()}`,
        full_name: data.full_name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        occupation: data.occupation || null,
        city: data.city || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return contact as CRMContact;
  },

  async updateContact(id: string, data: Partial<CRMContact>) {
    const { error } = await supabase
      .from("crm_contacts")
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        occupation: data.occupation || null,
        city: data.city || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    return await this.getContactById(id);
  },

  async deleteContact(id: string) {
    const { error } = await supabase
      .from("crm_contacts")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return true;
  },

  // ============================================================
  // LEADS (dengan type-safety)
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

    if (search) {
      query = query.or(
        `contact.full_name.ilike.%${search}%,contact.phone.ilike.%${search}%,contact.email.ilike.%${search}%`
      );
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (assigned_to !== "all") {
      query = query.eq("assigned_to", assigned_to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      data: data as CRMLead[],
      count: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  // ⭐ FIX: getLeadById mengembalikan LeadWithRelations dengan contact wajib
  async getLeadById(id: string): Promise<LeadWithRelations> {
    const { data, error } = await supabase
      .from("crm_leads")
      .select(`
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
      `)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    // Pastikan contact ada
    if (!data.contact) {
      // Coba fetch contact secara terpisah
      const { data: contactData, error: contactError } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("id", data.contact_id)
        .single();

      if (contactError || !contactData) {
        throw new Error("Contact not found for lead " + id);
      }
      data.contact = contactData;
    }

    // Pastikan assigned_user memiliki id (jika ada)
    if (data.assigned_user && !data.assigned_user.id) {
      // fallback: fetch user
      const { data: userData } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .eq("id", data.assigned_to)
        .maybeSingle();
      if (userData) {
        data.assigned_user = userData;
      }
    }

    return data as LeadWithRelations;
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
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .insert({
        contact_id: data.contact_id,
        assigned_to: data.assigned_to || null,
        source: data.source || null,
        status: data.status || "new",
        interest_type: data.interest_type || null,
        budget: data.budget || null,
      })
      .select()
      .single();

    if (leadError) throw new Error(leadError.message);

    if (data.property_ids && data.property_ids.length > 0) {
      const interests = data.property_ids.map((property_id) => ({
        lead_id: lead.id,
        property_id,
        interest_level: "medium",
      }));

      const { error: interestError } = await supabase
        .from("crm_interests")
        .insert(interests);

      if (interestError) throw new Error(interestError.message);
    }

    await this.logActivity({
      lead_id: lead.id,
      activity_type: "created",
      notes: "Lead baru dibuat",
    });

    return lead as CRMLead;
  },

  async updateLead(id: string, data: Partial<CRMLead>) {
    const { error } = await supabase
      .from("crm_leads")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    return await this.getLeadById(id);
  },

  async updateStatus(id: string, status: LeadStatus) {
    const { error } = await supabase
      .from("crm_leads")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    await this.logActivity({
      lead_id: id,
      activity_type: "status_change",
      notes: `Status berubah menjadi ${status}`,
    });

    return await this.getLeadById(id);
  },

  async deleteLead(id: string) {
    const { error } = await supabase
      .from("crm_leads")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return true;
  },

  // ============================================================
  // ACTIVITIES
  // ============================================================
  async getActivities(leadId: string) {
    const { data, error } = await supabase
      .from("crm_activities")
      .select(`
        *,
        user:users(id, full_name, avatar_url)
      `)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback jika join ke users gagal
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
  }) {
    const { data: interest, error } = await supabase
      .from("crm_interests")
      .insert({
        lead_id: data.lead_id,
        property_id: data.property_id,
        interest_level: data.interest_level || "medium",
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return interest;
  },

  async removeInterest(interestId: string) {
    const { error } = await supabase
      .from("crm_interests")
      .delete()
      .eq("id", interestId);

    if (error) throw new Error(error.message);
    return true;
  },

  async updateInterest(interestId: string, data: {
    interest_level?: string;
    notes?: string;
  }) {
    const { error } = await supabase
      .from("crm_interests")
      .update({
        interest_level: data.interest_level || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interestId);

    if (error) throw new Error(error.message);
    return true;
  },

  // ============================================================
  // AGENTS (USERS)
  // ============================================================
  async getAgents() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .order("full_name", { ascending: true });

      if (error) {
        console.warn("Tabel users belum dibuat, menggunakan mock data");
        return [
          { id: "1", full_name: "Admin", email: "admin@plms.com", avatar_url: null },
          { id: "2", full_name: "Agent 1", email: "agent1@plms.com", avatar_url: null },
          { id: "3", full_name: "Agent 2", email: "agent2@plms.com", avatar_url: null },
        ];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching agents:", error);
      return [
        { id: "1", full_name: "Admin", email: "admin@plms.com", avatar_url: null },
        { id: "2", full_name: "Agent 1", email: "agent1@plms.com", avatar_url: null },
        { id: "3", full_name: "Agent 2", email: "agent2@plms.com", avatar_url: null },
      ];
    }
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
  // PROPERTIES (untuk interest selection)
  // ============================================================
  async getPropertiesForLead() {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        title,
        listing_code,
        status,
        price:property_price(selling_price, rental_price)
      `)
      .in("status", ["published", "active"])
      .order("title", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getPropertyById(id: string) {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        address:property_address(*),
        price:property_price(*),
        media:property_media(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  // ============================================================
  // FOLLOW-UPS (dengan fallback untuk relasi)
  // ============================================================
  async getFollowups(filters: {
    lead_id?: string;
    assigned_to?: string;
    status?: "pending" | "completed" | "cancelled";
    page?: number;
    limit?: number;
  } = {}) {
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
      // Fallback: query tanpa assigned_user
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
      .select(`
        *,
        lead:crm_leads(id, contact:crm_contacts(*)),
        assigned_user:users!assigned_to(id, full_name, email, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error) {
      // Fallback
      const { data: basicData, error: basicError } = await supabase
        .from("crm_followups")
        .select(`
          *,
          lead:crm_leads(id, contact:crm_contacts(*))
        `)
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
    const { data: followup, error } = await supabase
      .from("crm_followups")
      .insert({
        lead_id: data.lead_id,
        assigned_to: data.assigned_to,
        followup_date: data.followup_date,
        notes: data.notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logActivity({
      lead_id: data.lead_id,
      activity_type: "followup_scheduled",
      notes: `Follow-up dijadwalkan pada ${new Date(data.followup_date).toLocaleString("id-ID")}`,
    });

    return followup;
  },

  // ✅ FIX: tambahkan assigned_to opsional
  async updateFollowup(id: string, data: {
    followup_date?: string;
    notes?: string;
    status?: "pending" | "completed" | "cancelled";
    assigned_to?: string; // tambahkan ini
  }) {
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("crm_followups")
      .update(updateData)
      .eq("id", id);

    if (error) throw new Error(error.message);

    if (data.status === "completed") {
      const { data: followup } = await supabase
        .from("crm_followups")
        .select("lead_id")
        .eq("id", id)
        .single();

      if (followup) {
        await this.logActivity({
          lead_id: followup.lead_id,
          activity_type: "followup_completed",
          notes: "Follow-up selesai",
        });
      }
    }

    return await this.getFollowupById(id);
  },

  async deleteFollowup(id: string) {
    const { error } = await supabase
      .from("crm_followups")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return true;
  },

  // ============================================================
  // STATISTICS
  // ============================================================
  async getCRMStats() {
    const { data: totalLeads, error: totalError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true });

    if (totalError) throw new Error(totalError.message);

    const { data: newLeads, error: newError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new");

    if (newError) throw new Error(newError.message);

    const { data: contactedLeads, error: contactedError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "contacted");

    if (contactedError) throw new Error(contactedError.message);

    const { data: wonLeads, error: wonError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "won");

    if (wonError) throw new Error(wonError.message);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayLeads, error: todayError } = await supabase
      .from("crm_leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (todayError) throw new Error(todayError.message);

    const { data: pendingFollowups, error: pendingError } = await supabase
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

    const { data, error, count } = await supabase
      .from("crm_leads")
      .select(`
        *,
        contact:crm_contacts(*)
      `, { count: "exact" })
      .or(
        `contact.full_name.ilike.%${query}%,
         contact.phone.ilike.%${query}%,
         contact.email.ilike.%${query}%,
         contact.city.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return { data: data || [], count: count || 0 };
  },

  async bulkUpdateStatus(leadIds: string[], status: LeadStatus) {
    const { error } = await supabase
      .from("crm_leads")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .in("id", leadIds);

    if (error) throw new Error(error.message);

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
    const { error } = await supabase
      .from("crm_leads")
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString()
      })
      .in("id", leadIds);

    if (error) throw new Error(error.message);
    return true;
  },

  // ============================================================
  // REPORTING
  // ============================================================
  async getLeadsReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("crm_leads")
      .select(`
        *,
        contact:crm_contacts(*)
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getFollowupReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("crm_followups")
      .select(`
        *,
        lead:crm_leads(contact:crm_contacts(full_name, phone)),
        assigned_user:users!assigned_to(full_name)
      `)
      .gte("followup_date", startDate)
      .lte("followup_date", endDate)
      .order("followup_date", { ascending: true });

    if (error) {
      // Fallback
      const { data: basicData, error: basicError } = await supabase
        .from("crm_followups")
        .select(`
          *,
          lead:crm_leads(contact:crm_contacts(full_name, phone))
        `)
        .gte("followup_date", startDate)
        .lte("followup_date", endDate)
        .order("followup_date", { ascending: true });

      if (basicError) throw new Error(basicError.message);
      return basicData || [];
    }

    return data || [];
  },
};