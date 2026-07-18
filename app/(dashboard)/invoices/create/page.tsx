// app/(dashboard)/invoices/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA
// ============================================================
interface FormData {
  invoice_number: string;
  client_id: string;
  client_name: string;
  client_email: string;
  property_id: string;
  amount: string;
  due_date: string;
  issue_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes: string;
}

// ============================================================
// COMPONENT
// ============================================================
export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    invoice_number: `INV-${Date.now().toString().slice(-8)}`,
    client_id: "",
    client_name: "",
    client_email: "",
    property_id: "",
    amount: "",
    due_date: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    issue_date: format(new Date(), "yyyy-MM-dd"),
    status: "draft",
    notes: "",
  });

  // ===== FETCH CLIENTS =====
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("id, name, full_name, email")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((client: any) => ({
          id: client.id,
          name: client.full_name || client.name || client.email || "Tanpa nama",
          email: client.email || "",
        }));

        setClients(mapped);
      } catch (error: any) {
        console.error("Error fetching from crm_leads:", error.message);

        try {
          const { data, error } = await supabase
            .from("leads")
            .select("id, name, full_name, email")
            .order("created_at", { ascending: false });

          if (!error) {
            const mapped = (data || []).map((client: any) => ({
              id: client.id,
              name: client.full_name || client.name || client.email || "Tanpa nama",
              email: client.email || "",
            }));
            setClients(mapped);
          }
        } catch (_) {}
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
          .select("id, title, listing_code, listing_type")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProperties(data || []);
      } catch (error: any) {
        console.error("Error fetching properties:", error);
        toast.error("Gagal memuat data properti");
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  // ===== HANDLE FORM =====
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ Handler menerima string | null
  const handleSelectClient = (clientId: string | null) => {
    if (!clientId) return;
    const selected = clients.find((c) => c.id === clientId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        client_id: selected.id,
        client_name: selected.name,
        client_email: selected.email || "",
      }));
    }
  };

  // ✅ Handler menerima string | null untuk status
  const handleStatusChange = (status: string | null) => {
    if (!status) return;
    setFormData((prev) => ({ ...prev, status: status as any }));
  };

  // ✅ Handler menerima string | null untuk property
  const handlePropertyChange = (propertyId: string | null) => {
    setFormData((prev) => ({ ...prev, property_id: propertyId || "" }));
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        invoice_number: formData.invoice_number,
        client_id: formData.client_id || null,
        client_name: formData.client_name.trim(),
        client_email: formData.client_email.trim() || null,
        property_id: formData.property_id || null,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        total_amount: parseFloat(formData.amount),
        status: formData.status,
        notes: formData.notes.trim() || null,
        created_by: userId || null,
      };

      console.log("📤 Inserting invoice:", insertData);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert(insertData)
        .select()
        .single();

      if (invoiceError) {
        console.error("❌ Supabase insert error:", invoiceError);
        console.error("❌ Error message:", invoiceError.message);
        console.error("❌ Error details:", invoiceError.details);
        console.error("❌ Error hint:", invoiceError.hint);
        throw new Error(invoiceError.message || "Gagal menyimpan invoice");
      }

      toast.success(`Invoice ${formData.invoice_number} berhasil dibuat!`);
      router.push("/invoices");
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast.error(error?.message || "Gagal membuat invoice. Cek console untuk detail.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              📄 Buat Invoice Baru
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Buat tagihan untuk klien atau properti
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {formData.invoice_number}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "text-sm",
              formData.status === "draft" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              formData.status === "sent" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
              formData.status === "paid" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
              formData.status === "overdue" && "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
              formData.status === "cancelled" && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {formData.status === "draft"
              ? "Draft"
              : formData.status === "sent"
              ? "Dikirim"
              : formData.status === "paid"
              ? "Lunas"
              : formData.status === "overdue"
              ? "Jatuh Tempo"
              : "Dibatalkan"}
          </Badge>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informasi Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Name */}
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nama Klien <span className="text-rose-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      id="client_name"
                      placeholder="Masukkan nama klien"
                      value={formData.client_name}
                      onChange={(e) => handleChange("client_name", e.target.value)}
                      className="flex-1"
                    />
                    {clients.length > 0 && (
                      // ✅ onValueChange langsung ke handler yang menerima string | null
                      <Select onValueChange={handleSelectClient}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Pilih dari kontak" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ketik manual atau pilih dari daftar kontak yang sudah ada.
                  </p>
                </div>

                {/* Client Email */}
                <div className="space-y-2">
                  <Label htmlFor="client_email">Email Klien</Label>
                  <Input
                    id="client_email"
                    type="email"
                    placeholder="email@klien.com"
                    value={formData.client_email}
                    onChange={(e) => handleChange("client_email", e.target.value)}
                  />
                </div>

                {/* Property */}
                <div className="space-y-2">
                  <Label htmlFor="property_id">Properti Terkait (Opsional)</Label>
                  <Select
                    value={formData.property_id}
                    onValueChange={handlePropertyChange}
                    disabled={loadingProperties}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingProperties ? "Memuat..." : "Pilih properti"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak terkait properti</SelectItem>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>
                          {prop.title || prop.listing_code} ({prop.listing_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount & Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Jumlah Tagihan (Rp) <span className="text-rose-500">*</span></Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="5000000"
                      value={formData.amount}
                      onChange={(e) => handleChange("amount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Dikirim</SelectItem>
                        <SelectItem value="paid">Lunas</SelectItem>
                        <SelectItem value="overdue">Jatuh Tempo</SelectItem>
                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue_date">Tanggal Terbit</Label>
                    <Input
                      id="issue_date"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => handleChange("issue_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Jatuh Tempo <span className="text-rose-500">*</span></Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleChange("due_date", e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan untuk invoice..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR - SUMMARY */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nomor Invoice</span>
                    <span className="font-mono text-sm font-medium">{formData.invoice_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Klien</span>
                    <span className="font-medium">{formData.client_name || "Belum diisi"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Jatuh Tempo</span>
                    <span className="font-medium">
                      {formData.due_date ? format(new Date(formData.due_date), "dd MMM yyyy") : "-"}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-emerald-600">
                      Rp {formData.amount ? parseFloat(formData.amount).toLocaleString("id-ID") : "0"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
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
                        Simpan Invoice
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
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