"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

import { crmService } from "@/services/crm.service";
import type { CRMLead } from "@/types/crm.types";

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
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateFollowupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [leads, setLeads] = useState<CRMLead[]>([]); // ✅ gunakan tipe CRMLead
  const [agents, setAgents] = useState<any[]>([]);
  const [leadsError, setLeadsError] = useState(false);
  const [form, setForm] = useState({
    lead_id: "",
    assigned_to: "",
    followup_date: "",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [leadsData, agentsData] = await Promise.all([
          crmService.getLeads({ limit: 100 }),
          crmService.getAgents(),
        ]);
        setLeads(leadsData.data);
        setAgents(agentsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLeadsError(true);
        toast.error("Gagal memuat data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.lead_id) {
      toast.error("Pilih lead terlebih dahulu");
      return;
    }
    if (!form.assigned_to) {
      toast.error("Pilih agent yang ditugaskan");
      return;
    }
    if (!form.followup_date) {
      toast.error("Tanggal follow-up wajib diisi");
      return;
    }

    setLoading(true);
    try {
      await crmService.createFollowup({
        lead_id: form.lead_id,
        assigned_to: form.assigned_to,
        followup_date: form.followup_date,
        notes: form.notes || undefined,
      });

      toast.success("Follow-up berhasil dibuat!");
      router.push("/crm/followups");
      router.refresh();
    } catch (error: any) {
      console.error("Error creating followup:", error);
      toast.error("Gagal membuat follow-up", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📅 Buat Follow-up</h1>
          <p className="text-sm text-muted-foreground">
            Jadwalkan follow-up dengan prospek
          </p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl dark:from-amber-950/30 dark:to-orange-950/30">
            <CardTitle className="text-base">Informasi Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Pilih Lead */}
            <div className="space-y-2">
              <Label htmlFor="lead_id">Pilih Lead</Label>
              <Select
                value={form.lead_id}
                onValueChange={(val) => handleChange("lead_id", val || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lead" />
                </SelectTrigger>
                <SelectContent>
                  {leadsError ? (
                    <SelectItem value="error" disabled>
                      Gagal memuat lead
                    </SelectItem>
                  ) : leads.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Tidak ada lead tersedia
                    </SelectItem>
                  ) : (
                    leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.contact?.full_name || "Tanpa Nama"} ({lead.contact?.phone || "No phone"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Assign Agent */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign ke Agent</Label>
              <Select
                value={form.assigned_to}
                onValueChange={(val) => handleChange("assigned_to", val || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak diassign</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name || agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tanggal & Waktu */}
            <div className="space-y-2">
              <Label htmlFor="followup_date">Tanggal & Waktu</Label>
              <Input
                id="followup_date"
                type="datetime-local"
                value={form.followup_date}
                onChange={(e) => handleChange("followup_date", e.target.value)}
                required
              />
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan follow-up..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
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