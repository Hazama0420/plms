// app/(dashboard)/invoices/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

import {
  ArrowLeft,
  Save,
  Loader2,
  Phone,
  Mail,
  User,
  Building2,
  Calendar,
  FileText,
  Sparkles,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  Clock,
  Send,
  AlertCircle,
  XCircle,
  Calculator,
  CreditCard,
  SendHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface FormData {
  invoice_number: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  property_id: string;
  amount: string;
  due_date: string;
  issue_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes: string;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface PropertyOption {
  id: string;
  title: string;
  listing_code: string;
  listing_type: string;
  price?: number;
  price_per_unit?: string;
}

// Helper Parser Pintar untuk mengonversi string harga (1.5 Miliar, 800 Jt, Rp 1.500.000.000) jadi angka
const parsePropertyPrice = (val?: string | null): number => {
  if (!val) return 0;
  const clean = val.toLowerCase().trim();

  if (clean.includes("miliar") || (clean.includes("m") && !clean.includes("m2") && !clean.includes("meter"))) {
    const match = clean.match(/[\d.,]+/);
    if (match) {
      const numStr = match[0].replace(/\./g, "").replace(",", ".");
      const num = parseFloat(numStr);
      if (!isNaN(num)) return Math.round(num * 1_000_000_000);
    }
  }

  if (clean.includes("juta") || clean.includes("jt")) {
    const match = clean.match(/[\d.,]+/);
    if (match) {
      const numStr = match[0].replace(/\./g, "").replace(",", ".");
      const num = parseFloat(numStr);
      if (!isNaN(num)) return Math.round(num * 1_000_000);
    }
  }

  const digitsOnly = clean.replace(/[^0-9]/g, "");
  return parseFloat(digitsOnly) || 0;
};

// Preset Template Catatan Pembayaran
//
// SENGAJA tidak mencantumkan nama bank, nomor rekening, atau nama perusahaan.
// Invoice cetak sudah mencetaknya sendiri di bagian "Pembayaran :", diambil dari
// lib/invoice-config.ts. Versi lama mengulangnya di sini dan kedua salinan itu
// memang sudah berbeda: preset menyebut PT Inland Property Indonesia / BCA
// 8830-123-456, sementara yang tercetak PT Kaya Dari Properti / BCA
// 658-090-9971. Klien menerima dua nomor rekening yang bertentangan dalam satu
// dokumen. Menghapus salinannya menutup seluruh kelas kesalahan itu, bukan cuma
// kejadian yang satu ini.
//
// Preset di sini hanya untuk syarat pembayaran — hal yang berbeda per invoice
// dan memang perlu ditulis manual.
const PAYMENT_PRESETS = [
  {
    label: "Konfirmasi transfer",
    text: "Pembayaran ditransfer ke rekening yang tercantum pada invoice ini. Mohon kirimkan bukti transfer setelah pembayaran.",
  },
  {
    label: "Jatuh tempo 1x24 jam",
    text: "Pembayaran berlaku 1x24 jam sejak invoice ini diterbitkan.",
  },
  {
    label: "Pelunasan Booking Fee",
    text: "Tagihan pelunasan Booking Fee properti. Pembayaran berlaku 1x24 jam sejak invoice ini diterbitkan.",
  },
];

export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    invoice_number: "",
    client_id: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    property_id: "",
    amount: "",
    due_date: "",
    issue_date: "",
    status: "draft",
    notes: "",
  });

  useEffect(() => {
    const now = new Date();
    const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    setFormData((prev) => ({
      ...prev,
      invoice_number: prev.invoice_number || `INV-${Date.now().toString().slice(-8)}`,
      issue_date: prev.issue_date || format(now, "yyyy-MM-dd"),
      due_date: prev.due_date || format(due, "yyyy-MM-dd"),
    }));
  }, []);

  // ===== FETCH CLIENTS DENGAN JOIN crm_leads -> crm_contacts =====
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from("crm_leads")
          .select(`
            id,
            contact_id,
            contact:crm_contacts (*)
          `)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped: ClientOption[] = data
            .filter((lead: any) => lead.contact)
            .map((lead: any) => {
              const c = lead.contact;
              return {
                id: lead.id,
                name: c.full_name || c.name || c.email || "Tanpa Nama",
                email: c.email || "",
                phone: c.whatsapp || c.phone || c.phone_number || c.no_hp || "",
              };
            });
          setClients(mapped);
        } else {
          const { data: contactsData } = await supabase
            .from("crm_contacts")
            .select("*");

          if (contactsData) {
            setClients(
              contactsData.map((c: any) => ({
                id: c.id,
                name: c.full_name || c.name || c.email || "Tanpa Nama",
                email: c.email || "",
                phone: c.whatsapp || c.phone || c.phone_number || "",
              }))
            );
          }
        }
      } catch (error: any) {
        console.warn("Gagal memuat crm_leads:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // ===== FETCH PROPERTIES =====
  useEffect(() => {
    const fetchProperties = async () => {
      setLoadingProperties(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, title, listing_code, listing_type, price_per_unit")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Gagal query properties:", error.message);
          setProperties([]);
        } else if (data) {
          const mapped: PropertyOption[] = data.map((p: any) => {
            const numericPrice = parsePropertyPrice(p.price_per_unit);

            return {
              id: p.id,
              title: p.title || p.listing_code || "Properti",
              listing_code: p.listing_code || "",
              listing_type: p.listing_type || "jual",
              price: numericPrice,
              price_per_unit: p.price_per_unit || "",
            };
          });
          setProperties(mapped);
        }
      } catch (error: any) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  // ===== HANDLERS =====
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectClient = (value: string | null) => {
    if (!value) return;
    const selected = clients.find((c) => c.id === value);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        client_id: selected.id,
        client_name: selected.name,
        client_email: selected.email || "",
        client_phone: selected.phone || "",
      }));
      toast.success(`Kontak ${selected.name} terpilih`);
    }
  };

  const handlePropertyChange = (value: string | null) => {
    const id = value === "none" || !value ? "" : value;
    setFormData((prev) => ({ ...prev, property_id: id }));

    const selectedProp = properties.find((p) => p.id === id);
    if (selectedProp && selectedProp.price && selectedProp.price > 0) {
      const estimatedCommission = Math.round(selectedProp.price * 0.025);
      if (!formData.amount) {
        setFormData((prev) => ({
          ...prev,
          amount: String(estimatedCommission),
          notes: prev.notes || `Komisi Agen 2.5% dari Properti: ${selectedProp.title || selectedProp.listing_code}`,
        }));
        toast.info("Nilai komisi 2.5% otomatis dihitung dari harga properti");
      }
    }
  };

  const applyAmountPreset = (type: "comm_25" | "comm_3" | "booking" | "dp_10") => {
    if (type === "booking") {
      setFormData((prev) => ({ ...prev, amount: "5000000", notes: prev.notes || "Tagihan Booking Fee Properti" }));
      toast.success("Nominal Booking Fee (Rp 5.000.000) diterapkan");
      return;
    }

    if (!formData.property_id || formData.property_id === "none") {
      toast.warning("Silakan pilih properti terlebih dahulu dari dropdown");
      return;
    }

    const selectedProp = properties.find((p) => p.id === formData.property_id);
    const propPrice = selectedProp?.price || 0;

    if (propPrice <= 0) {
      toast.error(`Data harga properti "${selectedProp?.title}" tidak valid untuk dikalkulasi otomatis`);
      return;
    }

    if (type === "comm_25") {
      const val = Math.round(propPrice * 0.025);
      setFormData((prev) => ({ ...prev, amount: String(val) }));
      toast.success(`Komisi 2.5% (${formatRupiah(String(val))}) diterapkan`);
    } else if (type === "comm_3") {
      const val = Math.round(propPrice * 0.03);
      setFormData((prev) => ({ ...prev, amount: String(val) }));
      toast.success(`Komisi 3.0% (${formatRupiah(String(val))}) diterapkan`);
    } else if (type === "dp_10") {
      const val = Math.round(propPrice * 0.10);
      setFormData((prev) => ({ ...prev, amount: String(val) }));
      toast.success(`DP 10% (${formatRupiah(String(val))}) diterapkan`);
    }
  };

  const handleStatusChange = (value: string | null) => {
    handleChange("status", value || "draft");
  };

  const formatRupiah = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    return clean;
  };

  // ===== SUBMIT INVOICE =====
  const handleSubmit = async (e?: React.FormEvent, sendWaImmediately = false) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      if (!formData.client_name.trim()) {
        toast.error("Nama klien wajib diisi");
        setLoading(false);
        return;
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error("Jumlah tagihan wajib diisi dan harus lebih dari 0");
        setLoading(false);
        return;
      }
      if (!formData.due_date) {
        toast.error("Tanggal jatuh tempo wajib diisi");
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const insertData = {
        invoice_number: formData.invoice_number || `INV-${Date.now().toString().slice(-8)}`,
        client_id: formData.client_id || null,
        client_name: formData.client_name.trim(),
        client_email: formData.client_email.trim() || null,
        property_id: formData.property_id || null,
        issue_date: formData.issue_date || format(new Date(), "yyyy-MM-dd"),
        due_date: formData.due_date,
        total_amount: Math.round(parseFloat(formData.amount)),
        status: sendWaImmediately ? "sent" : formData.status,
        notes: formData.notes.trim() || null,
        created_by: userId || null,
      };

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert(insertData);

      if (invoiceError) {
        throw new Error(invoiceError.message || "Gagal menyimpan invoice ke database");
      }

      toast.success(`Invoice ${insertData.invoice_number} berhasil dibuat!`);

      if (sendWaImmediately && formData.client_phone) {
        const text = encodeURIComponent(
          `🧾 *TAGIHAN INVOICE: ${insertData.invoice_number}*\n\n` +
          `Yth. Bpk/Ibu *${formData.client_name}*,\n` +
          `Berikut rincian tagihan transaksi properti Anda:\n\n` +
          `💰 *Total Nominal*: ${formatRupiah(formData.amount)}\n` +
          `📅 *Jatuh Tempo*: ${formData.due_date}\n\n` +
          `${formData.notes ? `📌 *Catatan*: ${formData.notes}\n\n` : ""}` +
          `Mohon konfirmasi jika telah melakukan pembayaran. Terima kasih!`
        );
        const cleanPhone = formatPhoneForDisplay(formData.client_phone);
        window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
      }

      router.push("/invoices");
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast.error(error?.message || "Gagal membuat invoice.");
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = properties.find((p) => p.id === formData.property_id);

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto px-1 sm:px-0">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl hover:bg-muted cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Buat Invoice Tagihan
              </h1>
              {formData.invoice_number && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-mono text-xs">
                  {formData.invoice_number}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola penagihan klien, nomor WhatsApp, dan nominal transaksi dengan mudah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "px-3 py-1 text-xs font-semibold capitalize flex items-center gap-1.5 rounded-lg",
              formData.status === "draft" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              formData.status === "sent" && "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
              formData.status === "paid" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
              formData.status === "overdue" && "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
              formData.status === "cancelled" && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {formData.status === "draft" && <Clock className="w-3.5 h-3.5 text-slate-500" />}
            {formData.status === "sent" && <Send className="w-3.5 h-3.5 text-blue-500" />}
            {formData.status === "paid" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            {formData.status === "overdue" && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
            {formData.status === "cancelled" && <XCircle className="w-3.5 h-3.5 text-slate-400" />}
            Status: {formData.status}
          </Badge>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* KOLOM UTAMA KIRI */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* CARD 1: INFORMASI KLIEN */}
            <Card className="border shadow-xs rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-muted/40 p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Informasi Klien & Kontak</CardTitle>
                    <CardDescription className="text-xs">
                      Pilih dari kontak prospek CRM atau isi data klien secara manual
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
                {clients.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                    <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Pilih Cepat dari Database CRM Leads
                    </Label>
                    <Select
                      value={formData.client_id || "none"}
                      onValueChange={(val) => {
                        if (val === "none") {
                          setFormData((prev) => ({
                            ...prev,
                            client_id: "",
                            client_name: "",
                            client_email: "",
                            client_phone: "",
                          }));
                        } else {
                          handleSelectClient(val);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background text-xs h-9 rounded-xl border-emerald-500/30">
                        <SelectValue placeholder={loadingClients ? "Memuat kontak..." : "Klik untuk pilih klien..."}>
                          {clients.find((c) => c.id === formData.client_id)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none" className="text-xs italic text-muted-foreground">
                          -- Pilih / Reset Klien --
                        </SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id} className="text-xs">
                            <span className="font-medium">{client.name}</span>
                            {client.phone && <span className="text-muted-foreground ml-2">({client.phone})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="client_name" className="text-xs font-medium flex items-center gap-1">
                      Nama Klien <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="client_name"
                      placeholder="Contoh: Budi Santoso"
                      value={formData.client_name}
                      onChange={(e) => handleChange("client_name", e.target.value)}
                      className="text-xs h-9 rounded-xl focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="client_phone" className="text-xs font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Nomor WhatsApp / Telepon
                    </Label>
                    <div className="relative">
                      <Input
                        id="client_phone"
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        value={formData.client_phone}
                        onChange={(e) => handleChange("client_phone", e.target.value)}
                        className="text-xs h-9 pl-9 rounded-xl focus-visible:ring-emerald-500 font-mono"
                      />
                      <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="client_email" className="text-xs font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Email Klien (Opsional)
                    </Label>
                    <Input
                      id="client_email"
                      type="email"
                      placeholder="klien@email.com"
                      value={formData.client_email}
                      onChange={(e) => handleChange("client_email", e.target.value)}
                      className="text-xs h-9 rounded-xl focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: RINCIAN TAGIHAN & PROPERTI */}
            <Card className="border shadow-xs rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-muted/40 p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Rincian Nominal & Properti</CardTitle>
                    <CardDescription className="text-xs">
                      Tentukan properti terkait, nominal tagihan, dan kalkulasi komisi
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
                
                {/* PROPERTI SELECTOR */}
                <div className="space-y-1.5">
                  <Label htmlFor="property_id" className="text-xs font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Properti Terkait (Opsional)
                  </Label>
                  <Select
                    value={formData.property_id || "none"}
                    onValueChange={handlePropertyChange}
                    disabled={loadingProperties}
                  >
                    <SelectTrigger className="text-xs h-9 rounded-xl">
                      <SelectValue placeholder={loadingProperties ? "Memuat properti..." : "Pilih properti terkait..."}>
                        {selectedProperty
                          ? `${selectedProperty.title || selectedProperty.listing_code} (${selectedProperty.listing_type || "jual"})`
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      <SelectItem value="none" className="text-xs italic text-muted-foreground">
                        -- Tidak terkait properti --
                      </SelectItem>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id} className="text-xs">
                          {prop.title || prop.listing_code} ({prop.listing_type || "jual"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedProperty && (
                    <div className="mt-2 p-3 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{selectedProperty.title}</p>
                        <p className="text-[10px] text-muted-foreground">Kode: {selectedProperty.listing_code || "-"}</p>
                      </div>
                      {selectedProperty.price_per_unit && (
                        <Badge variant="outline" className="font-mono text-[10px] bg-background">
                          Harga: {selectedProperty.price_per_unit}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* HITUNG NOMINAL & PRESET BANTUAN */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="amount" className="text-xs font-medium">
                      Jumlah Tagihan (Rp) <span className="text-rose-500">*</span>
                    </Label>
                    <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatRupiah(formData.amount)}
                    </span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Contoh: 15000000"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    className="text-xs h-10 font-mono text-base font-semibold rounded-xl focus-visible:ring-emerald-500"
                  />

                  {/* TOMBOL PRESET NOMINAL/KOMISI */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                      <Calculator className="w-3 h-3" /> Hitung Cepat:
                    </span>
                    <button
                      type="button"
                      onClick={() => applyAmountPreset("comm_25")}
                      className="text-[10px] px-2 py-0.5 rounded-lg border bg-muted/40 hover:bg-muted font-medium transition cursor-pointer shrink-0"
                    >
                      Komisi 2.5%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAmountPreset("comm_3")}
                      className="text-[10px] px-2 py-0.5 rounded-lg border bg-muted/40 hover:bg-muted font-medium transition cursor-pointer shrink-0"
                    >
                      Komisi 3.0%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAmountPreset("booking")}
                      className="text-[10px] px-2 py-0.5 rounded-lg border bg-muted/40 hover:bg-muted font-medium transition cursor-pointer shrink-0"
                    >
                      Booking Fee 5 Jt
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAmountPreset("dp_10")}
                      className="text-[10px] px-2 py-0.5 rounded-lg border bg-muted/40 hover:bg-muted font-medium transition cursor-pointer shrink-0"
                    >
                      DP 10%
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-medium">Status Tagihan</Label>
                    <Select
                      value={formData.status}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger className="text-xs h-9 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="draft" className="text-xs">Draft (Konsep)</SelectItem>
                        <SelectItem value="sent" className="text-xs">Dikirim (Sent)</SelectItem>
                        <SelectItem value="paid" className="text-xs">Lunas (Paid)</SelectItem>
                        <SelectItem value="overdue" className="text-xs">Jatuh Tempo (Overdue)</SelectItem>
                        <SelectItem value="cancelled" className="text-xs">Dibatalkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="issue_date" className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" /> Tgl Terbit
                    </Label>
                    <Input
                      id="issue_date"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => handleChange("issue_date", e.target.value)}
                      className="text-xs h-9 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="due_date" className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-500" /> Jatuh Tempo <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleChange("due_date", e.target.value)}
                      className="text-xs h-9 rounded-xl border-rose-200 focus-visible:ring-rose-500"
                    />
                  </div>
                </div>

                {/* TEMPLATE CATATAN PEMBAYARAN */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notes" className="text-xs font-medium flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Catatan & Instruksi Pembayaran
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Template Cepat:</span>
                  </div>

                  <div className="flex gap-1.5 pb-1 overflow-x-auto scrollbar-none">
                    {PAYMENT_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleChange("notes", p.text)}
                        className="text-[10px] px-2 py-1 rounded-lg border bg-muted/30 hover:bg-muted text-muted-foreground flex items-center gap-1 transition cursor-pointer shrink-0"
                      >
                        <CreditCard className="w-3 h-3 text-emerald-600" /> {p.label}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    id="notes"
                    placeholder="Contoh: Transfer melalui Bank BCA No. Rek 123456789 a.n PT Inland Property..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                    className="text-xs resize-none rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR KANAN: RINGKASAN & SIMPAN */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="sticky top-6 border shadow-md rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 sm:p-5">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Ringkasan Invoice</span>
                  <FileText className="w-5 h-5 opacity-80" />
                </CardTitle>
                <CardDescription className="text-emerald-100 text-xs">
                  Review data sebelum disimpan
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
                <div className="space-y-2.5 border-b border-border/40 pb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Nomor Tagihan</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formData.invoice_number || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Penerima</span>
                    <span className="font-medium text-foreground text-right truncate max-w-[140px]">
                      {formData.client_name || "(Belum diisi)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">WhatsApp</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {formData.client_phone ? formatPhoneForDisplay(formData.client_phone) : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Jatuh Tempo</span>
                    <span className="font-medium text-foreground">
                      {formData.due_date
                        ? format(new Date(formData.due_date), "dd MMM yyyy", { locale: idLocale })
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    Total Nominal Tagihan
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(formData.amount)}
                  </div>
                </div>

                {formData.client_phone && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Siap dikirimkan via WhatsApp.</span>
                  </div>
                )}

                {/* TOMBOL AKSI GANDA */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 rounded-xl shadow-md shadow-emerald-600/20 gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Simpan Invoice
                      </>
                    )}
                  </Button>

                  {formData.client_phone && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => handleSubmit(undefined, true)}
                      className="w-full border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold h-10 rounded-xl gap-2 cursor-pointer text-xs"
                    >
                      <SendHorizontal className="h-4 w-4 text-emerald-600" />
                      Simpan & Kirim WA Direct
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full text-xs h-9 rounded-xl hover:bg-muted cursor-pointer"
                  >
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </form>
    </div>
  );
}