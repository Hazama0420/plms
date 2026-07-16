// app/(dashboard)/crm/leads/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";

import { crmService } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";
import type { LeadStatus } from "@/types/crm.types";

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
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================
// TYPES
// ============================================================
interface Contact {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

interface Property {
  id: string;
  title: string;
  listing_code: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CreateLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data options
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // Form state
  const [form, setForm] = useState({
    contact_id: "",
    assigned_to: "",
    source: "",
    status: "new" as LeadStatus,
    interest_type: "",
    budget: "",
    notes: "",
  });

  // ✅ State untuk selected properties (multi-select)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // ===== FETCH DATA =====
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [contactsData, agentsData, propertiesData] = await Promise.all([
          supabase.from("crm_contacts").select("id, full_name, phone, email").order("full_name"),
          crmService.getAgents(),
          crmService.getPropertiesForLead(),
        ]);

        setContacts(contactsData.data || []);
        setAgents(agentsData || []);
        setProperties(propertiesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ===== HANDLERS =====
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddProperty = (propertyId: string) => {
    if (!selectedProperties.includes(propertyId)) {
      setSelectedProperties((prev) => [...prev, propertyId]);
    }
  };

  const handleRemoveProperty = (propertyId: string) => {
    setSelectedProperties((prev) => prev.filter((id) => id !== propertyId));
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id) {
      toast.error("Pilih kontak terlebih dahulu");
      return;
    }

    setSaving(true);
    try {
      // 1. Buat lead
      const lead = await crmService.createLead({
        contact_id: form.contact_id,
        assigned_to: form.assigned_to || undefined,
        source: form.source || undefined,
        status: form.status,
        interest_type: form.interest_type || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        property_ids: selectedProperties.length > 0 ? selectedProperties : undefined,
      });

      toast.success("Lead berhasil dibuat!");
      router.push(`/crm/leads/${lead.id}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast.error("Gagal membuat lead", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">➕ Tambah Lead</h1>
          <p className="text-sm text-muted-foreground">
            Buat prospek baru dan kelola minat properti
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl dark:from-blue-950/30 dark:to-purple-950/30">
            <CardTitle className="text-base">Informasi Lead</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Pilih Kontak */}
            <div className="space-y-2">
              <Label htmlFor="contact_id">Kontak <span className="text-rose-500">*</span></Label>
              <Select
                value={form.contact_id}
                onValueChange={(val) => handleChange("contact_id", val || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kontak" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.length === 0 ? (
                    <SelectItem value="no-contact" disabled>
                      Tidak ada kontak
                    </SelectItem>
                  ) : (
                    contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.full_name} {contact.phone ? `(${contact.phone})` : ""}
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
                  <SelectItem value="new">Baru</SelectItem>
                  <SelectItem value="contacted">Dihubungi</SelectItem>
                  <SelectItem value="qualified">Kualifikasi</SelectItem>
                  <SelectItem value="negotiation">Negosiasi</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="won">Menang</SelectItem>
                  <SelectItem value="lost">Hilang</SelectItem>
                </SelectContent>
              </Select>
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
                placeholder="Catatan tambahan..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            {/* Properti yang diminati (multi-select) */}
            <div className="space-y-2 pt-2 border-t dark:border-slate-700">
              <Label>Properti yang Diminati</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedProperties.map((propId) => {
                  const prop = properties.find((p) => p.id === propId);
                  return prop ? (
                    <Badge key={propId} variant="secondary" className="flex items-center gap-1">
                      {prop.title}
                      <button
                        type="button"
                        onClick={() => handleRemoveProperty(propId)}
                        className="ml-1 text-muted-foreground hover:text-rose-500"
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
              <Select
                value=""
                onValueChange={(val) => {
                  if (val) handleAddProperty(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tambah minat properti" />
                </SelectTrigger>
                <SelectContent>
                  {properties
                    .filter((p) => !selectedProperties.includes(p.id))
                    .map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.title} ({prop.listing_code})
                      </SelectItem>
                    ))}
                  {properties.length === 0 && (
                    <SelectItem value="no-prop" disabled>
                      Tidak ada properti tersedia
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
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