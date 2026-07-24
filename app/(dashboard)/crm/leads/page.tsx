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
  Mail,
  Zap,
  MessageCircle,
  Calendar,
  Clock,
  User,
  Building2,
  Send,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  new: { label: "New", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200" },
  contacted: { label: "Contacted", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200" },
  qualified: { label: "Qualified", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-950/60 border-cyan-200" },
  proposal: { label: "Proposal", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/60 border-purple-200" },
  negotiation: { label: "Negotiation", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950/60 border-orange-200" },
  won: { label: "Won", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200" },
  lost: { label: "Lost", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200" },
};

const statusOptions = Object.entries(statusConfig).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// Sample Daily Follow-ups untuk Action Hub
const todayFollowUpsSample = [
  {
    id: "fu-101",
    client_name: "Hendra Wijaya",
    phone: "081298765432",
    time: "09:30",
    property_interest: "Cluster Green BSD City",
    budget: 2850000000,
    notes: "Kirim brosur digital & jadwalkan survei akhir pekan.",
    status: "pending",
  },
  {
    id: "fu-102",
    client_name: "Bambang Soetrisno",
    phone: "081566778899",
    time: "11:00",
    property_interest: "Ruko Sentra Fatmawati",
    budget: 350000000,
    notes: "Follow up opsi pembayaran KPR Bank BCA.",
    status: "pending",
  },
  {
    id: "fu-103",
    client_name: "Siska Dewi",
    phone: "081311223344",
    time: "14:15",
    property_interest: "Apartemen Harmoni Tower B",
    budget: 850000000,
    notes: "Konfirmasi tanggal ttd PPJB di kantor pemasaran.",
    status: "pending",
  },
];

export default function LeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedMobileTab, setSelectedMobileTab] = useState<"followups" | "leads">("followups");
  
  // State Filter & Leads Data
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

  // Mobile Drawer State
  const [selectedLeadForSheet, setSelectedLeadForSheet] = useState<any | null>(null);

  // AI Follow-up Writer Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetLead, setAiTargetLead] = useState<any | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // Fetch Data Leads
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

  // Handlers
  const handleSearchSubmit = () => {
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await crmService.updateStatus(id, status as any);
      toast.success("Status lead berhasil diperbarui");
      fetchLeads();
    } catch (error: any) {
      toast.error("Gagal memperbarui status lead");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus lead "${name}"?`)) return;
    try {
      await supabase.from("crm_leads").delete().eq("id", id);
      toast.success("Lead berhasil dihapus");
      fetchLeads();
    } catch (error: any) {
      toast.error("Gagal menghapus lead");
    }
  };

  // Direct WhatsApp Direct
  const openWhatsApp = (phone?: string, name?: string, customText?: string) => {
    if (!phone) {
      toast.error("Nomor HP tidak tersedia");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const text = customText
      ? encodeURIComponent(customText)
      : encodeURIComponent(`Halo Bpk/Ibu ${name || ""}, perkenalkan saya dari Tim Inland Property...`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  // AI Smart Follow-up Writer
  const handleGenerateAiMessage = async (lead: any) => {
    setAiTargetLead(lead);
    setAiModalOpen(true);
    setGeneratingAi(true);
    setAiGeneratedMessage("");

    try {
      // Panggil API /api/ai/generate (Groq Llama-3 / Gemini)
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Buatkan draf pesan WhatsApp personal yang ramah dan persuasif dari agen Inland Property untuk calon pembeli rumah bernama "${lead.client_name || lead.contact?.full_name || 'Klien'}". Minat properti: "${lead.property_interest || 'Properti Premium'}". Budget: Rp ${lead.budget || lead.budget_max || '-'}. Berikan opsi tanggal survei lokasi akhir pekan ini.`,
        }),
      });

      const json = await res.json();
      if (json?.text || json?.result) {
        setAiGeneratedMessage(json.text || json.result);
      } else {
        // Fallback generator jika API offline
        setAiGeneratedMessage(
          `Halo Bpk/Ibu ${lead.client_name || lead.contact?.full_name || "Klien"},\n\nPerkenalkan saya dari Inland Property. Menindaklanjuti ketertarikan Anda pada properti *${lead.property_interest || "pilihan"}*, apakah akhir pekan ini ada waktu luang untuk mendampingi Anda survei lokasi secara langsung?\n\nSaya telah menyiapkan berkas dan estimasi simulasi pembayaran kpr sesuai budget Anda. Terima kasih!`
        );
      }
    } catch (err) {
      setAiGeneratedMessage(
        `Halo Bpk/Ibu ${lead.client_name || lead.contact?.full_name || "Klien"},\n\nPerkenalkan saya dari Inland Property. Menindaklanjuti ketertarikan Anda pada properti *${lead.property_interest || "pilihan"}*, apakah akhir pekan ini ada waktu luang untuk mendampingi Anda survei lokasi secara langsung?\n\nTerima kasih!`
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            👥 CRM & Pipeline Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistem manajemen prospek, agenda tugas harian agen, dan generator AI WhatsApp.
          </p>
        </div>

        <Button
          onClick={() => router.push("/crm/leads/create")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Tambah Lead Baru
        </Button>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE SUB-TABS SYSTEM (PRD 3.B block md:hidden)          */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-4">
        <Tabs value={selectedMobileTab} onValueChange={(v) => setSelectedMobileTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-muted p-1">
            <TabsTrigger value="followups" className="text-xs font-bold gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Agenda Follow-ups
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs font-bold gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Database Leads
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AGENDA ROW FOLLOW-UPS (PRD 3.B) */}
          <TabsContent value="followups" className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Jadwal Tugas Hari Ini</span>
              <span>{todayFollowUpsSample.length} Prospek Menunggu</span>
            </div>

            {todayFollowUpsSample.map((fu) => (
              <Card key={fu.id} className="border shadow-sm p-3 hover:border-emerald-500/40 transition">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
                      <Clock className="w-2.5 h-2.5 mr-1" /> {fu.time} WIB
                    </Badge>
                    <span className="font-bold text-xs text-foreground">{fu.client_name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 font-mono">
                    {formatCurrency(fu.budget)}
                  </span>
                </div>

                <div className="py-2 space-y-1 text-xs">
                  <p className="text-[11px] font-medium text-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" /> {fu.property_interest}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{fu.notes}</p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateAiMessage(fu)}
                    className="h-7 text-[10px] gap-1 text-amber-700 dark:text-amber-400 border-amber-300/60 bg-amber-50/50"
                  >
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> AI Writer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openWhatsApp(fu.phone, fu.client_name)}
                    className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <MessageCircle className="w-3 h-3" /> WA
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* TAB 2: MOBILE LEADS DIRECTORY */}
          <TabsContent value="leads" className="space-y-3 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau nomor HP..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {leadsData.data.map((lead: any) => {
                  const st = statusConfig[lead.status] || statusConfig.new;
                  return (
                    <Card
                      key={lead.id}
                      onClick={() => setSelectedLeadForSheet(lead)}
                      className="border shadow-sm p-3 hover:bg-muted/40 cursor-pointer active:bg-muted/60 transition flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-foreground">{lead.contact?.full_name || "Tanpa Nama"}</p>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border", st.bg, st.color)}>
                            {st.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" /> {lead.contact?.phone || "-"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ============================================================ */}
      {/* 💻 DESKTOP SPLIT VIEW DASHBOARD (PRD 3.A hidden md:grid)      */}
      {/* ============================================================ */}
      <div className="hidden md:grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTION HUB / FOLLOW-UPS (4-KOLOM) */}
        <div className="col-span-4 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-3 border-b bg-slate-50/50 dark:bg-slate-900/40">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Agenda Follow-up
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-700 dark:text-emerald-300">
                  Hari Ini ({todayFollowUpsSample.length})
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar tugas agen untuk dikontak berdasarkan prioritas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-xs">
              {todayFollowUpsSample.map((fu) => (
                <div key={fu.id} className="p-3 bg-card border rounded-xl space-y-2 hover:border-emerald-500/30 transition shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{fu.client_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {fu.time} WIB
                    </span>
                  </div>

                  <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                    {fu.notes}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="font-mono font-bold text-emerald-600">
                      {formatCurrency(fu.budget)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateAiMessage(fu)}
                        title="Draf WhatsApp via AI"
                        className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                      >
                        <Zap className="w-3.5 h-3.5 fill-amber-500" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openWhatsApp(fu.phone, fu.client_name)}
                        className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> WA
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: KATALOG DATABASE LEADS (8-KOLOM) */}
        <div className="col-span-8 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Direktori Database Leads
                </CardTitle>
                <CardDescription className="text-xs">
                  Daftar seluruh calon pembeli dan status pipeline konversi.
                </CardDescription>
              </div>

              {/* Filter Search Input */}
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari lead..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchLeads} className="h-8 w-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Nama Kontak</TableHead>
                      <TableHead className="text-xs font-semibold">Status Pipeline</TableHead>
                      <TableHead className="text-xs font-semibold">Budget</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsData.data.map((lead: any) => {
                      const st = statusConfig[lead.status] || statusConfig.new;
                      return (
                        <TableRow
                          key={lead.id}
                          onClick={() => router.push(`/crm/leads/${lead.id}`)}
                          className="hover:bg-muted/30 cursor-pointer"
                        >
                          <TableCell className="p-3">
                            <p className="font-bold text-xs text-foreground">{lead.contact?.full_name || "Tanpa Nama"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{lead.contact?.phone || "-"}</p>
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
                                className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                                onClick={() => openWhatsApp(lead.contact?.phone, lead.contact?.full_name)}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                                onClick={() => router.push(`/crm/leads/${lead.id}`)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
    <MoreHorizontal className="w-3.5 h-3.5" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => router.push(`/crm/leads/${lead.id}/edit`)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Lead
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(lead.id, lead.contact?.full_name)}
                                    className="text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
      {/* 🎯 MOBILE WORKFLOW SHEET (PRD 3.B Riwayat & Minat Properti)  */}
      {/* ============================================================ */}
      <Sheet open={!!selectedLeadForSheet} onOpenChange={() => setSelectedLeadForSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-5">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono">
                ID Lead: {selectedLeadForSheet?.id?.slice(0, 8)}
              </Badge>
              {selectedLeadForSheet && (
                <Badge variant="outline" className={cn("text-[10px]", statusConfig[selectedLeadForSheet.status]?.bg, statusConfig[selectedLeadForSheet.status]?.color)}>
                  {statusConfig[selectedLeadForSheet.status]?.label}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-base font-bold mt-1">
              {selectedLeadForSheet?.contact?.full_name || "Detail Lead Prospek"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Riwayat minat properti dan estimasi anggaran pembelian.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="p-3 bg-muted/60 rounded-xl space-y-2">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">No. WhatsApp / HP:</span>
                <span className="font-mono font-bold text-foreground">{selectedLeadForSheet?.contact?.phone || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Estimasi Budget:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedLeadForSheet?.budget ? formatCurrency(selectedLeadForSheet.budget) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minat Properti:</span>
                <span className="font-semibold text-foreground">{selectedLeadForSheet?.property?.title || "Belum Ditentukan"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-foreground">Catatan Tambahan:</p>
              <p className="p-2.5 bg-background border rounded-xl text-muted-foreground leading-relaxed text-[11px]">
                {selectedLeadForSheet?.notes || "Tidak ada catatan tambahan."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  if (selectedLeadForSheet) {
                    router.push(`/crm/leads/${selectedLeadForSheet.id}`);
                    setSelectedLeadForSheet(null);
                  }
                }}
              >
                Lihat Detail Full
              </Button>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                onClick={() => openWhatsApp(selectedLeadForSheet?.contact?.phone, selectedLeadForSheet?.contact?.full_name)}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Direct WhatsApp
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* 🤖 AI SMART FOLLOW-UP WRITER DIALOG MODAL                    */}
      {/* ============================================================ */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> AI Smart Follow-up Writer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Draf pesan WhatsApp persuasif yang dibuat otomatis oleh Groq Llama-3 AI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs pt-2">
            <div className="p-2.5 bg-muted/60 rounded-xl flex items-center justify-between">
              <span className="text-muted-foreground">Target Klien:</span>
              <span className="font-bold text-foreground">
                {aiTargetLead?.client_name || aiTargetLead?.contact?.full_name}
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">Pesan Draf AI WhatsApp:</label>
              {generatingAi ? (
                <div className="h-32 bg-muted/40 rounded-xl flex items-center justify-center text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>AI sedang menyusun draf pesan...</span>
                </div>
              ) : (
                <Textarea
                  value={aiGeneratedMessage}
                  onChange={(e) => setAiGeneratedMessage(e.target.value)}
                  rows={6}
                  className="text-xs leading-relaxed"
                />
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAiModalOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              disabled={generatingAi || !aiGeneratedMessage}
              onClick={() => {
                setAiModalOpen(false);
                openWhatsApp(
                  aiTargetLead?.phone || aiTargetLead?.contact?.phone,
                  aiTargetLead?.client_name || aiTargetLead?.contact?.full_name,
                  aiGeneratedMessage
                );
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Kirim via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}