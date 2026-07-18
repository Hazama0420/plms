// app/(dashboard)/invoices/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Pencil, Trash2, Download, MoreHorizontal, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// ============================================================
// TIPE DATA
// ============================================================
interface Invoice {
  id: string;
  invoice_number: string;
  property_id: string;
  client_name: string;
  client_email?: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  due_date: string;
  issued_date: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  property?: {
    title: string;
    listing_code: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
  sent: { label: "Sent", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  paid: { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  overdue: { label: "Overdue", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
  cancelled: { label: "Cancelled", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
};

// ============================================================
// COMPONENT
// ============================================================
export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          property:properties(id, title, listing_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error?.message || error);
      toast.error("Gagal memuat data invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus invoice ini?")) return;
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      toast.success("Invoice berhasil dihapus");
      fetchInvoices();
    } catch (error: any) {
      toast.error("Gagal menghapus invoice");
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.property?.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge className={cn("text-xs font-medium border-0", config.bg, config.color)}>
        {config.label}
      </Badge>
    );
  };

  // Statistik
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    draft: invoices.filter((i) => i.status === "draft").length,
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            📄 Invoice
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola invoice dan penagihan properti
          </p>
        </div>
        <Button
          onClick={() => router.push("/invoices/create")}
          className="bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500 text-white shadow-md shadow-emerald-600/30"
        >
          <Plus size={18} className="mr-2" />
          Buat Invoice
        </Button>
      </div>

      {/* STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "border-emerald-500" },
          { label: "Paid", value: stats.paid, color: "border-emerald-500" },
          { label: "Overdue", value: stats.overdue, color: "border-rose-500" },
          { label: "Draft", value: stats.draft, color: "border-slate-500" },
        ].map((stat, idx) => (
          <Card key={idx} className={cn("border-l-4 shadow-sm", stat.color)}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTER */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nomor invoice, klien, atau properti..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <FileText className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">Belum ada invoice</p>
              <p className="text-sm">Klik "Buat Invoice" untuk mulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Klien</TableHead>
                    <TableHead>Properti</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <TableCell className="font-mono font-medium text-sm">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{invoice.client_name}</TableCell>
                      <TableCell>
                        {invoice.property?.title || "-"}
                        {invoice.property?.listing_code && (
                          <span className="text-xs text-slate-400 block">
                            {invoice.property.listing_code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), "dd MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-amber-600"
                            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                              <MoreHorizontal size={16} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(invoice.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}