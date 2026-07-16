// app/(dashboard)/crm/followups/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";

export default function EditFollowupPage() {
  const router = useRouter();
  const params = useParams();
  const followupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [form, setForm] = useState({
    assigned_to: "",
    followup_date: "",
    notes: "",
    status: "pending" as "pending" | "completed" | "cancelled",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [followup, agentsData] = await Promise.all([
          crmService.getFollowupById(followupId),
          crmService.getAgents(),
        ]);

        setForm({
          assigned_to: followup.assigned_to || "",
          followup_date: followup.followup_date
            ? new Date(followup.followup_date).toISOString().slice(0, 16)
            : "",
          notes: followup.notes || "",
          status: followup.status || "pending",
        });

        setAgents(agentsData || []);
      } catch (error) {
        console.error("Error fetching followup:", error);
        toast.error("Gagal memuat data follow-up");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [followupId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await crmService.updateFollowup(followupId, {
        assigned_to: form.assigned_to || undefined,
        followup_date: form.followup_date || undefined,
        notes: form.notes || undefined,
        status: form.status,
      });

      toast.success("Follow-up berhasil diperbarui!");
      router.back();
      router.refresh();
    } catch (error: any) {
      console.error("Error updating followup:", error);
      toast.error("Gagal update follow-up", {
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">✏️ Edit Follow-up</h1>
          <p className="text-sm text-muted-foreground">
            Update jadwal follow-up ini
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl dark:from-amber-950/30 dark:to-orange-950/30">
            <CardTitle className="text-base">Informasi Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
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

            {/* Assign ke Agent */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign ke Agent</Label>
              <Select
                value={form.assigned_to}
                onValueChange={(val) => handleChange("assigned_to", val)}
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  handleChange("status", val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="completed">✅ Selesai</SelectItem>
                  <SelectItem value="cancelled">❌ Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
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