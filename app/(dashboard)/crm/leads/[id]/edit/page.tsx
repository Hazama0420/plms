// app/(dashboard)/crm/leads/[id]/edit/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Lock,
} from "lucide-react";

import { crmService } from "@/services/crm.service";
import { syncCRMLeadInterestsAction } from "@/actions/crm-interests.action";
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
  phone?: string | null;
  email?: string | null;
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

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");

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

  // Check if current user is admin
  const isAdmin = currentUserRole === "admin" || currentUserRole === "super_admin";

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

  // ===== FETCH INITIAL DATA & LEAD DATA =====
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Ambil data user & role saat ini
        const { data: { user } } = await supabase.auth.getUser();
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
          loggedInName = userData?.full_name || user.email || "Agent Anda";

          setCurrentUserRole(loggedInRole);
          setCurrentUserName(loggedInName);
        }

        // 2. Fetch data lead, opsi kontak, agent, properti, dan minat properti (crm_interests)
        const [leadData, contactsRes, agentsData, propertiesData, interestsRes] = await Promise.all([
          crmService.getLeadById(leadId),
          supabase.from("crm_contacts").select("id, full_name, phone, email").order("full_name"),
          crmService.getAgents(),
          crmService.getPropertiesForLead(),
          supabase.from("crm_interests").select("property_id").eq("lead_id", leadId),
        ]);

        if (leadData) {
          setForm({
            contact_id: leadData.contact_id || "",
            assigned_to: leadData.assigned_to || (user ? user.id : ""),
            source: leadData.source || "WhatsApp Direct",
            status: leadData.status || "new",
            interest_type: leadData.interest_type || "Rumah",
            budget: leadData.budget ? String(leadData.budget) : "",
            notes: leadData.notes || "",
          });

          // Ambil properti yang sudah terpilih dari crm_interests
          if (interestsRes.data && interestsRes.data.length > 0) {
            const propIds = interestsRes.data.map((i: any) => i.property_id).filter(Boolean);
            setSelectedProperties(propIds);
          } else if (leadData.interests && leadData.interests.length > 0) {
            const propIds = leadData.interests.map((i: any) => i.property_id).filter(Boolean);
            setSelectedProperties(propIds);
          }
        }

        setContacts(contactsRes.data || []);
        setAgents(agentsData || []);
        setProperties(propertiesData || []);
      } catch (error) {
        console.error("Error fetching lead data:", error);
        toast.error("Gagal memuat data lead");
        router.push(`/crm/leads/${leadId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leadId, router]);

  // Helper Find Object Terpilih
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
      const data = await crmService.createContact({
        full_name: quickContactForm.full_name,
        phone: quickContactForm.phone || null,
        email: quickContactForm.email || null,
      });

      toast.success("Kontak baru berhasil dibuat!");
      setContacts((prev) => [data, ...prev]);
      setForm((prev) => ({ ...prev, contact_id: data.id }));
      setIsQuickContactOpen(false);
      setQuickContactForm({ full_name: "", phone: "", email: "" });
    } catch (err: any) {
      toast.error("Gagal menambah kontak baru: " + (err.message || err));
    } finally {
      setQuickContactSaving(false);
    }
  };

  // ===== SUBMIT UPDATE LEAD =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id) {
      toast.error("Kontak lead wajib dipilih");
      return;
    }

    setSaving(true);
    try {
      const assignedToId = isAdmin
        ? (form.assigned_to || undefined)
        : (form.assigned_to || currentUserId || undefined);

      // 1. Update data utama lead di tabel crm_leads
      await crmService.updateLead(leadId, {
        contact_id: form.contact_id,
        assigned_to: assignedToId,
        source: form.source || undefined,
        status: form.status as any,
        interest_type: form.interest_type || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        notes: form.notes || undefined,
      });

      // 2. Update relasi minat properti melalui Server Action terpusat
      const interestResult = await syncCRMLeadInterestsAction(leadId, selectedProperties);
      if (!interestResult.success) {
        console.error("Gagal mengupdate minat properti:", interestResult.error);
        toast.warning("Data lead diperbarui, namun gagal menyimpan daftar minat properti.");
      }

      toast.success("Data lead prospek berhasil diperbarui!");
      router.push(`/crm/leads/${leadId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast.error("Gagal memperbarui lead", {
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
            className="h-9 w-9 rounded-xl shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              ✏️ Edit Lead Prospek
            </h1>
            <p className="text-xs text-muted-foreground">
              Perbarui rincian data klien, status pipeline, budget, dan penugasan agent.
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
              Sesuaikan informasi kontak dan preferensi properti klien.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* 1. PILIH KONTAK */}
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
                  className="h-6 text-[11px] text-emerald-600 hover:text-emerald-700 p-0 gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Tambah Kontak Baru
                </Button>
              </div>

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

              {!isAdmin ? (
                <div className="space-y-1">
                  <div className="w-full flex items-center justify-between h-10 px-3 rounded-md border border-input bg-muted/50 text-xs cursor-not-allowed select-none">
                    <span className="font-semibold text-foreground flex items-center gap-2 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {selectedAgent ? (selectedAgent.full_name || selectedAgent.email) : (currentUserName || "Agent In-Charge")}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Akun Agent (Terkunci)
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Penanggung jawab tidak dapat diubah oleh Agent. Hubungi Admin jika perlu pemindahan penugasan.
                  </p>
                </div>
              ) : (
                <>
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
                </>
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
                placeholder="Misal: Klien mencari rumah dengan halaman luas, lokasi dekat gerbang tol BSD..."
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-xs gap-2 px-5 h-9 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan Perubahan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Simpan Perubahan Lead
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="text-xs h-9 cursor-pointer"
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
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={quickContactSaving}
              onClick={handleCreateQuickContact}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer"
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