// app/(dashboard)/crm/followups/create/page.tsx

"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Calendar,
  User,
  FileText,
  Users,
  RotateCcw,
} from "lucide-react";
import { crmService } from "@/services/crm.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Lead = {
  id: string;
  title?: string;
  contact?: { full_name?: string; phone?: string };
};

type Agent = {
  id: string;
  full_name: string;
};

const NOTES_MAX_LENGTH = 500;

function getLeadLabel(lead?: Lead) {
  if (!lead) return "";
  const name = lead.contact?.full_name || lead.title || "Lead tanpa nama";
  return lead.contact?.phone ? `${name} - ${lead.contact.phone}` : name;
}

function SelectSkeleton() {
  return <div className="h-10 w-full animate-pulse rounded-md bg-slate-200" />;
}

export default function CreateFollowupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState(false);

  const [form, setForm] = useState({
    lead_id: "",
    assigned_to: "",
    followup_date: "",
    notes: "",
  });

  const minDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  // ===== FETCH LEADS =====
  const fetchLeads = async () => {
    setLeadsLoading(true);
    setLeadsError(false);
    try {
      const result = await crmService.getLeads({ limit: 100 });
      setLeads(result.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
      setLeadsError(true);
    } finally {
      setLeadsLoading(false);
    }
  };

  // ===== FETCH AGENTS =====
  const fetchAgents = async () => {
    setAgentsLoading(true);
    setAgentsError(false);
    try {
      const result = await crmService.getAgents();
      setAgents(result);
    } catch (error) {
      console.error("Error fetching agents:", error);
      setAgentsError(true);
    } finally {
      setAgentsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchAgents();

    const defaultTime = new Date();
    defaultTime.setHours(defaultTime.getHours() + 1);
    defaultTime.setMinutes(defaultTime.getMinutes() - defaultTime.getTimezoneOffset());
    setForm((prev) => ({
      ...prev,
      followup_date: defaultTime.toISOString().slice(0, 16),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === form.lead_id),
    [leads, form.lead_id]
  );
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === form.assigned_to),
    [agents, form.assigned_to]
  );

  const requiredFieldsComplete = Boolean(
    form.lead_id && form.assigned_to && form.followup_date
  );

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.lead_id) {
      toast.error("Pilih lead terlebih dahulu.");
      return;
    }
    if (!form.assigned_to) {
      toast.error("Pilih agent yang bertanggung jawab.");
      return;
    }
    if (!form.followup_date) {
      toast.error("Pilih tanggal follow-up.");
      return;
    }

    setSubmitting(true);
    try {
      await crmService.createFollowup({
        lead_id: form.lead_id,
        assigned_to: form.assigned_to,
        followup_date: new Date(form.followup_date).toISOString(),
        notes: form.notes || "",
      });

      toast.success("Follow-up berhasil dibuat!");
      router.push("/crm/followups");
    } catch (error: any) {
      toast.error("Gagal membuat follow-up", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              <ArrowLeft size={22} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                ➕ Tambah Follow-up
              </h1>
              <p className="text-sm text-white/80">
                Jadwalkan follow-up dengan lead
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-0 shadow-md">
              <CardHeader className="rounded-t-xl bg-gradient-to-r from-amber-50 to-yellow-50">
                <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                  <Calendar size={18} className="text-amber-500" />
                  Informasi Follow-up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* PILIH LEAD */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-medium">
                    <Users size={16} className="text-slate-400" />
                    Pilih Lead <span className="text-rose-500">*</span>
                  </Label>

                  {leadsLoading ? (
                    <SelectSkeleton />
                  ) : leadsError ? (
                    <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                      <span>Gagal memuat daftar lead.</span>
                      <button
                        type="button"
                        onClick={fetchLeads}
                        className="flex items-center gap-1 font-medium underline underline-offset-2"
                      >
                        <RotateCcw size={13} /> Muat ulang
                      </button>
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
                      Belum ada lead yang bisa dipilih.
                    </div>
                  ) : (
                    <Select
                      value={form.lead_id}
                      onValueChange={(val) => handleChange("lead_id", val)}
                    >
                      <SelectTrigger className="border-amber-200 focus:ring-amber-500">
                        <SelectValue placeholder="Pilih lead">
                          {getLeadLabel(selectedLead)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {getLeadLabel(lead)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* ASSIGN AGENT */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-medium">
                    <User size={16} className="text-slate-400" />
                    Assign ke Agent <span className="text-rose-500">*</span>
                  </Label>

                  {agentsLoading ? (
                    <SelectSkeleton />
                  ) : agentsError ? (
                    <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                      <span>Gagal memuat daftar agent.</span>
                      <button
                        type="button"
                        onClick={fetchAgents}
                        className="flex items-center gap-1 font-medium underline underline-offset-2"
                      >
                        <RotateCcw size={13} /> Muat ulang
                      </button>
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
                      Belum ada agent yang tersedia.
                    </div>
                  ) : (
                    <Select
                      value={form.assigned_to}
                      onValueChange={(val) => handleChange("assigned_to", val)}
                    >
                      <SelectTrigger className="border-amber-200 focus:ring-amber-500">
                        <SelectValue placeholder="Pilih agent">
                          {selectedAgent?.full_name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* TANGGAL */}
                <div className="space-y-2">
                  <Label
                    htmlFor="followup_date"
                    className="flex items-center gap-2 font-medium"
                  >
                    <Calendar size={16} className="text-slate-400" />
                    Tanggal & Waktu Follow-up <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="followup_date"
                    type="datetime-local"
                    min={minDateTime}
                    value={form.followup_date}
                    onChange={(e) => handleChange("followup_date", e.target.value)}
                    className="border-amber-200 focus:ring-amber-500"
                  />
                </div>

                {/* CATATAN */}
                <div className="space-y-2">
                  <Label
                    htmlFor="notes"
                    className="flex items-center gap-2 font-medium"
                  >
                    <FileText size={16} className="text-slate-400" />
                    Catatan Follow-up
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan untuk follow-up ini..."
                    value={form.notes}
                    maxLength={NOTES_MAX_LENGTH}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                    className="border-amber-200 focus:ring-amber-500"
                  />
                  <div className="text-right text-xs text-slate-400">
                    {form.notes.length}/{NOTES_MAX_LENGTH}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="sticky top-6 border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
              <CardHeader className="rounded-t-xl bg-gradient-to-r from-yellow-400 to-orange-400">
                <CardTitle className="flex items-center justify-between text-base text-white">
                  <span className="flex items-center gap-2">
                    <span>💡</span> Ringkasan
                  </span>
                  <Badge
                    variant={requiredFieldsComplete ? "default" : "secondary"}
                    className={
                      requiredFieldsComplete
                        ? "bg-white/90 text-orange-600 hover:bg-white/90"
                        : "bg-white/20 text-white hover:bg-white/20"
                    }
                  >
                    {requiredFieldsComplete ? "Siap disimpan" : "Belum lengkap"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Lead</span>
                    <span className="max-w-[140px] truncate text-right font-medium text-slate-700">
                      {getLeadLabel(selectedLead) || "Belum dipilih"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Agent</span>
                    <span className="max-w-[140px] truncate text-right font-medium text-slate-700">
                      {selectedAgent?.full_name || "Belum dipilih"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Jadwal</span>
                    <span className="text-right font-medium text-slate-700">
                      {form.followup_date
                        ? new Date(form.followup_date).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Belum diisi"}
                    </span>
                  </div>
                </div>

                <hr className="my-2" />

                <Button
                  type="submit"
                  disabled={submitting || !requiredFieldsComplete}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Simpan Follow-up
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Batal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
