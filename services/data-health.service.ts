// services/data-health.service.ts
import { supabase } from "@/lib/supabase/client";

export type HealthSeverity = "critical" | "warning" | "info";
export type HealthCategory = "property" | "crm" | "survey" | "invoice";

export interface DataHealthIssue {
  id: string;
  category: HealthCategory;
  title: string;
  description: string;
  severity: HealthSeverity;
  entityId: string;
  entityName: string;
  deepLink: string;
  detectedAt: string;
}

export interface DataHealthSummary {
  overallHealth: "healthy" | "warning" | "critical";
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  byCategory: {
    property: number;
    crm: number;
    survey: number;
    invoice: number;
  };
  issues: DataHealthIssue[];
}

export const dataHealthService = {
  async runAudit(): Promise<DataHealthSummary> {
    const issues: DataHealthIssue[] = [];
    const now = new Date().toISOString();

    try {
      // 1. Audit Users (for invalid assignment check)
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, role");
      const activeUserIds = new Set((usersData || []).map((u) => u.id));

      // 2. Audit Properties
      const { data: properties } = await supabase
        .from("properties")
        .select(`
          id, title, listing_code, status, assigned_to,
          property_address ( id, address ),
          property_media ( id, file_name ),
          property_building ( id, building_area ),
          property_land ( id, land_area )
        `);

      if (properties) {
        properties.forEach((p: any) => {
          const hasAddress =
            p.property_address &&
            (Array.isArray(p.property_address)
              ? p.property_address.length > 0 && !!p.property_address[0]?.address
              : !!p.property_address?.address);

          const hasMedia =
            p.property_media &&
            (Array.isArray(p.property_media)
              ? p.property_media.length > 0
              : !!p.property_media?.id);

          const hasBuilding =
            p.property_building &&
            (Array.isArray(p.property_building)
              ? p.property_building.length > 0 && (p.property_building[0]?.building_area ?? 0) > 0
              : (p.property_building?.building_area ?? 0) > 0);

          const hasLand =
            p.property_land &&
            (Array.isArray(p.property_land)
              ? p.property_land.length > 0 && (p.property_land[0]?.land_area ?? 0) > 0
              : (p.property_land?.land_area ?? 0) > 0);

          const propName = p.title || p.listing_code || "Properti Tanpa Judul";

          // Critical: Published with missing address or media
          if (p.status === "published" && (!hasAddress || !hasMedia)) {
            issues.push({
              id: `prop-published-minimal-${p.id}`,
              category: "property",
              title: "Properti Terbit Data Minim",
              description: `Listing berstatus "Published" tetapi belum memiliki ${!hasAddress ? "alamat lokasi" : ""}${!hasAddress && !hasMedia ? " dan " : ""}${!hasMedia ? "foto media" : ""}.`,
              severity: "critical",
              entityId: p.id,
              entityName: propName,
              deepLink: `/properties/${p.id}/edit`,
              detectedAt: now,
            });
          } else if (!hasAddress) {
            issues.push({
              id: `prop-missing-addr-${p.id}`,
              category: "property",
              title: "Properti Tanpa Alamat",
              description: "Properti belum memiliki rekaman alamat jalan/kota yang valid.",
              severity: "warning",
              entityId: p.id,
              entityName: propName,
              deepLink: `/properties/${p.id}/edit`,
              detectedAt: now,
            });
          }

          if (p.status !== "published" && !hasMedia) {
            issues.push({
              id: `prop-missing-media-${p.id}`,
              category: "property",
              title: "Properti Tanpa Media Foto",
              description: "Listing belum memiliki foto cover atau gambar galeri.",
              severity: "warning",
              entityId: p.id,
              entityName: propName,
              deepLink: `/properties/${p.id}/edit`,
              detectedAt: now,
            });
          }

          if (!hasBuilding && !hasLand) {
            issues.push({
              id: `prop-missing-specs-${p.id}`,
              category: "property",
              title: "Spesifikasi Fisik Kosong",
              description: "Listing belum memiliki data luas tanah maupun luas bangunan.",
              severity: "info",
              entityId: p.id,
              entityName: propName,
              deepLink: `/properties/${p.id}/edit`,
              detectedAt: now,
            });
          }

          if (p.assigned_to && !activeUserIds.has(p.assigned_to)) {
            issues.push({
              id: `prop-invalid-agent-${p.id}`,
              category: "property",
              title: "Agen Ditugaskan Tidak Valid",
              description: "Agen penanggung jawab tidak ditemukan atau akun telah dinonaktifkan.",
              severity: "critical",
              entityId: p.id,
              entityName: propName,
              deepLink: `/properties/${p.id}/edit`,
              detectedAt: now,
            });
          }
        });
      }

      // 3. Audit CRM Leads
      const { data: leads } = await supabase
        .from("crm_leads")
        .select(`
          id, contact_id, assigned_to, status,
          contact:crm_contacts ( id, full_name, phone ),
          activities:crm_activities ( id )
        `);

      if (leads) {
        leads.forEach((l: any) => {
          const leadName = l.contact?.full_name || `Lead #${l.id.slice(0, 6)}`;

          // Critical: Lead without contact
          if (!l.contact_id || !l.contact) {
            issues.push({
              id: `crm-no-contact-${l.id}`,
              category: "crm",
              title: "Lead Tanpa Kontak Klien",
              description: "Entitas prospek kehilangan referensi kontak induk (contact_id kosong).",
              severity: "critical",
              entityId: l.id,
              entityName: leadName,
              deepLink: `/crm/leads/${l.id}`,
              detectedAt: now,
            });
          }

          // Warning: Unassigned leads
          if (!l.assigned_to) {
            issues.push({
              id: `crm-unassigned-${l.id}`,
              category: "crm",
              title: "Lead Belum Ditugaskan (Unassigned)",
              description: "Prospek belum diambil oleh agen atau dialokasikan oleh tim admin.",
              severity: "warning",
              entityId: l.id,
              entityName: leadName,
              deepLink: `/crm/leads/${l.id}`,
              detectedAt: now,
            });
          } else if (!activeUserIds.has(l.assigned_to)) {
            issues.push({
              id: `crm-invalid-assignee-${l.id}`,
              category: "crm",
              title: "Lead Ditugaskan ke Akun Nonaktif",
              description: "Akun penanggung jawab lead tidak ditemukan dalam database pengguna aktif.",
              severity: "critical",
              entityId: l.id,
              entityName: leadName,
              deepLink: `/crm/leads/${l.id}`,
              detectedAt: now,
            });
          }

          // Warning: Lead without any activity
          const hasActivities = l.activities && (Array.isArray(l.activities) ? l.activities.length > 0 : !!l.activities?.id);
          if (!hasActivities && l.status !== "lost" && l.status !== "won") {
            issues.push({
              id: `crm-no-activity-${l.id}`,
              category: "crm",
              title: "Lead Belum Disentuh (No Activity)",
              description: "Belum ada catatan kontak, percakapan WhatsApp, atau interaksi tersimpan.",
              severity: "warning",
              entityId: l.id,
              entityName: leadName,
              deepLink: `/crm/leads/${l.id}`,
              detectedAt: now,
            });
          }
        });
      }

      // 4. Audit Surveys
      const { data: surveys } = await supabase
        .from("surveys")
        .select("id, client_name, lead_id, property_id, status");

      if (surveys) {
        surveys.forEach((s: any) => {
          const surveyName = `Survei Klien ${s.client_name || "Tanpa Nama"}`;
          if (!s.property_id) {
            issues.push({
              id: `survey-no-property-${s.id}`,
              category: "survey",
              title: "Survei Tanpa Properti Tujuan",
              description: "Jadwal survei tidak terhubung ke entitas properti manapun.",
              severity: "critical",
              entityId: s.id,
              entityName: surveyName,
              deepLink: `/surveys`,
              detectedAt: now,
            });
          }
          if (!s.lead_id) {
            issues.push({
              id: `survey-no-lead-${s.id}`,
              category: "survey",
              title: "Survei Belum Terhubung CRM Lead",
              description: "Survei belum dihubungkan dengan profil prospek CRM (nullable).",
              severity: "info",
              entityId: s.id,
              entityName: surveyName,
              deepLink: `/surveys`,
              detectedAt: now,
            });
          }
        });
      }

      const { data: surveyRequests } = await supabase
        .from("survey_requests")
        .select("id, property_id, requester_name, status, survey_id");

      if (surveyRequests) {
        surveyRequests.forEach((sr: any) => {
          const reqName = `Pengajuan Survei (${sr.requester_name || "Pemohon"})`;
          if (!sr.property_id) {
            issues.push({
              id: `survey-req-orphan-${sr.id}`,
              category: "survey",
              title: "Pengajuan Survei Orphan",
              description: "Pengajuan survei kehilangan ID properti referensi.",
              severity: "warning",
              entityId: sr.id,
              entityName: reqName,
              deepLink: `/surveys`,
              detectedAt: now,
            });
          }
          if (sr.status === "scheduled" && !sr.survey_id) {
            issues.push({
              id: `survey-req-no-survey-${sr.id}`,
              category: "survey",
              title: "Pengajuan Terjadwal Tanpa Janji Temu",
              description: "Status berlabel 'scheduled' namun tidak memiliki relasi id ke tabel surveys.",
              severity: "warning",
              entityId: sr.id,
              entityName: reqName,
              deepLink: `/surveys`,
              detectedAt: now,
            });
          }
        });
      }

      // 5. Audit Invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, property_id, client_id, client_name, total_amount, status");

      if (invoices) {
        invoices.forEach((inv: any) => {
          const invName = `Invoice #${inv.invoice_number || inv.id.slice(0, 6)}`;
          if (!inv.client_id && !inv.client_name) {
            issues.push({
              id: `invoice-no-client-${inv.id}`,
              category: "invoice",
              title: "Invoice Tanpa Klien",
              description: "Tagihan tidak memiliki referensi akun client_id maupun client_name.",
              severity: "critical",
              entityId: inv.id,
              entityName: invName,
              deepLink: `/invoices`,
              detectedAt: now,
            });
          }
          if (!inv.property_id) {
            issues.push({
              id: `invoice-no-property-${inv.id}`,
              category: "invoice",
              title: "Invoice Belum Terhubung Properti",
              description: "Tagihan tidak memiliki referensi unit listing properti terkait.",
              severity: "warning",
              entityId: inv.id,
              entityName: invName,
              deepLink: `/invoices`,
              detectedAt: now,
            });
          }
        });
      }
    } catch (err) {
      console.error("Gagal menjalankan Data Health Audit:", err);
    }

    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;

    const byCategory = {
      property: issues.filter((i) => i.category === "property").length,
      crm: issues.filter((i) => i.category === "crm").length,
      survey: issues.filter((i) => i.category === "survey").length,
      invoice: issues.filter((i) => i.category === "invoice").length,
    };

    const overallHealth: DataHealthSummary["overallHealth"] =
      criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "healthy";

    return {
      overallHealth,
      totalIssues: issues.length,
      criticalCount,
      warningCount,
      infoCount,
      byCategory,
      issues,
    };
  },
};
