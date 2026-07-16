"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Phone, Mail, Building2, DollarSign, Tag, MapPin } from "lucide-react";
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
import { cn } from "@/lib/utils";

export default function CreateLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  const [properties, setProperties] = useState<{ id: string; title: string; listing_code: string }[]>([]);

  const [form, setForm] = useState({
    // Contact
    full_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    occupation: "",
    city: "",
    notes: "",
    // Lead
    source: "",
    status: "new",
    interest_type: "",
    budget: "",
    assigned_to: "",
    property_ids: [] as string[],
  });

  // ===== FETCH DATA =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsData, propertiesData] = await Promise.all([
          crmService.getAgents(),
          crmService.getPropertiesForLead(),
        ]);
        setAgents(agentsData);
        setProperties(propertiesData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data");
      }
    };
    fetchData();
  }, []);

  // ===== HANDLE CHANGE =====
  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ===== HANDLE PROPERTY TOGGLE =====
  const toggleProperty = (propertyId: string) => {
    setForm((prev) => ({
      ...prev,
      property_ids: prev.property_ids.includes(propertyId)
        ? prev.property_ids.filter((id) => id !== propertyId)
        : [...prev.property_ids, propertyId],
    }));
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name) {
      toast.error("Nama kontak wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create contact
      const contact = await crmService.createContact({
        full_name: form.full_name,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        occupation: form.occupation || null,
        city: form.city || null,
        notes: form.notes || null,
      });

      // 2. Create lead
      await crmService.createLead({
        contact_id: contact.id,
        assigned_to: form.assigned_to || null,
        source: form.source || null,
        status: form.status as any,
        interest_type: form.interest_type || null,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        property_ids: form.property_ids,
      });

      toast.success("Lead berhasil dibuat!");
      router.push("/crm/leads");
    } catch (error: any) {
      toast.error("Gagal membuat lead", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              <ArrowLeft size={22} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">➕ Tambah Lead Baru</h1>
              <p className="text-sm text-white/80">Masukkan data prospek pelanggan</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {form.status}
          </Badge>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <User size={18} className="text-blue-500" />
                  Informasi Kontak
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="font-medium">Nama Lengkap <span className="text-rose-500">*</span></Label>
                  <Input
                    id="full_name"
                    placeholder="Budi Santoso"
                    value={form.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="border-blue-200 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-medium flex items-center gap-2">
                      <Phone size={16} className="text-slate-400" />
                      Telepon
                    </Label>
                    <Input
                      id="phone"
                      placeholder="08123456789"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="border-blue-200 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="font-medium flex items-center gap-2">
                      <Phone size={16} className="text-green-400" />
                      WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      placeholder="08123456789"
                      value={form.whatsapp}
                      onChange={(e) => handleChange("whatsapp", e.target.value)}
                      className="border-blue-200 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium flex items-center gap-2">
                      <Mail size={16} className="text-slate-400" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="budi@email.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="border-blue-200 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation" className="font-medium flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" />
                      Pekerjaan
                    </Label>
                    <Input
                      id="occupation"
                      placeholder="Pengusaha / Karyawan"
                      value={form.occupation}
                      onChange={(e) => handleChange("occupation", e.target.value)}
                      className="border-blue-200 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="font-medium flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    Kota
                  </Label>
                  <Input
                    id="city"
                    placeholder="Jakarta"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="border-blue-200 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan tentang kontak..."
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={2}
                    className="border-blue-200 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lead Info */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Tag size={18} className="text-purple-500" />
                  Informasi Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Sumber Lead</Label>
                    <Select value={form.source} onValueChange={(val) => handleChange("source", val)}>
                      <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                        <SelectValue placeholder="Pilih sumber" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="portal">Portal Property</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="other">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest_type">Tipe Minat</Label>
                    <Select value={form.interest_type} onValueChange={(val) => handleChange("interest_type", val)}>
                      <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rumah">Rumah</SelectItem>
                        <SelectItem value="apartemen">Apartemen</SelectItem>
                        <SelectItem value="tanah">Tanah</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="ruko">Ruko</SelectItem>
                        <SelectItem value="kantor">Kantor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="font-medium flex items-center gap-2">
                      <DollarSign size={16} className="text-slate-400" />
                      Budget
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="500000000"
                      value={form.budget}
                      onChange={(e) => handleChange("budget", e.target.value)}
                      className="border-purple-200 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assign ke Agent</Label>
                    <Select value={form.assigned_to} onValueChange={(val) => handleChange("assigned_to", val)}>
                      <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                        <SelectValue placeholder="Pilih agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.length === 0 ? (
                          <SelectItem value="">Belum ada agent</SelectItem>
                        ) : (
                          agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>{agent.full_name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Property yang Diminati</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {properties.length === 0 ? (
                      <p className="text-sm text-slate-400 col-span-2">Belum ada property yang dipublikasi</p>
                    ) : (
                      properties.map((prop) => (
                        <div
                          key={prop.id}
                          className={cn(
                            "p-2 border rounded-lg cursor-pointer transition",
                            form.property_ids.includes(prop.id)
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          )}
                          onClick={() => toggleProperty(prop.id)}
                        >
                          <p className="text-sm font-medium text-slate-700 truncate">{prop.title}</p>
                          <p className="text-xs text-slate-400">{prop.listing_code}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <span>💡</span> Ringkasan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama</span>
                    <span className="font-medium text-slate-700 truncate max-w-[140px]">
                      {form.full_name || "Belum diisi"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <Badge variant="outline" className="text-xs">
                      {form.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sumber</span>
                    <span className="font-medium text-slate-700">{form.source || "Belum diisi"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Budget</span>
                    <span className="font-medium text-slate-700">
                      {form.budget
                        ? new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(parseFloat(form.budget))
                        : "Belum diisi"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Minat</span>
                    <span className="font-medium text-slate-700">{form.property_ids.length} property</span>
                  </div>
                </div>
                <hr className="my-2" />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Menyimpan...</>
                  ) : (
                    <><Save size={18} className="mr-2" />Simpan Lead</>
                  )}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                  Batal
                </Button>
                <p className="text-xs text-slate-400 text-center">* Data lead akan tersimpan sebagai New</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}