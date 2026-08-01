// app/(dashboard)/crm/leads/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { crmService } from "@/services/crm.service";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  Phone,
  Zap,
  MessageCircle,
  Clock,
  User,
  Building2,
  Send,
  Sparkles,
  ChevronRight,
  Lock,
  Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================
// STATUS CONFIGURATION
// ============================================================
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  contacted: { label: "Contacted", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  qualified: { label: "Qualified", color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
  proposal: { label: "Proposal", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  negotiation: { label: "Negotiation", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  won: { label: "Won", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  lost: { label: "Lost", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

export default function LeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingFollowUps, setLoadingFollowUps] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedMobileTab, setSelectedMobileTab] = useState<"followups" | "leads">("followups");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [followUps, setFollowUps] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    page: 1,
  });
  const [leadsData, setLeadsData] = useState<{ data: any[]; count: number; totalPages: number }>({
    data: [],
    count: 0,
    totalPages: 0,
  });

  const [selectedLeadForSheet, setSelectedLeadForSheet] = useState<any | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetLead, setAiTargetLead] = useState<any | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const isAdminOrSuperAdmin =
    currentUserRole === "super_admin" ||
    currentUserRole === "superadmin" ||
    currentUserRole === "admin";

  // 🔒 HELPER SENSOR NOMOR TELEPON UNTUK ROLE AGENT
  const formatPhoneForUser = (phone?: string) => {
    if (!phone) return "-";
    if (isAdminOrSuperAdmin) return phone;
    // Sensor nomor jika pengguna adalah agen (hanya tampilkan 4 digit pertama)
    if (phone.length <= 4) return "xxxxxx";
    return phone.slice(0, 4) + "xxxxxx";
  };

  const fetchFollowUpsData = useCallback(async (userId: string | null, role: string) => {
    setLoadingFollowUps(true);
    try {
      let query = supabase
        .from("crm_followups")
        .select(`
          id,
          lead_id,
          followup_date,
          notes,
          status,
          assigned_to,
          crm_leads (
            id,
            budget,
            interest_type,
            crm_contacts (
              full_name,
              phone
            )
          )
        `)
        .order("followup_date", { ascending: false });

      const isAdmin = role === "admin" || role === "super_admin" || role === "superadmin";
      if (!isAdmin && userId) {
        query = query.eq("assigned_to", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFollowUps(data || []);
    } catch (err) {
      console.error("Error fetching real followups:", err);
    } finally {
      setLoadingFollowUps(false);
    }
  }, []);

  useEffect(() => {
    async function checkUserSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
        setCurrentUserRole(role);
        fetchFollowUpsData(user.id, role);
      } catch (err) {
        console.error("Error checking user session:", err);
      }
    }
    checkUserSession();
  }, [fetchFollowUpsData]);

  const canModifyLead = useCallback(
    (lead: any) => {
      if (!lead) return false;
      if (isAdminOrSuperAdmin) return true;
      if (!currentUserId) return false;
      return (
        lead.created_by === currentUserId ||
        lead.user_id === currentUserId ||
        lead.assigned_to === currentUserId
      );
    },
    [isAdminOrSuperAdmin, currentUserId]
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result = await crmService.getLeads({
        search: filters.search,
        status: filters.status as any,
        page: filters.page,
        limit: 10,
      });
      setLeadsData(result);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Gagal memuat daftar leads");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearchSubmit = () => {
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleDelete = async (lead: any) => {
    if (!canModifyLead(lead)) {
      toast.error("Akses Ditolak!", {
        description: "Anda tidak memiliki izin untuk menghapus lead milik orang lain.",
      });
      return;
    }

    const leadName = lead.contact?.full_name || "ini";
    if (!confirm(`Yakin ingin menghapus lead "${leadName}"?`)) return;

    try {
      const { error } = await supabase.from("crm_leads").delete().eq("id", lead.id);
      if (error) throw error;

      toast.success("Lead berhasil dihapus");
      fetchLeads();
      fetchFollowUpsData(currentUserId, currentUserRole);
    } catch (error: any) {
      toast.error("Gagal menghapus lead: " + (error.message || error));
    }
  };

  // 🔴 PENANGANAN BUKA WHATSAPP & LOGGING OTOMATIS KE CRM_ACTIVITIES FOR SUPER ADMIN
  const handleOpenWhatsApp = async (
    phone?: string,
    name?: string,
    customText?: string,
    leadId?: string
  ) => {
    if (!phone) {
      toast.error("Nomor HP tidak tersedia");
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

    // 1. Logging Aktivitas ke Supabase agar terbaca Super Admin
    if (currentUserId && leadId) {
      try {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "WhatsApp Chat",
            notes: `Agen mengontak klien ${name || "Klien"} via WhatsApp`,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Gagal mencatat log aktivitas WA:", err);
      }
    }

    // 2. Buka Link WhatsApp
    const text = customText
      ? encodeURIComponent(customText)
      : encodeURIComponent(`Halo Bpk/Ibu ${name || ""}, perkenalkan saya dari Tim Inland Property...`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleGenerateAiMessage = async (fuItem: any) => {
    if (!isAdminOrSuperAdmin) {
      toast.error("Fitur Terkunci!", {
        description: "Fitur AI Writer Follow-Up khusus untuk Super Admin dan Admin.",
      });
      return;
    }

    const clientName = fuItem.crm_leads?.crm_contacts?.full_name || fuItem.client_name || "Klien";
    const propertyInterest = fuItem.crm_leads?.interest_type || fuItem.property_interest || "Properti Premium";
    const budgetVal = fuItem.crm_leads?.budget || fuItem.budget || "-";

    setAiTargetLead({
      leadId: fuItem.crm_leads?.id || fuItem.lead_id,
      client_name: clientName,
      phone: fuItem.crm_leads?.crm_contacts?.phone || fuItem.phone,
      property_interest: propertyInterest,
      budget: budgetVal,
    });

    setAiModalOpen(true);
    setGeneratingAi(true);
    setAiGeneratedMessage("");

    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: clientName,
          property: propertyInterest,
          status: fuItem.status || "Perlu Follow-up",
          userRole: currentUserRole,
        }),
      });

      const json = await res.json();
      if (res.ok && json?.message) {
        setAiGeneratedMessage(json.message);
      } else {
        toast.error(json?.error || "Gagal membuat pesan AI.");
        setAiGeneratedMessage(
          `Halo Bpk/Ibu ${clientName},\n\nPerkenalkan saya dari Inland Property. Menindaklanjuti ketertarikan Anda pada properti *${propertyInterest}*, apakah akhir pekan ini ada waktu luang untuk mendampingi Anda survei lokasi secara langsung?\n\nTerima kasih!`
        );
      }
    } catch (err) {
      toast.error("Gagal terhubung ke AI Service.");
      setAiGeneratedMessage(
        `Halo Bpk/Ibu ${clientName},\n\nPerkenalkan saya dari Inland Property. Menindaklanjuti ketertarikan Anda pada properti *${propertyInterest}*, apakah akhir pekan ini ada waktu luang untuk mendampingi Anda survei lokasi secara langsung?\n\nTerima kasih!`
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto px-3 sm:px-4 bg-[#FDFBF7] min-h-screen text-slate-800">
      {/* 1. HEADER RINGKAS */}
      <div className="flex items-center justify-between pt-3 pb-2 border-b border-[#F4EFE6] gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            👥 CRM & Pipeline Leads
          </h1>
          <p className="text-[11px] text-slate-500">
            Manajemen prospek, agenda harian, dan generator AI WhatsApp.
          </p>
        </div>

        <Button
          onClick={() => router.push("/crm/leads/create")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Lead
        </Button>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE SUB-TABS (MINIMALIS & THUMB-FRIENDLY)              */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-3">
        <Tabs value={selectedMobileTab} onValueChange={(v) => setSelectedMobileTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-white border border-[#F4EFE6] rounded-xl p-1 shadow-2xs h-9">
            <TabsTrigger value="followups" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Agenda Follow-ups
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg gap-1.5">
              <User className="w-3.5 h-3.5" /> Database Leads
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AGENDA FOLLOW-UPS (MOBILE) */}
          <TabsContent value="followups" className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="font-semibold text-slate-900">Jadwal Tugas Hari Ini</span>
              <span>{followUps.length} Tugas</span>
            </div>

            {loadingFollowUps ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#F4EFE6]" />
                ))}
              </div>
            ) : followUps.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 bg-white border border-[#F4EFE6] rounded-xl">
                Belum ada agenda follow-up tersimpan.
              </p>
            ) : (
              followUps.map((fu) => {
                const clientName = fu.crm_leads?.crm_contacts?.full_name || "Tanpa Nama";
                const clientPhone = fu.crm_leads?.crm_contacts?.phone || "";
                const budgetVal = fu.crm_leads?.budget || 0;
                const propertyInterest = fu.crm_leads?.interest_type || "Properti";
                const timeStr = fu.followup_date
                  ? new Date(fu.followup_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                  : "Hari ini";

                return (
                  <Card key={fu.id} className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F4EFE6]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                          <Clock className="w-2.5 h-2.5 mr-1" /> {timeStr}
                        </Badge>
                        <span className="font-bold text-xs text-slate-900 truncate">{clientName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 font-mono shrink-0">
                        {formatCurrency(budgetVal)}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <p className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" /> {propertyInterest}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{fu.notes || "Tidak ada catatan."}</p>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#F4EFE6]">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateAiMessage(fu)}
                        className={cn(
                          "h-7 text-[10px] gap-1 cursor-pointer border-[#F4EFE6]",
                          isAdminOrSuperAdmin ? "text-amber-700 bg-amber-50/50" : "text-slate-400 bg-slate-50"
                        )}
                      >
                        {isAdminOrSuperAdmin ? <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> : <Lock className="w-3 h-3 text-slate-400" />}
                        AI Writer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenWhatsApp(clientPhone, clientName, undefined, fu.crm_leads?.id || fu.lead_id)}
                        className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* TAB 2: LEADS DIRECTORY (MOBILE) */}
          <TabsContent value="leads" className="space-y-2.5 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Cari nama atau nomor HP..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="pl-8 h-8 text-xs border-[#F4EFE6] bg-white"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl bg-[#F4EFE6]" />
                ))}
              </div>
            ) : leadsData.data.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 bg-white border border-[#F4EFE6] rounded-xl">
                Tidak ada data leads ditemukan.
              </p>
            ) : (
              <div className="space-y-2">
                {leadsData.data.map((lead: any) => {
                  const st = statusConfig[lead.status] || statusConfig.new;
                  return (
                    <Card
                      key={lead.id}
                      onClick={() => setSelectedLeadForSheet(lead)}
                      className="border border-[#F4EFE6] bg-white shadow-2xs p-3 hover:bg-[#FDFBF7] cursor-pointer transition flex items-center justify-between rounded-xl"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-slate-900 truncate">{lead.contact?.full_name || "Tanpa Nama"}</p>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border shrink-0", st.bg, st.color)}>
                            {st.label}
                          </Badge>
                        </div>
                        {/* 🔒 SENSOR NOMOR UNTUK ROLE AGENT */}
                        <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" /> {formatPhoneForUser(lead.contact?.phone)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ============================================================ */}
      {/* 💻 DESKTOP SPLIT VIEW DASHBOARD                              */}
      {/* ============================================================ */}
      <div className="hidden md:grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: AGENDA FOLLOW-UPS */}
        <div className="col-span-4 space-y-4">
          <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
            <CardHeader className="p-4 pb-3 border-b border-[#F4EFE6]">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Agenda Follow-up
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
                  Aktif ({followUps.length})
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Daftar tugas agen untuk dikontak berdasarkan catatan follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-xs max-h-[550px] overflow-y-auto">
              {loadingFollowUps ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#F4EFE6]" />
                  ))}
                </div>
              ) : followUps.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  Belum ada catatan follow-up tersimpan.
                </p>
              ) : (
                followUps.map((fu) => {
                  const clientName = fu.crm_leads?.crm_contacts?.full_name || "Tanpa Nama";
                  const clientPhone = fu.crm_leads?.crm_contacts?.phone || "";
                  const budgetVal = fu.crm_leads?.budget || 0;
                  const timeStr = fu.followup_date
                    ? new Date(fu.followup_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                    : "Hari ini";

                  return (
                    <div key={fu.id} className="p-3 bg-[#FDFBF7] border border-[#F4EFE6] rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{clientName}</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-[#F4EFE6]">
                          {timeStr}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                        {fu.notes || "Tidak ada catatan khusus."}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#F4EFE6]">
                        <span className="font-mono font-bold text-emerald-600">
                          {formatCurrency(budgetVal)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGenerateAiMessage(fu)}
                            className="h-7 w-7 p-0 cursor-pointer hover:bg-[#F4EFE6]"
                          >
                            {isAdminOrSuperAdmin ? <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenWhatsApp(clientPhone, clientName, undefined, fu.crm_leads?.id || fu.lead_id)}
                            className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer shadow-2xs"
                          >
                            <MessageCircle className="w-3 h-3" /> WA
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: KATALOG DATABASE LEADS */}
        <div className="col-span-8 space-y-4">
          <Card className="border border-[#F4EFE6] bg-white shadow-2xs rounded-xl">
            <CardHeader className="p-4 pb-3 border-b border-[#F4EFE6] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <User className="w-4 h-4 text-emerald-600" /> Direktori Database Leads
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Daftar seluruh calon pembeli dan status pipeline konversi.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari lead..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                    className="pl-8 h-8 text-xs border-[#F4EFE6] bg-[#FDFBF7]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => { fetchLeads(); fetchFollowUpsData(currentUserId, currentUserRole); }} className="h-8 w-8 cursor-pointer border-[#F4EFE6]">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full bg-[#F4EFE6]" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-[#FDFBF7]">
                    <TableRow className="border-b border-[#F4EFE6]">
                      <TableHead className="text-xs font-semibold text-slate-600">Nama Kontak</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Status Pipeline</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Budget</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsData.data.map((lead: any) => {
                      const st = statusConfig[lead.status] || statusConfig.new;
                      const hasAccess = canModifyLead(lead);

                      return (
                        <TableRow
                          key={lead.id}
                          onClick={() => router.push(`/crm/leads/${lead.id}`)}
                          className="hover:bg-[#FDFBF7] cursor-pointer border-b border-[#F4EFE6]"
                        >
                          <TableCell className="p-3">
                            <p className="font-bold text-xs text-slate-900">{lead.contact?.full_name || "Tanpa Nama"}</p>
                            {/* 🔒 SENSOR NOMOR UNTUK ROLE AGENT */}
                            <p className="text-[10px] text-slate-500 font-mono">{formatPhoneForUser(lead.contact?.phone)}</p>
                          </TableCell>
                          <TableCell className="p-3">
                            <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", st.bg, st.color)}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3 font-mono font-semibold text-xs text-emerald-600">
                            {lead.budget ? formatCurrency(lead.budget) : "-"}
                          </TableCell>
                          <TableCell className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-emerald-600 cursor-pointer"
                                onClick={() => handleOpenWhatsApp(lead.contact?.phone, lead.contact?.full_name, undefined, lead.id)}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-900 cursor-pointer"
                                onClick={() => router.push(`/crm/leads/${lead.id}`)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>

                              {hasAccess && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-[#F4EFE6] hover:text-slate-900 transition-colors focus:outline-hidden cursor-pointer">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => router.push(`/crm/leads/${lead.id}/edit`)}>
                                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(lead)} className="text-rose-600">
                                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🎯 MOBILE WORKFLOW SHEET                                     */}
      {/* ============================================================ */}
      <Sheet open={!!selectedLeadForSheet} onOpenChange={() => setSelectedLeadForSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-5 border-[#F4EFE6] bg-white">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono border-[#F4EFE6]">
                ID: {selectedLeadForSheet?.id?.slice(0, 8)}
              </Badge>
              {selectedLeadForSheet && (
                <Badge variant="outline" className={cn("text-[10px]", statusConfig[selectedLeadForSheet.status]?.bg, statusConfig[selectedLeadForSheet.status]?.color)}>
                  {statusConfig[selectedLeadForSheet.status]?.label}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-base font-bold mt-1 text-slate-900">
              {selectedLeadForSheet?.contact?.full_name || "Detail Prospek"}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Informasi kontak dan ringkasan anggaran.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 bg-[#FDFBF7] border border-[#F4EFE6] rounded-xl space-y-2">
              <div className="flex justify-between border-b border-[#F4EFE6] pb-1.5">
                <span className="text-slate-500">WhatsApp / HP:</span>
                {/* 🔒 SENSOR NOMOR UNTUK ROLE AGENT */}
                <span className="font-mono font-bold text-slate-900">{formatPhoneForUser(selectedLeadForSheet?.contact?.phone)}</span>
              </div>
              <div className="flex justify-between border-b border-[#F4EFE6] pb-1.5">
                <span className="text-slate-500">Budget:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedLeadForSheet?.budget ? formatCurrency(selectedLeadForSheet.budget) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Minat:</span>
                <span className="font-semibold text-slate-900">{selectedLeadForSheet?.property?.title || "Umum"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-xs h-9 border-[#F4EFE6] cursor-pointer"
                onClick={() => {
                  if (selectedLeadForSheet) {
                    router.push(`/crm/leads/${selectedLeadForSheet.id}`);
                    setSelectedLeadForSheet(null);
                  }
                }}
              >
                Lihat Detail
              </Button>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1 cursor-pointer shadow-2xs"
                onClick={() => handleOpenWhatsApp(selectedLeadForSheet?.contact?.phone, selectedLeadForSheet?.contact?.full_name, undefined, selectedLeadForSheet?.id)}
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* 🤖 AI WRITER MODAL                                           */}
      {/* ============================================================ */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#F4EFE6] bg-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> AI Follow-Up Writer
              </DialogTitle>
              <Badge variant="outline" className={isAdminOrSuperAdmin ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"}>
                {isAdminOrSuperAdmin ? "Admin Access" : "Khusus Admin"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Draf pesan WhatsApp persuasif dari AI.
            </DialogDescription>
          </DialogHeader>

          {!isAdminOrSuperAdmin ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500">Fitur AI Writer khusus Super Admin & Admin.</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs pt-1">
              <div className="p-2 bg-[#FDFBF7] border border-[#F4EFE6] rounded-xl flex items-center justify-between">
                <span className="text-slate-500">Klien:</span>
                <span className="font-bold text-slate-900">{aiTargetLead?.client_name}</span>
              </div>
              {generatingAi ? (
                <div className="h-28 bg-[#FDFBF7] border border-[#F4EFE6] rounded-xl flex items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Menyusun draf...</span>
                </div>
              ) : (
                <Textarea
                  value={aiGeneratedMessage}
                  onChange={(e) => setAiGeneratedMessage(e.target.value)}
                  rows={5}
                  className="text-xs leading-relaxed resize-none border-[#F4EFE6] bg-[#FDFBF7]"
                />
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            {isAdminOrSuperAdmin ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(aiGeneratedMessage);
                    toast.success("Disalin ke clipboard!");
                  }}
                  className="text-xs h-9 border-[#F4EFE6] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Salin
                </Button>
                <Button
                  size="sm"
                  disabled={generatingAi || !aiGeneratedMessage}
                  onClick={() => {
                    setAiModalOpen(false);
                    handleOpenWhatsApp(aiTargetLead?.phone, aiTargetLead?.client_name, aiGeneratedMessage, aiTargetLead?.leadId);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1 cursor-pointer shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Kirim WhatsApp
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAiModalOpen(false)} className="w-full text-xs h-9 cursor-pointer">
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}