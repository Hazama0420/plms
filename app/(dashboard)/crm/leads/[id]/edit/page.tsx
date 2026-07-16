"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

import { crmService } from "@/services/crm.service";
import { type LeadStatus } from "@/types/crm.types";

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

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Baru" },
  { value: "contacted", label: "Dihubungi" },
  { value: "qualified", label: "Kualifikasi" },
  { value: "negotiation", label: "Negosiasi" },
  { value: "won", label: "Menang" },
  { value: "lost", label: "Hilang" },
];

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState({
    assigned_to: "",
    source: "",
    status: "" as LeadStatus,
    interest_type: "",
    budget: "",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lead, agentsData] = await Promise.all([
          crmService.getLeadById(leadId),
          crmService.getAgents(),
        ]);

        setForm({
          assigned_to: lead.assigned_to || "",
          source: lead.source || "",
          status: lead.status || "new",
          interest_type: lead.interest_type || "",
          budget: lead.budget ? String(lead.budget) : "",
          notes: (lead as any).notes || "", // notes sekarang sudah ada di tipe
        });

        setAgents(agentsData || []);
      } catch (error) {
        console.error("Error fetching lead:", error);
        toast.error("Gagal memuat data lead");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leadId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await crmService.updateLead(leadId, {
        assigned_to: form.assigned_to || undefined,
        source: form.source || undefined,
        status: form.status as LeadStatus,
        interest_type: form.interest_type || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        notes: form.notes || undefined,
      });

      toast.success("Lead berhasil diperbarui!");
      router.push(`/crm/leads/${leadId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast.error("Gagal update lead", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">✏️ Edit Lead</h1>
          <p className="text-sm text-muted-foreground">
            Update informasi lead ini
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl dark:from-blue-950/30 dark:to-purple-950/30">
            <CardTitle className="text-base">Informasi Lead</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => handleChange("status", val || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assign ke Agent */}
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

            {/* Sumber */}
            <div className="space-y-2">
              <Label htmlFor="source">Sumber</Label>
              <Input
                id="source"
                placeholder="Website, Referral, Social Media..."
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
              />
            </div>

            {/* Tipe Minat */}
            <div className="space-y-2">
              <Label htmlFor="interest_type">Tipe Minat</Label>
              <Input
                id="interest_type"
                placeholder="Rumah, Apartemen, Tanah..."
                value={form.interest_type}
                onChange={(e) => handleChange("interest_type", e.target.value)}
              />
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (Rp)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="2500000000"
                value={form.budget}
                onChange={(e) => handleChange("budget", e.target.value)}
              />
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan tentang lead..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Perubahan
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