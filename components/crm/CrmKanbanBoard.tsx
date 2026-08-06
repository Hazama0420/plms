"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Phone,
  Building2,
  ArrowRight,
  RefreshCw,
  Search,
  MessageCircle,
  Eye,
  Plus,
  GripVertical,
  ChevronRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

const STATUS_STAGES: { id: LeadStatus; label: string; color: string; dotColor: string }[] = [
  { id: "new", label: "New Lead", color: "border-blue-500/30", dotColor: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "border-amber-500/30", dotColor: "bg-amber-500" },
  { id: "qualified", label: "Qualified", color: "border-cyan-500/30", dotColor: "bg-cyan-500" },
  { id: "proposal", label: "Proposal", color: "border-purple-500/30", dotColor: "bg-purple-500" },
  { id: "negotiation", label: "Negotiation", color: "border-orange-500/30", dotColor: "bg-orange-500" },
  { id: "won", label: "Won (Deal)", color: "border-emerald-500/30", dotColor: "bg-emerald-500" },
  { id: "lost", label: "Lost", color: "border-rose-500/30", dotColor: "bg-rose-500" },
];

/**
 * Bentuk minimal lead — hanya field yang benar-benar dibaca board ini.
 *
 * Baris dari Supabase jauh lebih lebar dan masih mengalir sebagai `any` di
 * jalur pengambilan data; tipe ini dipakai pada pengelompokan dan penjumlahan
 * agar bagian yang dirender punya kontrak yang jelas.
 */
interface KanbanLead {
  id: string;
  status: LeadStatus;
  client_name?: string;
  client_phone?: string;
  interest_type?: string | null;
  budget?: number | null;
}

/**
 * Rupiah ringkas untuk ruang sempit: 2_400_000_000 -> "2,4 M", 400_000_000 -> "400 jt".
 *
 * Versi lama selalu membagi dengan satu miliar, sehingga budget 400 juta
 * tampil sebagai "0.4M". Mengikuti pola formatTerbilangRupiah di
 * components/create-property/steps/StepPriceDescription.tsx.
 */
function formatCompactRupiah(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (num >= 1_000_000) return `${Math.round(num / 1_000_000)} jt`;
  return new Intl.NumberFormat("id-ID").format(num);
}

export function CrmKanbanBoard() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [draggedLead, setDraggedLead] = useState<any | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<LeadStatus>("new");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Cek apakah user berkedudukan Admin/SuperAdmin
  const isAdminOrSuperAdmin = useMemo(() => {
    return (
      currentUserRole === "super_admin" ||
      currentUserRole === "superadmin" ||
      currentUserRole === "admin"
    );
  }, [currentUserRole]);

  // 🔒 HAK AKSES DRAG & DROP: BISA UNTUK SEMUA ROLE KECUALI 'viewer' / 'tamu' / 'guest'
  const canDragAndMove = useMemo(() => {
    const role = currentUserRole.toLowerCase().trim();
    return role !== "viewer" && role !== "tamu" && role !== "guest";
  }, [currentUserRole]);

  // 🛡️ HELPER MASKING NOMOR TELEPON LENGKAP
  const formatPhoneForUser = useCallback(
    (phone?: string) => {
      if (!phone) return "-";
      if (isAdminOrSuperAdmin) return phone;
      return "08xx-xxxx-xxxx";
    },
    [isAdminOrSuperAdmin]
  );

  // Fetch Data Leads & Contacts dari Supabase
  const fetchKanbanLeads = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
      setCurrentUserRole(role);

      const isUserAdmin = role === "super_admin" || role === "superadmin" || role === "admin";

      let query = supabase
        .from("crm_leads")
        .select(`
          *,
          contact:crm_contacts (*)
        `)
        .order("created_at", { ascending: false });

      if (!isUserAdmin) {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id},assigned_to.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalizedData = (data || []).map((item) => {
        const rawStatus = (item.status || "new").toString().toLowerCase().trim();
        const validStatus = STATUS_STAGES.some((s) => s.id === rawStatus)
          ? (rawStatus as LeadStatus)
          : "new";

        const contactObj = item.contact || item.crm_contacts || {};

        return {
          ...item,
          status: validStatus,
          client_name: contactObj.full_name || item.full_name || item.name || "Tanpa Nama",
          client_phone: contactObj.phone || item.phone || "",
        };
      });

      setLeads(normalizedData);
    } catch (err: any) {
      console.error("Error loading kanban leads:", err);
      toast.error("Gagal memuat data Pipeline CRM");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKanbanLeads();
  }, [fetchKanbanLeads]);

  // Update Status Prospek & Catat Aktivitas ke crm_activities
  const handleMoveStatus = async (lead: any, nextStatus: LeadStatus) => {
    if (!canDragAndMove) {
      toast.error("Akses Ditolak!", {
        description: "Akun dengan role Viewer/Tamu tidak memiliki izin mengubah status prospek.",
      });
      return;
    }

    const leadId = lead.id;
    const clientName = lead.client_name;
    const prevStatus = lead.status;

    try {
      // Optimistic UI Update
      setLeads((prev) =>
        prev.map((item) => (item.id === leadId ? { ...item, status: nextStatus } : item))
      );

      const { error } = await supabase
        .from("crm_leads")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", leadId);

      if (error) throw error;

      // 🔴 RECORD AKTIVITAS KE TABLE crm_activities
      if (currentUserId) {
        await supabase.from("crm_activities").insert([
          {
            lead_id: leadId,
            user_id: currentUserId,
            activity_type: "Status Update",
            notes: `Status prospek ${clientName} dipindahkan dari [${prevStatus.toUpperCase()}] ke [${nextStatus.toUpperCase()}]`,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      const targetLabel = STATUS_STAGES.find((s) => s.id === nextStatus)?.label;
      toast.success(`Status ${clientName} dipindahkan ke "${targetLabel}"`);
    } catch (err: any) {
      toast.error("Gagal memperbarui status: " + err.message);
      fetchKanbanLeads();
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, lead: any) => {
    if (!canDragAndMove) {
      e.preventDefault();
      toast.error("Role Viewer/Tamu tidak dapat menggeser posisi kartu.");
      return;
    }
    setDraggedLead(lead);
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStage !== stageId) setDragOverStage(stageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStatus) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedLead) return;

    if (draggedLead.status !== targetStage) {
      handleMoveStatus(draggedLead, targetStage);
    }
    setDraggedLead(null);
  };

  // 🛡️ PENANGANAN WHATSAPP DIPROTEKSI UNTUK AGENT
  const handleOpenWhatsApp = (phone?: string, name?: string) => {
    if (!isAdminOrSuperAdmin) {
      toast.error("Akses Kontak Terkunci!", {
        description:
          "Nomor kontak disembunyikan demi keamanan data perusahaan. Gunakan sistem pesan terpusat atau hubungi Admin.",
      });
      return;
    }

    if (!phone) {
      toast.error("Nomor WhatsApp tidak tersedia");
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
    const text = encodeURIComponent(`Halo Bpk/Ibu ${name || ""}, perkenalkan saya dari Tim Inland Property...`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((item) => {
      const name = item.client_name?.toLowerCase() || "";
      const phone = item.client_phone || "";
      const interest = item.interest_type?.toLowerCase() || "";
      return name.includes(q) || phone.includes(q) || interest.includes(q);
    });
  }, [leads, searchQuery]);

  /**
   * Leads dikelompokkan per stage sekali saja.
   *
   * Bar distribusi, chip, baris meta, flow line, dan kolom board semuanya butuh
   * angka yang sama. Tanpa ini tiap bagian memanggil .filter() sendiri —
   * lima kali tujuh pemindaian pada setiap render.
   */
  const stageBuckets = useMemo(() => {
    const buckets = new Map<LeadStatus, KanbanLead[]>(STATUS_STAGES.map((s) => [s.id, []]));
    for (const lead of filteredLeads) {
      buckets.get(lead.status as LeadStatus)?.push(lead);
    }
    return buckets;
  }, [filteredLeads]);

  const sumBudget = useCallback(
    (rows: KanbanLead[]) => rows.reduce((acc, curr) => acc + (curr.budget || 0), 0),
    []
  );

  return (
    <div className="space-y-4 text-foreground">
      {/* 🚀 BAR DISTRIBUSI PIPELINE + CHIP SELECTOR MOBILE */}
      <div className="md:hidden space-y-3">
        {/* Bar proporsi stage */}
        <div className="flex h-1.5 rounded-full bg-muted overflow-hidden">
          {STATUS_STAGES.map((stage) => {
            const count = stageBuckets.get(stage.id)?.length || 0;
            if (count === 0) return null;
            return (
              <div
                key={stage.id}
                className={cn("transition-all", stage.dotColor)}
                style={{ flexGrow: count }}
              />
            );
          })}
        </div>

        {/* Baris chip selector */}
        <div className="-mx-3 px-3 flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_STAGES.map((stage) => {
            const count = stageBuckets.get(stage.id)?.length || 0;
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={cn(
                  "shrink-0 h-7 rounded-full px-2.5 text-[11px] flex items-center gap-1.5 border transition-colors",
                  isActive
                    ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", stage.dotColor)} />
                <span>{stage.label}</span>
                <span className="font-mono">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Meta stage aktif — sekali, di luar loop kolom */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {STATUS_STAGES.find((s) => s.id === activeStage)?.label}
          </span>
          <span>·</span>
          <span>{stageBuckets.get(activeStage)?.length || 0} prospek</span>
          {sumBudget(stageBuckets.get(activeStage) || []) > 0 && (
            <>
              <span>·</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                Rp {formatCompactRupiah(sumBudget(stageBuckets.get(activeStage) || []))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 🚀 INDIKATOR ALUR TALI TERHUBUNG (FLOW LINE) DESKTOP */}
      <div className="hidden md:flex items-center justify-between bg-card border border-border p-2.5 rounded-xl overflow-x-auto">
        {STATUS_STAGES.map((stage, idx) => {
          const count = stageBuckets.get(stage.id)?.length || 0;
          return (
            <div key={stage.id} className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1">
                <span className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                <span className="text-[11px] lg:text-xs font-bold text-foreground">{stage.label}</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 rounded font-bold">
                  {count}
                </span>
              </div>
              {idx < STATUS_STAGES.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* TOOLBAR PENCARIAN & STATISTIK ROLE */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama prospek, minat..."
            className="pl-8 h-8 text-xs rounded-lg bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
          {/* BADGE KEAMANAN ROLE — teks panjang disembunyikan di ponsel */}
          {!isAdminOrSuperAdmin && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
              <Lock className="w-3 h-3 shrink-0" /> Mode Agen
              <span className="hidden sm:inline">(Kontak Disensor)</span>
            </span>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={fetchKanbanLeads}
            className="h-8 w-8 rounded-lg border-border bg-background text-foreground hover:bg-muted cursor-pointer"
            title="Refresh Board"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>

          <Button
            onClick={() => router.push("/crm/leads/create")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-8 px-3 rounded-lg cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Lead Baru
          </Button>
        </div>
      </div>

      {/* KANBAN BOARD
          Mobile: hanya stage terpilih yang tampil, tanpa bingkai kolom.
          Desktop (md+): kolom selebar 250px yang digeser horizontal. Grid 7 kolom
          yang lama hanya menyisakan ~100px per kolom, dan itu sebabnya seluruh
          teks dulu terpaksa turun ke 9px. */}
      <div className="flex flex-col md:flex-row md:items-start md:gap-3 md:overflow-x-auto md:pb-3">
        {STATUS_STAGES.map((stage) => {
          const stageLeads = stageBuckets.get(stage.id) || [];
          const totalBudget = sumBudget(stageLeads);
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={cn(
                "flex flex-col transition-all md:w-[250px] md:shrink-0",
                // Bingkai, padding, dan tinggi minimum hanya untuk desktop.
                "border-0 p-0 bg-transparent min-h-0",
                "md:rounded-xl md:border md:p-2 md:bg-card/60 md:min-h-[440px]",
                stage.color,
                // Di ponsel hanya stage aktif yang dirender terlihat. Kolom lain
                // tetap ada di DOM untuk desktop, jadi tidak ada JSX terduplikasi.
                stage.id !== activeStage && "hidden md:flex",
                isOver && "md:bg-emerald-500/10 md:border-emerald-500 md:border-dashed"
              )}
            >
              {/* HEADER KOLOM — di ponsel perannya diambil chip + baris meta di atas */}
              <div className="hidden md:flex items-center justify-between pb-2 mb-2 border-b border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", stage.dotColor)} />
                  <h3 className="font-bold text-xs text-foreground truncate">{stage.label}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-semibold">
                    {stageLeads.length}
                  </span>
                </div>
                {totalBudget > 0 && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                    {formatCompactRupiah(totalBudget)}
                  </span>
                )}
              </div>

              {/* LIST KARTU LEADS RINGKAS */}
              <div className="space-y-2 flex-1 md:overflow-y-auto">
                {loading && stageLeads.length === 0 ? (
                  // Tanpa ini, board yang sedang memuat tampil sebagai "belum ada
                  // prospek" — pesan kosong yang salah.
                  <div className="h-14 rounded-lg bg-muted/60 animate-pulse md:h-16" />
                ) : stageLeads.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-3 md:h-16">
                    <span className="text-[10px] text-muted-foreground">Belum ada prospek</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={canDragAndMove}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      className={cn(
                        "p-2 rounded-lg bg-card border border-border hover:border-emerald-500/40 transition select-none space-y-1",
                        canDragAndMove ? "md:cursor-grab md:active:cursor-grabbing" : "cursor-default opacity-85",
                        draggedLead?.id === lead.id && "opacity-30"
                      )}
                    >
                      {/* BARIS 1: nama + WA + menu */}
                      <div className="flex items-center gap-1">
                        {canDragAndMove ? (
                          // Seret memakai HTML5 drag events, yang tidak pernah
                          // menyala di layar sentuh. Gagangnya hanya ditampilkan
                          // di tempat yang benar-benar bisa menyeret.
                          <GripVertical className="hidden md:block w-3 h-3 text-muted-foreground shrink-0" />
                        ) : (
                          <span title="Terkunci untuk Viewer/Tamu" className="inline-flex items-center shrink-0">
                            <Lock className="w-2.5 h-2.5 text-amber-500" />
                          </span>
                        )}

                        <h4
                          onClick={() => router.push(`/crm/leads/${lead.id}`)}
                          className="flex-1 min-w-0 font-bold text-xs md:text-[13px] text-foreground truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {lead.client_name}
                        </h4>

                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(lead.client_phone, lead.client_name)}
                          className={cn(
                            "h-7 w-7 shrink-0 rounded flex items-center justify-center transition-colors cursor-pointer",
                            isAdminOrSuperAdmin
                              ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              : "text-muted-foreground hover:text-amber-500"
                          )}
                          title={
                            isAdminOrSuperAdmin
                              ? "Chat WhatsApp Direct"
                              : "Kontak Terkunci demi Keamanan"
                          }
                        >
                          {isAdminOrSuperAdmin ? (
                            <MessageCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3 h-3 text-amber-500" />
                          )}
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border text-card-foreground text-xs w-36">
                            <DropdownMenuItem onClick={() => router.push(`/crm/leads/${lead.id}`)}>
                              <Eye className="w-3 h-3 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Detail Lead
                            </DropdownMenuItem>

                            {/* Pilihan Move Stage */}
                            {STATUS_STAGES.filter((s) => s.id !== lead.status).map((s) => (
                              <DropdownMenuItem
                                key={s.id}
                                onClick={() => handleMoveStatus(lead, s.id)}
                                disabled={!canDragAndMove}
                                className={cn(!canDragAndMove && "opacity-50 cursor-not-allowed")}
                              >
                                <ArrowRight className="w-3 h-3 mr-1.5 text-muted-foreground" /> {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* BARIS 2: budget */}
                      {Boolean(lead.budget) && (
                        <div className="text-[11px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          Rp {(lead.budget || 0).toLocaleString("id-ID")}
                        </div>
                      )}

                      {/* BARIS 3: minat + nomor telepon (disensor untuk non-admin) */}
                      <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-muted-foreground">
                        {lead.interest_type && (
                          <span className="flex items-center gap-1 min-w-0">
                            <Building2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{lead.interest_type}</span>
                          </span>
                        )}
                        {lead.interest_type && <span className="shrink-0">·</span>}
                        <span className="flex items-center gap-1 shrink-0 font-mono">
                          <Phone className="w-2.5 h-2.5 shrink-0" />
                          {formatPhoneForUser(lead.client_phone)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}