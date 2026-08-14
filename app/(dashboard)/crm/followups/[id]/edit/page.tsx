"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Search,
  User,
  UserCheck,
  Clock,
  ChevronDown,
  Check,
  Lock,
  ShieldAlert,
} from "lucide-react";

import { crmService } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================
interface LeadItem {
  id: string;
  lead_name: string;
  phone: string | null;
  status?: string;
}

interface AgentItem {
  id: string;
  full_name?: string;
  email?: string;
}

export default function EditFollowupPage() {
  const router = useRouter();
  const params = useParams();
  const followupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User Session & Role States
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");

  // Options Data
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);

  // Search Filter States
  const [leadSearch, setLeadSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");

  // Dropdown Open States
  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  // DOM Container Refs (Click Outside)
  const leadRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  // Form State
  const [form, setForm] = useState({
    lead_id: "",
    assigned_to: "",
    followup_date: "",
    status: "pending",
    notes: "",
  });

  // Strict Admin Role Check
  const isAdmin = useMemo(() => {
    return (
      currentUserRole === "admin" ||
      currentUserRole === "super_admin" ||
      currentUserRole === "superadmin"
    );
  }, [currentUserRole]);

  // 🔒 SENSOR NOMOR HP TERSTANDAR UNTUK AGENT
  const formatPhoneForUser = useCallback(
    (phone?: string | null) => {
      if (!phone) return "-";
      if (isAdmin) return phone;
      return "08xx-xxxx-xxxx";
    },
    [isAdmin]
  );

  // Format Tanggal ISO ke datetime-local input
  const formatForDateTimeLocal = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    return isoLocal;
  };

  // ===== CLICK OUTSIDE EVENT LISTENER =====
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leadRef.current && !leadRef.current.contains(event.target as Node)) {
        setIsLeadOpen(false);
      }
      if (agentRef.current && !agentRef.current.contains(event.target as Node)) {
        setIsAgentOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ===== FETCH INITIAL DATA & FOLLOWUP DETAIL =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Check Auth Session & Get User Role
      const { data: { user } } = await supabase.auth.getUser();
      let loggedInUserId = user?.id || null;
      let loggedInRole = "agent";
      let loggedInName = "Agent";

      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("role, full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        loggedInRole = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
        loggedInName = userData?.full_name || user.email || "Agent";

        setCurrentUserRole(loggedInRole);
        setCurrentUserName(loggedInName);
      }

      // 2. Fetch Agents, Leads, & Existing Followup Data
      const [agentsData, leadsResult, followupData] = await Promise.all([
        crmService.getAgents(),
        crmService.getLeads({ limit: 100 }),
        crmService.getFollowupById(followupId),
      ]);

      if (!followupData) {
        toast.error("Data follow-up tidak ditemukan");
        router.push("/crm/followups");
        return;
      }

      // Validasi Hak Akses Halaman (RBAC)
      const isOwner =
        followupData.assigned_to === loggedInUserId ||
        followupData.created_by === loggedInUserId;

      const isAdminUser = loggedInRole === "admin" || loggedInRole === "super_admin" || loggedInRole === "superadmin";

      if (!isAdminUser && !isOwner) {
        toast.error("Akses Ditolak!", {
          description: "Anda tidak berhak mengedit follow-up milik agent lain.",
        });
        router.push("/crm/followups");
        return;
      }

      setAgents(agentsData || []);

      const mappedLeads: LeadItem[] = (leadsResult.data || []).map((lead: any) => {
        const contactObj = lead.contact || lead.crm_contacts || {};
        const name =
          contactObj.full_name ||
          lead.full_name ||
          lead.name ||
          lead.contact_name ||
          "Prospek Tanpa Nama";
        const phone = contactObj.phone || lead.phone || null;

        return {
          id: lead.id,
          lead_name: name,
          phone: phone,
          status: lead.status || "new",
        };
      });

      setLeads(mappedLeads);

      // Populate Form State
      setForm({
        lead_id: followupData.lead_id || "",
        assigned_to: followupData.assigned_to || loggedInUserId || "",
        followup_date: formatForDateTimeLocal(followupData.followup_date),
        status: followupData.status || "pending",
        notes: followupData.notes || "",
      });
    } catch (error: any) {
      console.error("Error fetching followup for edit:", error);
      toast.error("Gagal memuat data follow-up");
    } finally {
      setLoading(false);
    }
  }, [followupId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected Item Helpers
  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === form.lead_id);
  }, [leads, form.lead_id]);

  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.id === form.assigned_to);
  }, [agents, form.assigned_to]);

  // Filtered lists
  const filteredLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        l.lead_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
        (l.phone && l.phone.includes(leadSearch))
    );
  }, [leads, leadSearch]);

  const filteredAgents = useMemo(() => {
    return agents.filter(
      (a) =>
        (a.full_name && a.full_name.toLowerCase().includes(agentSearch.toLowerCase())) ||
        (a.email && a.email.toLowerCase().includes(agentSearch.toLowerCase()))
    );
  }, [agents, agentSearch]);

  // ===== HANDLERS =====
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Quick Preset Tanggal
  const setPresetDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    target.setHours(10, 0, 0, 0);

    const isoLocal = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    handleChange("followup_date", isoLocal);
  };

  // ===== SUBMIT FORM + LOG ACTIVITIES =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lead_id || !form.followup_date) {
      toast.error("Lead prospek dan tanggal follow-up wajib diisi!");
      return;
    }

    setSaving(true);
    try {
      // STRICT PROTECTION: Jika bukan Admin, kunci assigned_to ke agen saat ini / awal
      const targetAssignedTo = isAdmin
        ? form.assigned_to
        : (form.assigned_to || currentUserId);

      const result = await crmService.updateFollowup(followupId, {
        ...(isAdmin && targetAssignedTo ? { assigned_to: targetAssignedTo } : {}),
        followup_date: form.followup_date,
        status: form.status as "pending" | "completed" | "cancelled",
        notes: form.notes || undefined,
      });

      // 🔴 Sisipkan pencatatan log aktivitas ke crm_activities
      if (currentUserId && form.lead_id) {
        const targetLead = leads.find((l) => l.id === form.lead_id);
        const leadName = targetLead?.lead_name || "Klien";
        const formattedDate = form.followup_date ? form.followup_date.replace("T", " pkl ") : "-";

        await supabase.from("crm_activities").insert([
          {
            lead_id: form.lead_id,
            user_id: currentUserId,
            activity_type: "Edit Follow-up",
            notes: `Detail agenda follow-up ${leadName} diperbarui (Status: ${form.status}, Target: ${formattedDate})`,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      if (result.lifecycle.shouldOfferNextFollowup) {
        toast.success("Agenda follow-up berhasil diperbarui!", {
          description: "Buat Follow-Up berikutnya agar Lead tetap tertangani.",
          action: {
            label: "Buat berikutnya",
            onClick: () => router.push(`/crm/followups/create?lead_id=${result.lifecycle.leadId}`),
          },
        });
      } else {
        toast.success("Agenda follow-up berhasil diperbarui!");
      }
      router.push(`/crm/followups/${followupId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating followup:", error);
      toast.error("Gagal memperbarui follow-up", {
        description: error.message || "Silakan periksa kembali data Anda.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-xl mx-auto pb-12 px-3">
        <Skeleton className="h-8 w-40 rounded-lg bg-muted" />
        <Card className="p-4 space-y-3 bg-card border-border">
          <Skeleton className="h-10 w-full rounded-lg bg-muted" />
          <Skeleton className="h-10 w-full rounded-lg bg-muted" />
          <Skeleton className="h-28 w-full rounded-lg bg-muted" />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 px-3 sm:px-4 bg-background min-h-screen text-foreground">
      {/* HEADER */}
      <div className="flex items-center gap-2.5 border-b border-border pb-3 pt-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8 rounded-lg shrink-0 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
            ✏️ Edit Agenda Follow-up
          </h1>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
            Ubah status, jadwal, atau catatan aktivitas untuk prospek ini.
          </p>
        </div>
      </div>

      {/* FORM CARD */}
      <form onSubmit={handleSubmit}>
        <Card className="border border-border shadow-2xs bg-card overflow-hidden text-card-foreground">
          <CardHeader className="bg-muted/30 border-b border-border p-3 pb-2.5">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Rincian Agenda Follow-up
            </CardTitle>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 space-y-3.5">
            {/* 1. STATUS SELECTOR */}
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs font-bold text-foreground">
                Status Agenda Follow-up <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.status}
                onValueChange={(val) => handleChange("status", val || "pending")}
              >
                <SelectTrigger className="h-9 text-xs bg-background border-border text-foreground">
                  <SelectValue placeholder="Pilih status agenda" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  <SelectItem value="pending" className="text-xs">⏳ Pending / Mendatang</SelectItem>
                  <SelectItem value="completed" className="text-xs">✅ Selesai (Completed)</SelectItem>
                  <SelectItem value="cancelled" className="text-xs">❌ Dibatalkan (Cancelled)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. PILIH LEAD PROSPEK (SEARCHABLE DROPDOWN DENGAN SENSOR NOMOR HP) */}
            <div className="space-y-1 relative" ref={leadRef}>
              <Label className="text-xs font-bold text-foreground">
                Pilih Lead Prospek <span className="text-rose-500">*</span>
              </Label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsLeadOpen(!isLeadOpen)}
                onKeyDown={(e) => e.key === "Enter" && setIsLeadOpen(!isLeadOpen)}
                className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-border bg-background text-xs cursor-pointer hover:border-emerald-500 transition focus:outline-none"
              >
                {selectedLead ? (
                  <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {selectedLead.lead_name}
                    {selectedLead.phone && (
                      <span className="text-muted-foreground font-normal font-mono text-[11px]">
                        ({formatPhoneForUser(selectedLead.phone)})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" /> Cari atau pilih lead prospek...
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </div>

              {/* Floating Lead Dropdown */}
              {isLeadOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl p-2 space-y-1 text-card-foreground">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Ketik nama atau no HP..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background border-border text-foreground"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredLeads.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">
                        Belum ada data lead yang cocok.
                      </p>
                    ) : (
                      filteredLeads.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            handleChange("lead_id", item.id);
                            setIsLeadOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs hover:bg-muted transition",
                            form.lead_id === item.id &&
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                          )}
                        >
                          <div>
                            <p className="font-medium text-foreground">{item.lead_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {formatPhoneForUser(item.phone)}
                            </p>
                          </div>
                          {form.lead_id === item.id && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. ASSIGN TO AGENT (🔒 HANYA ADMIN BISA UBAH, AGENT TERKUNCI PERMANEN) */}
            <div className="space-y-1 relative" ref={agentRef}>
              <Label className="text-xs font-bold text-foreground">
                Penanggung Jawab (Agent In-Charge) <span className="text-rose-500">*</span>
              </Label>

              {!isAdmin ? (
                <div className="space-y-1">
                  <div className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-border bg-muted/50 text-xs cursor-not-allowed select-none">
                    <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {selectedAgent ? (selectedAgent.full_name || selectedAgent.email) : (currentUserName || "Agent In-Charge")}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 flex items-center gap-1 font-mono">
                      <Lock className="w-2.5 h-2.5" /> Terkunci (Agent)
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    Penanggung jawab tidak dapat diubah oleh Agent. Hubungi Admin jika ingin mengganti penugasan.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsAgentOpen(!isAgentOpen)}
                    onKeyDown={(e) => e.key === "Enter" && setIsAgentOpen(!isAgentOpen)}
                    className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-border bg-background text-xs cursor-pointer hover:border-emerald-500 transition focus:outline-none"
                  >
                    {selectedAgent ? (
                      <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        {selectedAgent.full_name || selectedAgent.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-muted-foreground" /> Pilih agent penanggung jawab...
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </div>

                  {isAgentOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl p-2 space-y-1 text-card-foreground">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama agent..."
                          value={agentSearch}
                          onChange={(e) => setAgentSearch(e.target.value)}
                          className="pl-8 h-8 text-xs bg-background border-border text-foreground"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredAgents.map((agent) => (
                          <div
                            key={agent.id}
                            onClick={() => {
                              handleChange("assigned_to", agent.id);
                              setIsAgentOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs hover:bg-muted transition",
                              form.assigned_to === agent.id &&
                                "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                            )}
                          >
                            <span className="font-medium text-foreground">
                              {agent.full_name || agent.email}
                            </span>
                            {form.assigned_to === agent.id && (
                              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4. TANGGAL & WAKTU FOLLOW-UP WITH PRESETS */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="followup_date" className="text-xs font-bold text-foreground">
                  Tanggal & Waktu Follow-up <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPresetDate(1)}
                    className="text-[10px] font-medium bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded-md transition cursor-pointer"
                  >
                    Besok
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(3)}
                    className="text-[10px] font-medium bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded-md transition cursor-pointer"
                  >
                    +3 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(7)}
                    className="text-[10px] font-medium bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded-md transition cursor-pointer"
                  >
                    +1 Minggu
                  </button>
                </div>
              </div>

              <Input
                id="followup_date"
                type="datetime-local"
                value={form.followup_date}
                onChange={(e) => handleChange("followup_date", e.target.value)}
                className="h-9 text-xs font-mono bg-background border-border text-foreground"
                required
              />
            </div>

            {/* 5. CATATAN / PLAN ACTIVITY */}
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-bold text-foreground">
                Catatan Rencana Aktivitas
              </Label>
              <Textarea
                id="notes"
                placeholder="Misal: Telepon via WhatsApp untuk menanyakan progres KPR, kirimkan brosur unit Tipe 36, atau atur janji survei lokasi..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                className="text-xs leading-relaxed bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* SUBMIT BUTTONS */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 px-4 h-8 shadow-xs cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Simpan Perubahan
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="text-xs h-8 px-3 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              >
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}