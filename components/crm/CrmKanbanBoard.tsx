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

export function CrmKanbanBoard() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [draggedLead, setDraggedLead] = useState<any | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 text-foreground">
      {/* 🚀 INDIKATOR ALUR TALI TERHUBUNG (FLOW LINE) */}
      <div className="hidden lg:flex items-center justify-between bg-card border border-border p-2.5 rounded-xl overflow-x-auto shadow-2xs">
        {STATUS_STAGES.map((stage, idx) => {
          const count = filteredLeads.filter((l) => l.status === stage.id).length;
          return (
            <div key={stage.id} className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border">
                <span className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                <span className="text-[11px] font-bold text-foreground">{stage.label}</span>
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
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama prospek, minat..."
            className="pl-8 h-8 text-xs rounded-lg bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* BADGE KEAMANAN ROLE */}
          {!isAdminOrSuperAdmin && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
              <Lock className="w-3 h-3" /> Mode Agen (Kontak Disensor)
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

      {/* KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 items-start overflow-x-auto pb-4">
        {STATUS_STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.status === stage.id);
          const totalBudget = stageLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={cn(
                "rounded-xl border p-2 flex flex-col transition-all min-h-[440px] bg-card/60 shadow-2xs",
                stage.color,
                isOver && "bg-emerald-500/10 border-emerald-500 border-dashed"
              )}
            >
              {/* HEADER KOLOM */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", stage.dotColor)} />
                  <h3 className="font-bold text-[11px] text-foreground truncate">{stage.label}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-semibold">
                    {stageLeads.length}
                  </span>
                </div>
                {totalBudget > 0 && (
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                    {(totalBudget / 1000000000).toFixed(1)}M
                  </span>
                )}
              </div>

              {/* LIST KARTU LEADS RINGKAS */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <div className="h-16 flex items-center justify-center border border-dashed border-border rounded-lg text-center">
                    <span className="text-[10px] text-muted-foreground">Kosong</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={canDragAndMove}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      className={cn(
                        "p-2 rounded-lg bg-card border border-border hover:border-emerald-500/40 transition select-none space-y-1.5 shadow-2xs",
                        canDragAndMove ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-85",
                        draggedLead?.id === lead.id && "opacity-30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          {canDragAndMove ? (
                            <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                          ) : (
                            <span title="Terkunci untuk Viewer/Tamu" className="inline-flex items-center shrink-0">
  <Lock className="w-2.5 h-2.5 text-amber-500" />
</span>
                          )}
                          <h4
                            onClick={() => router.push(`/crm/leads/${lead.id}`)}
                            className="font-bold text-xs text-foreground truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            {lead.client_name}
                          </h4>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer">
                            <MoreVertical className="w-3 h-3" />
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

                      {Boolean(lead.budget) && (
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono pl-4">
                          Rp {lead.budget.toLocaleString("id-ID")}
                        </div>
                      )}

                      {lead.interest_type && (
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border truncate">
                          <Building2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{lead.interest_type}</span>
                        </div>
                      )}

                      {/* MASKING NOMOR TELP & WA */}
                      <div className="flex items-center justify-between pt-1 border-t border-border text-[10px]">
                        <span className="text-muted-foreground font-mono flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-muted-foreground" />{" "}
                          {formatPhoneForUser(lead.client_phone)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(lead.client_phone, lead.client_name)}
                          className={cn(
                            "p-0.5 rounded flex items-center gap-0.5 font-semibold transition-colors cursor-pointer",
                            isAdminOrSuperAdmin
                              ? "text-emerald-600 dark:text-emerald-400 hover:underline"
                              : "text-muted-foreground hover:text-amber-500"
                          )}
                          title={
                            isAdminOrSuperAdmin
                              ? "Chat WhatsApp Direct"
                              : "Kontak Terkunci demi Keamanan"
                          }
                        >
                          {isAdminOrSuperAdmin ? (
                            <>
                              <MessageCircle className="w-3 h-3" /> WA
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5 text-amber-500" /> WA
                            </>
                          )}
                        </button>
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