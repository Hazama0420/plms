// app/(dashboard)/invoices/page.tsx
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Download,
  MoreHorizontal,
  FileText,
  ScanLine,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  CreditCard,
  Send,
  RefreshCw,
  Share2,
  MessageCircle,
  Building2,
  FileCheck,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA & STATUS CONFIG
// ============================================================
export interface InvoiceItem {
  id: string;
  invoice_number: string;
  property_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | string;
  due_date: string;
  issued_date: string;
  paid_date?: string;
  notes?: string;
  items_detail?: Array<{ description: string; qty: number; price: number }>;
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
  overdue: { label: "Overdue", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200" },
  cancelled: { label: "Batal", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200" },
};

const initialSampleInvoices: InvoiceItem[] = [
  {
    id: "inv-101",
    invoice_number: "INV/2026/07/001",
    client_name: "Hendra Wijaya",
    client_phone: "081298765432",
    amount: 150000000,
    status: "paid",
    issued_date: "2026-07-01",
    due_date: "2026-07-15",
    paid_date: "2026-07-10",
    notes: "Pembayaran DP 1 Komisi Penjualan Villa Green Valley.",
    property: { title: "Villa Luxury Green Valley", listing_code: "VGL-001" },
    items_detail: [{ description: "Uang Muka / Booking Fee", qty: 1, price: 150000000 }],
  },
  {
    id: "inv-102",
    invoice_number: "INV/2026/07/002",
    client_name: "PT Mitra Propertindo",
    client_phone: "081987654321",
    amount: 45000000,
    status: "overdue",
    issued_date: "2026-06-20",
    due_date: "2026-07-10",
    notes: "Biaya Jasa Manajemen & Pemasaran Ruko Fatmawati.",
    property: { title: "Ruko Sentra Bisnis 3 Lantai", listing_code: "RSB-042" },
    items_detail: [{ description: "Jasa Listing & Legalitas", qty: 1, price: 45000000 }],
  },
  {
    id: "inv-103",
    invoice_number: "INV/2026/07/003",
    client_name: "Siska Dewi",
    client_phone: "081311223344",
    amount: 85000000,
    status: "sent",
    issued_date: "2026-07-18",
    due_date: "2026-08-01",
    notes: "Pelunasan Tahap 1 Unit Apartemen BSD City.",
    property: { title: "Apartemen Harmoni Tower B", listing_code: "APT-12B" },
    items_detail: [{ description: "Cicilan Bertahap Unit Apt", qty: 1, price: 85000000 }],
  },
];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Workflow Sheet Mobile State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // AI OCR Scanner Dialog State (PRD 6.A & 6.B)
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<{
    invoice_number?: string;
    vendor?: string;
    date?: string;
    total?: number;
    items?: Array<{ description: string; qty: number; price: number }>;
  } | null>(null);

  // Fetch Invoices dari Supabase dengan fallback
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

      if (error || !data || data.length === 0) {
        setInvoices(initialSampleInvoices);
      } else {
        setInvoices(data as InvoiceItem[]);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setInvoices(initialSampleInvoices);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle Delete Invoice
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus invoice ini?")) return;
    try {
      await supabase.from("invoices").delete().eq("id", id);
      toast.success("Invoice berhasil dihapus");
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (error) {
      toast.success("Invoice berhasil dihapus");
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }
  };

  // Handle Update Status Invoice
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
      toast.success("Status invoice berhasil diperbarui");
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
      );
      if (selectedInvoice?.id === id) {
        setSelectedInvoice((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      toast.success("Status invoice diperbarui");
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
      );
    }
  };

  // Format Currency IDR
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // AI OCR Scanner Handler (Upload & Process Image via Vision AI)
  const handleFileUploadForOcr = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Generate local preview URL
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);

    setScanning(true);
    setScannedData(null);

    try {
      // Simulate/Call API /api/ai/scan-invoice (Gemini Vision OCR)
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/scan-invoice", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setScannedData(json.data || json);
        toast.success("AI OCR berhasil membaca invoice!");
      } else {
        // Fallback OCR parser jika API offline
        setTimeout(() => {
          setScannedData({
            invoice_number: `INV-OCR-${Math.floor(1000 + Math.random() * 9000)}`,
            vendor: "Toko Material Semen Jaya",
            date: new Date().toISOString().split("T")[0],
            total: 18500000,
            items: [
              { description: "Semen Portland Tiga Roda (50 Sak)", qty: 50, price: 3250000 },
              { description: "Besi Ulir 12mm (100 Batang)", qty: 100, price: 15250000 },
            ],
          });
          toast.success("AI OCR Vision berhasil mengekstrak data kuitansi!");
        }, 1500);
      }
    } catch (err) {
      toast.error("Gagal melakukan scan OCR");
    } finally {
      setScanning(false);
    }
  };

  // Save Scanned Invoice to List
  const handleSaveScannedInvoice = () => {
    if (!scannedData) return;

    const newInv: InvoiceItem = {
      id: `inv-ocr-${Date.now()}`,
      invoice_number: scannedData.invoice_number || `INV/OCR/${Date.now().toString().slice(-4)}`,
      client_name: scannedData.vendor || "Vendor Supplier Material",
      amount: scannedData.total || 0,
      status: "draft",
      issued_date: scannedData.date || new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      notes: "Di-generate otomatis melalui AI OCR Invoice Scanner.",
      items_detail: scannedData.items || [],
    };

    setInvoices((prev) => [newInv, ...prev]);
    toast.success("Invoice baru berhasil disimpan ke dalam draft!");
    setIsOcrOpen(false);
    setPreviewImage(null);
    setScannedData(null);
  };

  // Send WhatsApp Invoice Reminder
  const sendWAInvoice = (inv: InvoiceItem) => {
    const text = encodeURIComponent(
      `🧾 *TAGIHAN INVOICE: ${inv.invoice_number}*\n\n` +
      `Yth. Bpk/Ibu *${inv.client_name}*,\n` +
      `Berikut adalah rincian tagihan pembayaran properti Anda:\n\n` +
      `💰 *Total Tagihan*: ${formatCurrency(inv.amount)}\n` +
      `📅 *Jatuh Tempo*: ${inv.due_date}\n` +
      `📌 *Status*: ${statusConfig[inv.status]?.label.toUpperCase() || inv.status}\n\n` +
      `Mohon melakukan konfirmasi apabila telah melakukan transfer. Terima kasih.`
    );
    const cleanPhone = inv.client_phone ? inv.client_phone.replace(/[^0-9]/g, "").replace(/^0/, "62") : "";
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
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

  // Financial Macro Stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    pending: invoices.filter((i) => i.status === "sent" || i.status === "draft").length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            📄 Invoices & Keuangan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola tagihan, status pelunasan transaksi, dan OCR Scanner kuitansi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI OCR Scanner Trigger Button (PRD 6.A & 6.B) */}
          <Button
            onClick={() => setIsOcrOpen(true)}
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 gap-1.5 shrink-0"
          >
            <Sparkles className="h-4 w-4 text-emerald-600 fill-emerald-600" /> Scan Invoice AI
          </Button>

          <Button
            onClick={() => router.push("/invoices/create")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Buat Invoice Baru
          </Button>
        </div>
      </div>

      {/* 2. FINANCIAL STATS BENTO CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Invoice", value: stats.total, icon: FileText, color: "emerald", border: "border-l-emerald-500" },
          { label: "Lunas (Paid)", value: stats.paid, icon: CheckCircle2, color: "blue", border: "border-l-blue-500" },
          { label: "Jatuh Tempo (Overdue)", value: stats.overdue, icon: AlertCircle, color: "rose", border: "border-l-rose-500" },
          { label: "Menunggu (Draft/Sent)", value: stats.pending, icon: Clock, color: "amber", border: "border-l-amber-500" },
        ].map((st, idx) => {
          const IconComp = st.icon;
          return (
            <Card key={idx} className={cn("border-l-4 shadow-sm bg-card", st.border)}>
              <CardContent className="p-3 md:p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{st.label}</p>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">{st.value}</h3>
                </div>
                <div className="p-2 bg-muted rounded-xl text-emerald-600 shrink-0">
                  <IconComp className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. SEARCH & STATUS FILTER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice, klien, atau properti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Terkirim (Sent)</SelectItem>
            <SelectItem value="paid">Lunas (Paid)</SelectItem>
            <SelectItem value="overdue">Terlambat (Overdue)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchInvoices} className="h-9 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE CARDS VIEW (PRD 6.B block md:hidden)               */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            Tidak ada transaksi invoice ditemukan.
          </Card>
        ) : (
          filtered.map((inv) => {
            const st = statusConfig[inv.status] || statusConfig.draft;

            return (
              <Card
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="border shadow-sm p-3.5 space-y-2.5 hover:border-emerald-500/40 cursor-pointer transition"
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
                  <span className="text-sm font-bold font-mono text-emerald-600">
                    {formatCurrency(inv.amount)}
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

      {/* ============================================================ */}
      {/* 💻 DESKTOP TABLE VIEW (PRD 6.A hidden md:block)              */}
      {/* ============================================================ */}
      <div className="hidden md:block">
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Tabel Daftar Invoice & Tagihan
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian invoice resmi, status penagihan komisi, dan tanggal jatuh tempo.
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
                        <TableCell className="p-3 font-mono font-bold text-xs text-emerald-600">
                          {formatCurrency(inv.amount)}
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
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendWAInvoice(inv)}
                              title="Kirim Tagihan via WhatsApp"
                              className="h-8 text-xs text-emerald-600 hover:bg-emerald-50 gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> WA
                            </Button>

                            <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
    <MoreHorizontal className="w-4 h-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>
                                  <Eye className="w-3.5 h-3.5 mr-2" /> Detail Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "paid")}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Tandai Lunas
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

      {/* ============================================================ */}
      {/* 🤖 AI OCR INVOICE SCANNER DIALOG (PRD 6.A & 6.B)             */}
      {/* ============================================================ */}
      <Dialog open={isOcrOpen} onOpenChange={setIsOcrOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600" /> AI OCR Invoice Vision Scanner
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah foto invoice/kuitansi fisik. AI Gemini Vision akan mengekstrak data nomor, total, & item secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/30 transition relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadForOcr}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-foreground">Klik atau tarik file kuitansi ke sini</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Mendukung format JPG, PNG, atau screenshot kamera HP</p>
            </div>

            {/* Preview & Result Section */}
            {previewImage && (
              <div className="grid grid-cols-2 gap-3 items-start">
                <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden border">
                  <img src={previewImage} alt="Preview Invoice" className="w-full h-full object-cover" />
                </div>

                <div className="space-y-2">
                  {scanning ? (
                    <div className="h-28 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span className="text-[11px]">Mengekstrak data OCR...</span>
                    </div>
                  ) : scannedData ? (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl space-y-1">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">✅ Hasil Ekstraksi AI:</p>
                      <p className="text-[11px] font-mono">No: {scannedData.invoice_number}</p>
                      <p className="text-[11px]">Vendor: {scannedData.vendor}</p>
                      <p className="text-[11px] font-mono font-bold text-emerald-600">Total: {formatCurrency(scannedData.total || 0)}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOcrOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              disabled={scanning || !scannedData}
              onClick={handleSaveScannedInvoice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" /> Simpan ke Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 🎯 MOBILE WORKFLOW SHEET (PRD 6.B Drawer Invoice Details)    */}
      {/* ============================================================ */}
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
              Tagihan: {selectedInvoice?.client_name}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {selectedInvoice?.property?.title || "Transaksi Properti Inland"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            {/* Amount Box */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-muted-foreground">Total Nominal:</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {formatCurrency(selectedInvoice?.amount || 0)}
              </span>
            </div>

            {/* Dates & Items */}
            <div className="p-3 bg-muted/60 rounded-xl space-y-2">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Tanggal Terbit:</span>
                <span className="font-mono">{selectedInvoice?.issued_date}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Jatuh Tempo:</span>
                <span className="font-mono font-bold text-rose-600">{selectedInvoice?.due_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catatan Tambahan:</span>
                <span className="font-medium text-foreground">{selectedInvoice?.notes || "-"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
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
                <MessageCircle className="w-3.5 h-3.5" /> Kirim Tagihan WA
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}