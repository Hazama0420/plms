"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
// STATUS CONFIGURATION (ADAPTIF TEMA)
// ============================================================
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  contacted: { label: "Contacted", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  qualified: { label: "Qualified", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  proposal: { label: "Proposal", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  negotiation: { label: "Negotiation", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  won: { label: "Won", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  lost: { label: "Lost", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
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

  const isAdminOrSuperAdmin = useMemo(() => {
    return (
      currentUserRole === "super_admin" ||
      currentUserRole === "superadmin" ||
      currentUserRole === "admin"
    );
  }, [currentUserRole]);

  // 🔒 MASKING NOMOR TELEPON TOTAL UNTUK ROLE AGENT
  const formatPhoneForUser = useCallback(
    (phone?: string) => {
      if (!phone) return "-";
      if (isAdminOrSuperAdmin) return phone;
      return "08xx-xxxx-xxxx";
    },
    [isAdminOrSuperAdmin]
  );

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

  // 🛡️ PENANGANAN WHATSAPP DENGAN PROTEKSI ROLE AGEN
  const handleOpenWhatsApp = async (
    phone?: string,
    name?: string,
    customText?: string,
    leadId?: string
  ) => {
    if (!isAdminOrSuperAdmin) {
      toast.error("Akses Kontak Terkunci!", {
        description:
          "Nomor kontak disembunyikan demi keamanan data perusahaan. Gunakan sistem pesan terpusat atau hubungi Admin.",
      });
      return;
    }

    if (!phone) {
      toast.error("Nomor HP tidak tersedia");
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

    if (currentUserId && leadId) {
      try {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "WhatsApp Chat",
            notes: `Admin mengontak klien ${name || "Klien"} via WhatsApp`,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Gagal mencatat log aktivitas WA:", err);
      }
    }

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
          // Role ditentukan server dari sesi, tidak lagi dikirim dari klien.
        }),
      });

      const json = await res.json();
      if (res.ok && json?.message) {
        setAiGeneratedMessage(json.message);
      } else {
        setAiGeneratedMessage(
          `Halo Bpk/Ibu ${clientName},\n\nPerkenalkan saya dari Inland Property. Menindaklanjuti ketertarikan Anda pada properti *${propertyInterest}*, apakah akhir pekan ini ada waktu luang untuk mendampingi Anda survei lokasi secara langsung?\n\nTerima kasih!`
        );
      }
    } catch (err) {
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
    <div className="space-y-4 pb-20 max-w-7xl mx-auto px-3 sm:px-4 bg-background min-h-screen text-foreground">
      {/* 1. HEADER RINGKAS ADAPTIF TEMA */}
      <div className="flex items-center justify-between pt-3 pb-3 border-b border-border gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            👥 CRM & Pipeline Leads
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Manajemen database prospek, agenda harian, dan generator AI WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdminOrSuperAdmin && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              <Lock className="w-3 h-3 text-amber-500" /> Mode Agen (Kontak Disensor)
            </span>
          )}

          <Button
            onClick={() => router.push("/crm/leads/create")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Tambah Lead
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE SUB-TABS (ADAPTIF TEMA)                             */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-3">
        <Tabs value={selectedMobileTab} onValueChange={(v) => setSelectedMobileTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-muted border border-border rounded-xl p-1 h-9">
            <TabsTrigger value="followups" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground rounded-lg gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Agenda Follow-ups
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-[11px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground rounded-lg gap-1.5">
              <User className="w-3.5 h-3.5" /> Database Leads
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AGENDA FOLLOW-UPS (MOBILE) */}
          <TabsContent value="followups" className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="font-semibold text-foreground">Jadwal Tugas Hari Ini</span>
              <span>{followUps.length} Tugas</span>
            </div>

            {loadingFollowUps ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted" />
                ))}
              </div>
            ) : followUps.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground bg-card border border-border rounded-xl">
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
                  <Card key={fu.id} className="border border-border bg-card rounded-xl p-3 space-y-2 text-card-foreground">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                          <Clock className="w-2.5 h-2.5 mr-1" /> {timeStr}
                        </Badge>
                        <span className="font-bold text-xs text-foreground truncate">{clientName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                        {formatCurrency(budgetVal)}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <p className="text-[11px] font-medium text-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-emerald-500 shrink-0" /> {propertyInterest}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{fu.notes || "Tidak ada catatan."}</p>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateAiMessage(fu)}
                        className={cn(
                          "h-7 text-[10px] gap-1 cursor-pointer border-border bg-background",
                          isAdminOrSuperAdmin ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}
                      >
                        {isAdminOrSuperAdmin ? <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> : <Lock className="w-3 h-3 text-muted-foreground" />}
                        AI Writer
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenWhatsApp(clientPhone, clientName, undefined, fu.crm_leads?.id || fu.lead_id)}
                        className={cn(
                          "h-7 text-[10px] gap-1 cursor-pointer",
                          isAdminOrSuperAdmin
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        {isAdminOrSuperAdmin ? <MessageCircle className="w-3 h-3" /> : <Lock className="w-3 h-3 text-amber-500" />}
                        WhatsApp
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama prospek..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="pl-8 h-8 text-xs border-border bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted" />
                ))}
              </div>
            ) : leadsData.data.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground bg-card border border-border rounded-xl">
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
                      className="border border-border bg-card p-3 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between rounded-xl"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-foreground truncate">{lead.contact?.full_name || "Tanpa Nama"}</p>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border shrink-0", st.bg, st.color)}>
                            {st.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-muted-foreground" /> {formatPhoneForUser(lead.contact?.phone)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ============================================================ */}
      {/* 💻 DESKTOP SPLIT VIEW DASHBOARD (ADAPTIF TEMA)                */}
      {/* ============================================================ */}
      <div className="hidden md:grid grid-cols-12 gap-6">
        {/* LEFT COLUMN: AGENDA FOLLOW-UPS */}
        <div className="col-span-4 space-y-4">
          <Card className="border border-border bg-card rounded-xl text-card-foreground">
            <CardHeader className="p-4 pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Agenda Follow-up
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Aktif ({followUps.length})
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Daftar tugas agen untuk dikontak berdasarkan catatan follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-xs max-h-[550px] overflow-y-auto">
              {loadingFollowUps ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted" />
                  ))}
                </div>
              ) : followUps.length === 0 ? (
                <p className="text-center py-8 text-xs text-muted-foreground">
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
                    <div key={fu.id} className="p-3 bg-background border border-border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{clientName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          {timeStr}
                        </span>
                      </div>

                      <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                        {fu.notes || "Tidak ada catatan khusus."}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(budgetVal)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGenerateAiMessage(fu)}
                            className="h-7 w-7 p-0 cursor-pointer hover:bg-muted"
                            title={isAdminOrSuperAdmin ? "AI Writer" : "Khusus Admin"}
                          >
                            {isAdminOrSuperAdmin ? <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenWhatsApp(clientPhone, clientName, undefined, fu.crm_leads?.id || fu.lead_id)}
                            className={cn(
                              "h-7 px-2 text-[11px] gap-1 cursor-pointer",
                              isAdminOrSuperAdmin
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-muted text-muted-foreground border border-border"
                            )}
                          >
                            {isAdminOrSuperAdmin ? <MessageCircle className="w-3 h-3" /> : <Lock className="w-3 h-3 text-amber-500" />} WA
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
          <Card className="border border-border bg-card rounded-xl text-card-foreground">
            <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Direktori Database Leads
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Daftar seluruh calon pembeli dan status pipeline konversi.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari lead..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                    className="pl-8 h-8 text-xs border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => { fetchLeads(); fetchFollowUpsData(currentUserId, currentUserRole); }} className="h-8 w-8 cursor-pointer border-border bg-background hover:bg-muted text-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full bg-muted" />
                  ))}
                </div>
              ) : (
                // Empat kolom (nama, status, budget, aksi) tidak muat di 375px.
                // Pembungkus ini membuat tabelnya sendiri yang scroll, bukan
                // seluruh halaman.
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border">
                      <TableHead className="text-xs font-semibold text-muted-foreground">Nama Kontak</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Status Pipeline</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Budget</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">Aksi</TableHead>
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
                          className="hover:bg-muted/50 cursor-pointer border-b border-border transition-colors"
                        >
                          <TableCell className="p-3">
                            <p className="font-bold text-xs text-foreground">{lead.contact?.full_name || "Tanpa Nama"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{formatPhoneForUser(lead.contact?.phone)}</p>
                          </TableCell>
                          <TableCell className="p-3">
                            <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", st.bg, st.color)}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3 font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                            {lead.budget ? formatCurrency(lead.budget) : "-"}
                          </TableCell>
                          <TableCell className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                                onClick={() => handleOpenWhatsApp(lead.contact?.phone, lead.contact?.full_name, undefined, lead.id)}
                                title={isAdminOrSuperAdmin ? "Chat WhatsApp Direct" : "Kontak Terkunci demi Keamanan"}
                              >
                                {isAdminOrSuperAdmin ? <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => router.push(`/crm/leads/${lead.id}`)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>

                              {hasAccess && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 bg-card border-border text-card-foreground text-xs">
                                    <DropdownMenuItem onClick={() => router.push(`/crm/leads/${lead.id}/edit`)}>
                                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(lead)} className="text-rose-600 dark:text-rose-400">
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🎯 MOBILE WORKFLOW SHEET (ADAPTIF TEMA)                      */}
      {/* ============================================================ */}
      <Sheet open={!!selectedLeadForSheet} onOpenChange={() => setSelectedLeadForSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-5 border-border bg-card text-card-foreground">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                ID: {selectedLeadForSheet?.id?.slice(0, 8)}
              </Badge>
              {selectedLeadForSheet && (
                <Badge variant="outline" className={cn("text-[10px]", statusConfig[selectedLeadForSheet.status]?.bg, statusConfig[selectedLeadForSheet.status]?.color)}>
                  {statusConfig[selectedLeadForSheet.status]?.label}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-base font-bold mt-1 text-foreground">
              {selectedLeadForSheet?.contact?.full_name || "Detail Prospek"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Informasi kontak dan ringkasan anggaran.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 bg-background border border-border rounded-xl space-y-2">
              <div className="flex justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">WhatsApp / HP:</span>
                <span className="font-mono font-bold text-foreground">{formatPhoneForUser(selectedLeadForSheet?.contact?.phone)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedLeadForSheet?.budget ? formatCurrency(selectedLeadForSheet.budget) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minat:</span>
                <span className="font-semibold text-foreground">{selectedLeadForSheet?.property?.title || "Umum"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-xs h-9 border-border bg-background text-foreground cursor-pointer"
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
                className={cn(
                  "w-full text-xs h-9 gap-1 cursor-pointer",
                  isAdminOrSuperAdmin
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                )}
                onClick={() => handleOpenWhatsApp(selectedLeadForSheet?.contact?.phone, selectedLeadForSheet?.contact?.full_name, undefined, selectedLeadForSheet?.id)}
              >
                {isAdminOrSuperAdmin ? <MessageCircle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />} WhatsApp
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* 🤖 AI WRITER MODAL (ADAPTIF TEMA)                             */}
      {/* ============================================================ */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> AI Follow-Up Writer
              </DialogTitle>
              <Badge variant="outline" className={isAdminOrSuperAdmin ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"}>
                {isAdminOrSuperAdmin ? "Admin Access" : "Khusus Admin"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Draf pesan WhatsApp persuasif dari AI.
            </DialogDescription>
          </DialogHeader>

          {!isAdminOrSuperAdmin ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-xs text-muted-foreground">Fitur AI Writer khusus Super Admin & Admin.</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs pt-1">
              <div className="p-2 bg-background border border-border rounded-xl flex items-center justify-between">
                <span className="text-muted-foreground">Klien:</span>
                <span className="font-bold text-foreground">{aiTargetLead?.client_name}</span>
              </div>
              {generatingAi ? (
                <div className="h-28 bg-background border border-border rounded-xl flex items-center justify-center text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Menyusun draf...</span>
                </div>
              ) : (
                <Textarea
                  value={aiGeneratedMessage}
                  onChange={(e) => setAiGeneratedMessage(e.target.value)}
                  rows={5}
                  className="text-xs leading-relaxed resize-none border-border bg-background text-foreground focus-visible:ring-emerald-500"
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
                  className="text-xs h-9 border-border bg-background text-foreground cursor-pointer"
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Kirim WhatsApp
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAiModalOpen(false)} className="w-full text-xs h-9 cursor-pointer border-border bg-background text-foreground">
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}