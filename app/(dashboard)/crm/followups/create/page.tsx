// app/(dashboard)/crm/followups/create/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Search,
  User,
  UserCheck,
  Calendar,
  Clock,
  ChevronDown,
  Check,
  Sparkles,
  FileText,
} from "lucide-react";

import { crmService } from "@/services/crm.service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function CreateFollowupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data Options
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
    notes: "",
  });

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

  // ===== FETCH INITIAL DATA =====
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [agentsData, leadsResult] = await Promise.all([
          crmService.getAgents(),
          crmService.getLeads({ limit: 100 }),
        ]);

        setAgents(agentsData || []);

        const mappedLeads: LeadItem[] = (leadsResult.data || []).map((lead: any) => {
          const contactObj = lead.contact || {};
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
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data pilihan");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Selected Item Helpers (Mencegah UUID/Huruf Acak Tampil)
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
    target.setHours(10, 0, 0, 0); // Default jam 10 pagi

    const isoLocal = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    handleChange("followup_date", isoLocal);
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lead_id || !form.assigned_to || !form.followup_date) {
      toast.error("Lead, Agent, dan Tanggal wajib diisi!");
      return;
    }

    setSaving(true);
    try {
      await crmService.createFollowup({
        lead_id: form.lead_id,
        assigned_to: form.assigned_to,
        followup_date: form.followup_date,
        notes: form.notes || undefined,
      });

      toast.success("Jadwal follow-up berhasil dibuat!");
      router.push("/crm/followups");
      router.refresh();
    } catch (error: any) {
      console.error("Error creating followup:", error);
      toast.error("Gagal membuat follow-up", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 rounded-xl shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            📅 Tambah Jadwal Follow-up
          </h1>
          <p className="text-xs text-muted-foreground">
            Jadwalkan kontak kembali dengan lead untuk memelihara minat prospek.
          </p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <Card className="border shadow-md bg-card overflow-hidden">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Rincian Agenda Follow-up
            </CardTitle>
            <CardDescription className="text-xs">
              Pilih lead target, tentukan penanggung jawab, dan setel waktu pengingat.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* 1. PILIH LEAD (SEARCHABLE DROPDOWN - BEBAS BUG UUID) */}
            <div className="space-y-2 relative" ref={leadRef}>
              <Label className="text-xs font-bold text-foreground">
                Pilih Lead Prospek <span className="text-rose-500">*</span>
              </Label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsLeadOpen(!isLeadOpen)}
                onKeyDown={(e) => e.key === "Enter" && setIsLeadOpen(!isLeadOpen)}
                className="w-full flex items-center justify-between h-10 px-3 rounded-md border border-input bg-background text-xs cursor-pointer hover:border-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {selectedLead ? (
                  <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {selectedLead.lead_name}
                    {selectedLead.phone && (
                      <span className="text-muted-foreground font-normal font-mono text-[11px]">
                        ({selectedLead.phone})
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

              {/* Floating Dropdown */}
              {isLeadOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 space-y-1">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Ketik nama atau no HP..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1">
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
                              "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 font-bold"
                          )}
                        >
                          <div>
                            <p className="font-medium text-foreground">{item.lead_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {item.phone || "Tidak ada telepon"}
                            </p>
                          </div>
                          {form.lead_id === item.id && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. ASSIGN TO AGENT */}
            <div className="space-y-2 relative" ref={agentRef}>
              <Label className="text-xs font-bold text-foreground">
                Assign ke Agent Penanggung Jawab <span className="text-rose-500">*</span>
              </Label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsAgentOpen(!isAgentOpen)}
                onKeyDown={(e) => e.key === "Enter" && setIsAgentOpen(!isAgentOpen)}
                className="w-full flex items-center justify-between h-10 px-3 rounded-md border border-input bg-background text-xs cursor-pointer hover:border-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {selectedAgent ? (
                  <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {selectedAgent.full_name || selectedAgent.email}
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" /> Pilih agent penanggung jawab...
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </div>

              {/* Floating Agent Dropdown */}
              {isAgentOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 space-y-1">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama agent..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
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
                            "bg-blue-50 dark:bg-blue-950/40 text-blue-700 font-bold"
                        )}
                      >
                        <span className="font-medium text-foreground">
                          {agent.full_name || agent.email}
                        </span>
                        {form.assigned_to === agent.id && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. TANGGAL & WAKTU FOLLOW-UP WITH PRESETS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="followup_date" className="text-xs font-bold text-foreground">
                  Tanggal & Waktu Follow-up <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPresetDate(1)}
                    className="text-[10px] bg-muted hover:bg-emerald-50 hover:text-emerald-700 px-2 py-0.5 rounded-md transition"
                  >
                    Besok
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(3)}
                    className="text-[10px] bg-muted hover:bg-emerald-50 hover:text-emerald-700 px-2 py-0.5 rounded-md transition"
                  >
                    +3 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(7)}
                    className="text-[10px] bg-muted hover:bg-emerald-50 hover:text-emerald-700 px-2 py-0.5 rounded-md transition"
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
                className="h-10 text-xs font-mono"
                required
              />
            </div>

            {/* 4. CATATAN / PLAN ACTIVITY */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold text-foreground">
                Catatan Rencana Aktivitas
              </Label>
              <Textarea
                id="notes"
                placeholder="Misal: Telepon via WhatsApp untuk menanyakan progres KPR, kirimkan brosur unit Tipe 36, atau atur janji survei lokasi..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* SUBMIT BUTTONS */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-xs gap-2 px-5 h-9"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Simpan Follow-up
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="text-xs h-9"
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