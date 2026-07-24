// app/(dashboard)/crm/leads/create/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  X,
  Search,
  User,
  UserCheck,
  Building2,
  ChevronDown,
  Check,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { crmService } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";
import type { LeadStatus } from "@/types/crm.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

interface Agent {
  id: string;
  full_name?: string;
  email?: string;
}

const statusOptions: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new", label: "Baru (New)", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200" },
  { value: "contacted", label: "Dihubungi (Contacted)", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200" },
  { value: "qualified", label: "Kualifikasi (Qualified)", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200" },
  { value: "proposal", label: "Proposal", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200" },
  { value: "negotiation", label: "Negosiasi (Negotiation)", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200" },
  { value: "won", label: "Menang / Closing (Won)", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200" },
  { value: "lost", label: "Hilang / Batal (Lost)", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200" },
];

const sourcePresets = [
  "WhatsApp Direct",
  "Website Inland Property",
  "Instagram / Social Media",
  "Referral / Rekomendasi Klien",
  "Portal Properti (Rumah123/OLX)",
  "Spanduk / Banner Lokasi",
  "Walk-in Office",
];

const interestTypePresets = [
  "Rumah",
  "Apartemen",
  "Ruko / Commercial",
  "Tanah / Kavling",
  "Villa",
  "Gudang / Industri",
];

export default function CreateLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data options
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // Search filter states
  const [contactSearch, setContactSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  // Custom Dropdown open states
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);

  // DOM Container Refs (Click Outside Handler)
  const contactRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const propertyRef = useRef<HTMLDivElement>(null);

  // Quick Create Contact Modal State
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [quickContactSaving, setQuickContactSaving] = useState(false);
  const [quickContactForm, setQuickContactForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  // Form state
  const [form, setForm] = useState({
    contact_id: "",
    assigned_to: "",
    source: "WhatsApp Direct",
    status: "new" as LeadStatus,
    interest_type: "Rumah",
    budget: "",
    notes: "",
  });

  // Multi-select properties
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // ===== CLICK OUTSIDE EVENT LISTENER =====
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(event.target as Node)) {
        setIsContactOpen(false);
      }
      if (agentRef.current && !agentRef.current.contains(event.target as Node)) {
        setIsAgentOpen(false);
      }
      if (propertyRef.current && !propertyRef.current.contains(event.target as Node)) {
        setIsPropertyOpen(false);
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
        const [contactsRes, agentsData, propertiesData] = await Promise.all([
          supabase.from("crm_contacts").select("id, full_name, phone, email").order("full_name"),
          crmService.getAgents(),
          crmService.getPropertiesForLead(),
        ]);

        setContacts(contactsRes.data || []);
        setAgents(agentsData || []);
        setProperties(propertiesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data opsi");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper Find Object Terpilih (Mencegah UUID Acak Muncul)
  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === form.contact_id);
  }, [contacts, form.contact_id]);

  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.id === form.assigned_to);
  }, [agents, form.assigned_to]);

  // Filtered lists
  const filteredContacts = useMemo(() => {
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(contactSearch)) ||
        (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()))
    );
  }, [contacts, contactSearch]);

  const filteredAgents = useMemo(() => {
    return agents.filter(
      (a) =>
        (a.full_name && a.full_name.toLowerCase().includes(agentSearch.toLowerCase())) ||
        (a.email && a.email.toLowerCase().includes(agentSearch.toLowerCase()))
    );
  }, [agents, agentSearch]);

  const filteredProperties = useMemo(() => {
    return properties.filter(
      (p) =>
        !selectedProperties.includes(p.id) &&
        (p.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
          p.listing_code.toLowerCase().includes(propertySearch.toLowerCase()))
    );
  }, [properties, selectedProperties, propertySearch]);

  // ===== HANDLERS =====
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddProperty = (propertyId: string) => {
    if (!selectedProperties.includes(propertyId)) {
      setSelectedProperties((prev) => [...prev, propertyId]);
    }
    setIsPropertyOpen(false);
  };

  const handleRemoveProperty = (propertyId: string) => {
    setSelectedProperties((prev) => prev.filter((id) => id !== propertyId));
  };

  // Format IDR Preview
  const formatIDRPreview = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // ===== QUICK CREATE CONTACT HANDLER =====
  const handleCreateQuickContact = async () => {
    if (!quickContactForm.full_name) {
      toast.error("Nama lengkap kontak wajib diisi");
      return;
    }

    setQuickContactSaving(true);
    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .insert({
          full_name: quickContactForm.full_name,
          phone: quickContactForm.phone || null,
          email: quickContactForm.email || null,
        })
        .select("id, full_name, phone, email")
        .single();

      if (error) throw error;

      toast.success("Kontak baru berhasil dibuat!");
      setContacts((prev) => [data, ...prev]);
      setForm((prev) => ({ ...prev, contact_id: data.id }));
      setIsQuickContactOpen(false);
      setQuickContactForm({ full_name: "", phone: "", email: "" });
    } catch (err: any) {
      toast.error("Gagal menambah kontak baru: " + err.message);
    } finally {
      setQuickContactSaving(false);
    }
  };

  // ===== SUBMIT LEAD =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id) {
      toast.error("Kontak lead wajib dipilih");
      return;
    }

    setSaving(true);
    try {
      // 1. Buat lead baru (tanpa properti 'notes' yang tidak dikenal oleh type definition)
      const newLead = await crmService.createLead({
        contact_id: form.contact_id,
        assigned_to: form.assigned_to || undefined,
        source: form.source || undefined,
        status: form.status as any,
        interest_type: form.interest_type || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        property_ids: selectedProperties.length > 0 ? selectedProperties : undefined,
      });

      // 2. Simpan catatan (notes) sebagai follow-up awal
      if (form.notes && newLead?.id) {
        try {
          await crmService.createFollowup({
            lead_id: newLead.id,
            assigned_to: form.assigned_to || "",
            followup_date: new Date().toISOString(),
            notes: form.notes,
            // Hapus 'status: "pending",' karena tidak ada di dalam tipe data createFollowup
          });
        } catch (followupErr) {
          console.error("Gagal membuat follow-up awal:", followupErr);
        }
      }

      toast.success("Lead prospek baru berhasil dibuat!");
      router.push("/crm/leads");
      router.refresh();
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast.error("Gagal membuat lead", {
        description: error.message || "Silakan periksa kembali data yang dimasukkan.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
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
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* HEADER */}
      <div className="flex items-center justify-between">
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
              ➕ Buat Lead Prospek Baru
            </h1>
            <p className="text-xs text-muted-foreground">
              Daftarkan calon pembeli baru, tentukan budget, dan assign ke agent penanggung jawab.
            </p>
          </div>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <Card className="border shadow-md bg-card overflow-hidden">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Informasi Prospek & Klien
            </CardTitle>
            <CardDescription className="text-xs">
              Isi rincian data klien dan kriteria properti yang sedang dicari.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* 1. PILIH KONTAK (MENGGUNAKAN DIV SEBAGAI TRIGGER) */}
            <div className="space-y-2 relative" ref={contactRef}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Kontak Klien / Calon Pembeli <span className="text-rose-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickContactOpen(true)}
                  className="h-6 text-[11px] text-emerald-600 hover:text-emerald-700 p-0 gap-1"
                >
                  <Plus className="w-3 h-3" /> Tambah Kontak Baru
                </Button>
              </div>

              {/* Trigger menggunakan DIV (Bukan Button agar tidak bertabrakan di HTML) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsContactOpen(!isContactOpen)}
                onKeyDown={(e) => e.key === "Enter" && setIsContactOpen(!isContactOpen)}
                className="w-full flex items-center justify-between h-10 px-3 rounded-md border border-input bg-background text-xs cursor-pointer hover:border-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {selectedContact ? (
                  <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {selectedContact.full_name}
                    {selectedContact.phone && (
                      <span className="text-muted-foreground font-normal font-mono text-[11px]">
                        ({selectedContact.phone})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" /> Cari atau pilih kontak...
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </div>

              {/* Floating Searchable Dropdown */}
              {isContactOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 space-y-1">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Ketik nama atau no HP..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {filteredContacts.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">
                        Kontak tidak ditemukan. Klik "Tambah Kontak Baru" di atas.
                      </p>
                    ) : (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => {
                            handleChange("contact_id", contact.id);
                            setIsContactOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs hover:bg-muted transition",
                            form.contact_id === contact.id && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 font-bold"
                          )}
                        >
                          <div>
                            <p className="font-medium text-foreground">{contact.full_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {contact.phone || contact.email || "Tanpa No HP"}
                            </p>
                          </div>
                          {form.contact_id === contact.id && (
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
                Penanggung Jawab (Agent In-Charge)
              </Label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsAgentOpen(!isAgentOpen)}
                onKeyDown={(e) => e.key === "Enter" && setIsAgentOpen(!isAgentOpen)}
                className="w-full flex items-center justify-between h-10 px-3 rounded-md border border-input bg-background text-xs cursor-pointer hover:border-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {selectedAgent ? (
                  <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {selectedAgent.full_name || selectedAgent.email}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pilih Agent (Opsional)</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </div>

              {/* Floating Agent Dropdown Menu */}
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
                    <div
                      onClick={() => {
                        handleChange("assigned_to", "");
                        setIsAgentOpen(false);
                      }}
                      className="p-2 rounded-lg cursor-pointer text-xs hover:bg-muted text-muted-foreground"
                    >
                      -- Belum Diassign --
                    </div>
                    {filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => {
                          handleChange("assigned_to", agent.id);
                          setIsAgentOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs hover:bg-muted transition",
                          form.assigned_to === agent.id && "bg-blue-50 dark:bg-blue-950/40 text-blue-700 font-bold"
                        )}
                      >
                        <span className="font-medium text-foreground">{agent.full_name || agent.email}</span>
                        {form.assigned_to === agent.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. STATUS & SUMBER LEAD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Status Tahapan CRM</Label>
                <Select
                    value={form.status}
                    onValueChange={(val) => handleChange("status", val || "")}
                  >
                    <SelectTrigger className="h-10 text-xs bg-background">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", opt.color)}>
                            {opt.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Sumber Lead (Source)</Label>
                <Select
                  value={form.source}
                  onValueChange={(val) => handleChange("source", val || "")} 
                >
                  <SelectTrigger className="h-10 text-xs bg-background">
                    <SelectValue placeholder="Pilih sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcePresets.map((src) => (
                      <SelectItem key={src} value={src} className="text-xs">
                        {src}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. TIPE MINAT & BUDGET */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Kategori Minat Properti</Label>
                <Select
                  value={form.interest_type}
                  onValueChange={(val) => handleChange("interest_type", val || "")}
                >
                  <SelectTrigger className="h-10 text-xs bg-background">
                    <SelectValue placeholder="Pilih jenis properti" />
                  </SelectTrigger>
                  <SelectContent>
                    {interestTypePresets.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Estimasi Budget (Rp)</Label>
                <Input
                  type="number"
                  placeholder="Contoh: 2500000000"
                  value={form.budget}
                  onChange={(e) => handleChange("budget", e.target.value)}
                  className="h-10 text-xs font-mono"
                />
                {form.budget ? (
                  <p className="text-[11px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Preview: {formatIDRPreview(form.budget)}
                  </p>
                ) : null}
              </div>
            </div>

            {/* 5. MULTI-SELECT PROPERTI YANG DIMINATI */}
            <div className="space-y-2 pt-2 border-t border-border/50 relative" ref={propertyRef}>
              <Label className="text-xs font-bold text-foreground">
                Properti yang Diminati (Multi-Select)
              </Label>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedProperties.map((propId) => {
                  const prop = properties.find((p) => p.id === propId);
                  return prop ? (
                    <Badge
                      key={propId}
                      variant="secondary"
                      className="flex items-center gap-1.5 py-1 px-2.5 text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                    >
                      <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{prop.title}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">({prop.listing_code})</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProperty(propId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            handleRemoveProperty(propId);
                          }
                        }}
                        className="ml-1 text-muted-foreground hover:text-rose-500 cursor-pointer transition"
                      >
                        <X size={13} />
                      </span>
                    </Badge>
                  ) : null;
                })}
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsPropertyOpen(!isPropertyOpen)}
                onKeyDown={(e) => e.key === "Enter" && setIsPropertyOpen(!isPropertyOpen)}
                className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-dashed border-input bg-background text-xs cursor-pointer hover:border-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Klik untuk memilih unit properti terkait...
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </div>

              {/* Floating Property Dropdown Menu */}
              {isPropertyOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 space-y-1">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari judul atau kode listing..."
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProperties.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">
                        Tidak ada properti tambahan tersedia.
                      </p>
                    ) : (
                      filteredProperties.map((prop) => (
                        <div
                          key={prop.id}
                          onClick={() => handleAddProperty(prop.id)}
                          className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs hover:bg-muted transition"
                        >
                          <div>
                            <p className="font-bold text-foreground">{prop.title}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">Kode: {prop.listing_code}</p>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 6. CATATAN KHUSUS */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Catatan / Kebutuhan Khusus Klien</Label>
              <Textarea
                placeholder="Misal: Klien mencari rumah dengan halaman luas, lokasi dekat gerbang tol BSD, butuh bayar bertahap..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan Lead...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Simpan & Buat Lead
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

      {/* DIALOG MODAL: QUICK CREATE CONTACT */}
      <Dialog open={isQuickContactOpen} onOpenChange={setIsQuickContactOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" /> Tambah Kontak Baru Cepat
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat profil kontak baru secara langsung tanpa keluar dari formulir lead ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Nama Lengkap *</Label>
              <Input
                placeholder="Contoh: Budi Santoso"
                value={quickContactForm.full_name}
                onChange={(e) => setQuickContactForm({ ...quickContactForm, full_name: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Nomor WhatsApp / HP</Label>
              <Input
                placeholder="Contoh: 081298765432"
                value={quickContactForm.phone}
                onChange={(e) => setQuickContactForm({ ...quickContactForm, phone: e.target.value })}
                className="h-9 text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Email (Opsional)</Label>
              <Input
                placeholder="Contoh: budi@gmail.com"
                value={quickContactForm.email}
                onChange={(e) => setQuickContactForm({ ...quickContactForm, email: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickContactOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={quickContactSaving}
              onClick={handleCreateQuickContact}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {quickContactSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Kontak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}