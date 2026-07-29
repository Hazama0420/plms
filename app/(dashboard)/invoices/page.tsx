// app/(dashboard)/invoices/page.tsx
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

import { PrintInvoiceButton } from "@/components/invoices/print-invoice-button";

import {
  Plus,
  Search,
  Trash2,
  MoreHorizontal,
  FileText,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  MessageCircle,
  ChevronRight,
  FileCheck,
  Send,
  Loader2,
  Receipt,
  Edit3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA & KONFIGURASI STATUS
// ============================================================
export interface InvoiceItem {
  id: string;
  invoice_number: string;
  property_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  total_amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | string;
  due_date: string;
  issue_date?: string;
  paid_date?: string;
  notes?: string;
  created_at?: string;
  property?: {
    title: string;
    listing_code: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200" },
  sent: { label: "Terkirim", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200" },
  paid: { label: "Lunas", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200" },
  overdue: { label: "Jatuh Tempo", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200" },
  cancelled: { label: "Batal", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200" },
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [ocrForm, setOcrForm] = useState({
    invoice_number: "",
    client_name: "",
    total_amount: 0,
    status: "draft" as "draft" | "sent" | "paid" | "overdue",
    issue_date: "",
    due_date: "",
    notes: "",
  });

  // ===== FETCH DATA INVOICE SUPABASE =====
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          property:properties(id, title, listing_code)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        setInvoices([]);
      } else {
        const mapped = (data || []).map((inv: any) => ({
          ...inv,
          total_amount: Number(inv.total_amount || inv.amount || 0),
        }));
        setInvoices(mapped);
      }
    } catch (error) {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ===== HAPUS INVOICE =====
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus invoice ini?")) return;
    try {
      await supabase.from("invoices").delete().eq("id", id);
      toast.success("Invoice berhasil dihapus");
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (error) {
      toast.error("Gagal menghapus invoice");
    }
  };

  // ===== UPDATE STATUS INVOICE =====
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
      toast.success(`Status diubah menjadi ${statusConfig[newStatus]?.label || newStatus}`);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
      );
      if (selectedInvoice?.id === id) {
        setSelectedInvoice((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      toast.error("Gagal memperbarui status");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // ===== OCR UPLOAD & EXTRACTION HANDLER =====
  const handleFileUploadForOcr = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);

    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/scan-invoice", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (res.ok && json.data) {
        const data = json.data;
        const todayStr = new Date().toISOString().split("T")[0];
        const defaultDueStr = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

        setOcrForm({
          invoice_number: data.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
          client_name: data.vendor || "Supplier Material",
          total_amount: Number(data.total || 0),
          status: "draft",
          issue_date: data.date || todayStr,
          due_date: defaultDueStr,
          notes: "Hasil scan otomatis via AI Gemini Vision Scanner.",
        });

        toast.success("AI Gemini Vision berhasil mengekstrak kuitansi! Silakan tinjau & sesuaikan data.");
      } else {
        throw new Error(json.error || "Gagal membaca gambar kuitansi.");
      }
    } catch (err: any) {
      console.error("OCR Error:", err);
      toast.error(err?.message || "Gagal memproses gambar OCR.");
    } finally {
      setScanning(false);
    }
  };

  // ===== SIMPAN INVOICE HASIL SCAN =====
  const handleSaveScannedInvoice = async () => {
    if (!ocrForm.client_name.trim()) {
      toast.error("Nama Klien / Vendor wajib diisi.");
      return;
    }
    if (ocrForm.total_amount <= 0) {
      toast.error("Nominal tagihan harus lebih dari 0.");
      return;
    }

    // ✅ FIX: bersihkan notes, null → undefined
    const cleanNotes = ocrForm.notes.trim() || undefined;

    const newInvoiceObj = {
      invoice_number: ocrForm.invoice_number.trim() || `INV-${Date.now().toString().slice(-6)}`,
      client_name: ocrForm.client_name.trim(),
      total_amount: Number(ocrForm.total_amount),
      status: ocrForm.status,
      issue_date: ocrForm.issue_date || new Date().toISOString().split("T")[0],
      due_date: ocrForm.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      notes: cleanNotes,
    };

    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert(newInvoiceObj)
        .select()
        .single();

      if (!error && data) {
        setInvoices((prev) => [data, ...prev]);
      } else {
        // ✅ FIX: pastikan notes = undefined jika null
        setInvoices((prev) => [
          {
            id: `ocr-${Date.now()}`,
            ...newInvoiceObj,
            notes: newInvoiceObj.notes || undefined,
          } as InvoiceItem,
          ...prev,
        ]);
      }

      toast.success(`Invoice ${newInvoiceObj.invoice_number} berhasil disimpan [${statusConfig[newInvoiceObj.status]?.label}]!`);
      setIsOcrOpen(false);
      setPreviewImage(null);
    } catch (err) {
      toast.error("Gagal menyimpan invoice.");
    }
  };

  // ===== KIRIM PESAN WHATSAPP =====
  const sendWAInvoice = (inv: InvoiceItem) => {
    const text = encodeURIComponent(
      `🧾 *TAGIHAN INVOICE: ${inv.invoice_number}*\n\n` +
      `Yth. Bpk/Ibu *${inv.client_name}*,\n` +
      `Berikut rincian tagihan transaksi properti Anda:\n\n` +
      `💰 *Total Nominal*: ${formatCurrency(inv.total_amount)}\n` +
      `📅 *Jatuh Tempo*: ${inv.due_date}\n` +
      `📌 *Status*: ${(statusConfig[inv.status]?.label || inv.status).toUpperCase()}\n\n` +
      `Mohon konfirmasi jika telah melakukan pembayaran. Terima kasih!`
    );
    let cleanPhone = inv.client_phone ? inv.client_phone.replace(/[^0-9]/g, "") : "";
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

    window.open(`https://wa.me/${cleanPhone || ""}?text=${text}`, "_blank");
  };

  // Filter Data
  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (inv.property?.title && inv.property.title.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    pending: invoices.filter((i) => i.status === "sent" || i.status === "draft").length,
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. HEADER HALAMAN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            📄 Invoices & Keuangan
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola tagihan transaksi, pengiriman WhatsApp, dan cetak invoice resmi Inland Property
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setPreviewImage(null);
              setOcrForm({
                invoice_number: "",
                client_name: "",
                total_amount: 0,
                status: "draft",
                issue_date: "",
                due_date: "",
                notes: "",
              });
              setIsOcrOpen(true);
            }}
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs h-9 gap-1.5 shrink-0"
          >
            <Sparkles className="h-4 w-4 text-emerald-600 fill-emerald-600" /> Scan Invoice AI
          </Button>

          <Button
            onClick={() => router.push("/invoices/create")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-md shadow-emerald-600/20 gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Buat Invoice
          </Button>
        </div>
      </div>

      {/* 2. STATS RINGKASAN */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Invoice", value: stats.total, icon: FileText, border: "border-l-emerald-500" },
          { label: "Lunas (Paid)", value: stats.paid, icon: CheckCircle2, border: "border-l-blue-500" },
          { label: "Jatuh Tempo", value: stats.overdue, icon: AlertCircle, border: "border-l-rose-500" },
          { label: "Draft / Pending", value: stats.pending, icon: Clock, border: "border-l-amber-500" },
        ].map((st, idx) => {
          const IconComp = st.icon;
          return (
            <Card key={idx} className={cn("border-l-4 shadow-xs bg-card", st.border)}>
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{st.label}</p>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">{st.value}</h3>
                </div>
                <div className="p-2 bg-muted rounded-lg text-emerald-600 shrink-0">
                  <IconComp className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice, nama klien, atau properti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs focus-visible:ring-emerald-500"
          />
        </div>
        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
            <SelectItem value="draft" className="text-xs">Draft</SelectItem>
            <SelectItem value="sent" className="text-xs">Terkirim (Sent)</SelectItem>
            <SelectItem value="paid" className="text-xs">Lunas (Paid)</SelectItem>
            <SelectItem value="overdue" className="text-xs">Jatuh Tempo (Overdue)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchInvoices} className="h-9 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* 4. TAMPILAN CARD MOBILE */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            Belum ada data invoice.
          </Card>
        ) : (
          filtered.map((inv) => {
            const st = statusConfig[inv.status] || statusConfig.draft;

            return (
              <Card
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="border shadow-xs p-3.5 space-y-2.5 hover:border-emerald-500/40 cursor-pointer transition"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="font-mono font-bold text-xs text-foreground">{inv.invoice_number}</span>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", st.bg, st.color)}>
                    {st.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{inv.client_name}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {inv.property?.title || "Transaksi Properti"}
                    </p>
                  </div>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(inv.total_amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> Tempo: {inv.due_date}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. TAMPILAN TABEL DESKTOP */}
      <div className="hidden md:block">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Daftar Transaksi Invoice
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian invoice resmi, status penagihan, dan tanggal jatuh tempo
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Tidak ada data invoice.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">No. Invoice</TableHead>
                    <TableHead className="text-xs font-semibold">Nama Klien / Vendor</TableHead>
                    <TableHead className="text-xs font-semibold">Properti Terkait</TableHead>
                    <TableHead className="text-xs font-semibold">Total Tagihan</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Jatuh Tempo</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => {
                    const st = statusConfig[inv.status] || statusConfig.draft;

                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30">
                        <TableCell className="p-3 font-mono font-bold text-xs text-foreground">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell className="p-3 text-xs font-medium text-foreground">
                          {inv.client_name}
                        </TableCell>
                        <TableCell className="p-3 text-xs text-muted-foreground">
                          {inv.property?.title || "-"}
                        </TableCell>
                        <TableCell className="p-3 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(inv.total_amount)}
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", st.bg, st.color)}>
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3 text-xs font-mono text-muted-foreground">
                          {inv.due_date}
                        </TableCell>
                        <TableCell className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <PrintInvoiceButton invoiceId={inv.id} />

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendWAInvoice(inv)}
                              title="Kirim Invoice via WA"
                              className="h-8 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> WA
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
                                <MoreHorizontal className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 text-xs">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "paid")}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Tandai Lunas
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "sent")}>
                                  <Send className="w-3.5 h-3.5 mr-2 text-blue-600" /> Tandai Terkirim
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="text-rose-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. AI OCR INVOICE SCANNER DIALOG DENGAN FORM INTERAKTIF */}
      <Dialog open={isOcrOpen} onOpenChange={setIsOcrOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600" /> Scan & Edit Invoice AI (Gemini Vision)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah foto kuitansi/invoice. Anda dapat meninjau, memilih status tagihan, dan mengedit data sebelum disimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Box Upload */}
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadForOcr}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
              <p className="font-bold text-foreground">Klik atau drag foto kuitansi ke sini</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Format JPG, PNG, atau foto tulisan tangan kuitansi</p>
            </div>

            {/* Loading AI */}
            {scanning && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs font-medium">Gemini AI sedang membaca kuitansi...</span>
              </div>
            )}

            {/* Form Edit Interaktif AI */}
            {previewImage && !scanning && (
              <div className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" /> Tinjau & Edit Data Hasil Scan:
                  </span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    Dapat Diedit
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Nomor Invoice / Kuitansi</Label>
                    <Input
                      value={ocrForm.invoice_number}
                      onChange={(e) => setOcrForm({ ...ocrForm, invoice_number: e.target.value })}
                      placeholder="INV-2026..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Nama Vendor / Klien</Label>
                    <Input
                      value={ocrForm.client_name}
                      onChange={(e) => setOcrForm({ ...ocrForm, client_name: e.target.value })}
                      placeholder="Nama toko / pembayar"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Total Nominal (Rp)</Label>
                    <Input
                      type="number"
                      value={ocrForm.total_amount}
                      onChange={(e) => setOcrForm({ ...ocrForm, total_amount: Number(e.target.value) })}
                      placeholder="0"
                      className="h-8 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Status Tagihan</Label>
                    <Select
                      value={ocrForm.status}
                      onValueChange={(val) => setOcrForm({ ...ocrForm, status: val || "draft" })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft" className="text-xs">Draft (Konsep)</SelectItem>
                        <SelectItem value="sent" className="text-xs">Terkirim (Sent)</SelectItem>
                        <SelectItem value="paid" className="text-xs">Lunas (Paid)</SelectItem>
                        <SelectItem value="overdue" className="text-xs">Jatuh Tempo (Overdue)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Tanggal Terbit</Label>
                    <Input
                      type="date"
                      value={ocrForm.issue_date}
                      onChange={(e) => setOcrForm({ ...ocrForm, issue_date: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Tanggal Jatuh Tempo</Label>
                    <Input
                      type="date"
                      value={ocrForm.due_date}
                      onChange={(e) => setOcrForm({ ...ocrForm, due_date: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Catatan Invoice</Label>
                  <Textarea
                    value={ocrForm.notes}
                    onChange={(e) => setOcrForm({ ...ocrForm, notes: e.target.value })}
                    rows={2}
                    className="text-xs resize-none"
                    placeholder="Catatan tambahan..."
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsOcrOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              disabled={scanning || !previewImage}
              onClick={handleSaveScannedInvoice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <FileCheck className="w-3.5 h-3.5" /> Simpan Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. DRAWER WORKFLOW MOBILE */}
      <Sheet open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[88vh] p-5">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-mono">
                {selectedInvoice?.invoice_number}
              </Badge>
              {selectedInvoice && (
                <Badge variant="outline" className={cn("text-[10px]", statusConfig[selectedInvoice.status]?.bg, statusConfig[selectedInvoice.status]?.color)}>
                  {statusConfig[selectedInvoice.status]?.label}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-base font-bold mt-1">
              {selectedInvoice?.client_name}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {selectedInvoice?.property?.title || "Transaksi Properti Inland"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <span className="text-muted-foreground">Total Nominal:</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {formatCurrency(selectedInvoice?.total_amount || 0)}
              </span>
            </div>

            <div className="p-3 bg-muted/60 rounded-xl space-y-2">
              <div className="flex justify-between border-b pb-1.5 border-border/40">
                <span className="text-muted-foreground">Tgl Jatuh Tempo:</span>
                <span className="font-mono font-bold text-rose-600">{selectedInvoice?.due_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catatan:</span>
                <span className="font-medium text-foreground">{selectedInvoice?.notes || "-"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {selectedInvoice && <PrintInvoiceButton invoiceId={selectedInvoice.id} />}

              <Button
                variant="outline"
                className="w-full text-xs gap-1"
                onClick={() => {
                  if (selectedInvoice) handleUpdateStatus(selectedInvoice.id, "paid");
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Set Lunas
              </Button>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-md shadow-emerald-600/20"
                onClick={() => {
                  if (selectedInvoice) sendWAInvoice(selectedInvoice);
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Kirim WA
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}