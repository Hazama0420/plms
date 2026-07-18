// app/(dashboard)/invoices/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, Edit, Trash2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA
// ============================================================
interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  property_id: string | null;
  total_amount: number;
  status: string;
  due_date: string;
  issue_date: string;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  property?: { id: string; title: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
  sent: { label: "Dikirim", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  paid: { label: "Lunas", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  overdue: { label: "Jatuh Tempo", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
  cancelled: { label: "Dibatalkan", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
};

// ============================================================
// COMPONENT
// ============================================================
export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            property:properties(id, title)
          `)
          .eq("id", invoiceId)
          .single();

        if (error) throw error;
        setInvoice(data);
      } catch (error: any) {
        console.error("Error fetching invoice:", error);
        toast.error(error?.message || "Gagal memuat data invoice");
        router.push("/invoices");
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, router]);

  // ===== SAFE DATE FORMATTING =====
  const formatDateSafe = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: id });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-slate-500">Invoice tidak ditemukan</p>
        <Button onClick={() => router.push("/invoices")} className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.draft;

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
              Detail Invoice
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {invoice.invoice_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("border-0", status.bg, status.color)}>
            {status.label}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
          <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4 mr-2" />
            Unduh PDF
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nomor Invoice</p>
                  <p className="font-medium">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={cn("border-0", status.bg, status.color)}>
                    {status.label}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Klien</p>
                  <p className="font-medium">{invoice.client_name}</p>
                  {invoice.client_email && (
                    <p className="text-sm text-slate-500">{invoice.client_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Properti Terkait</p>
                  <p className="font-medium">
                    {invoice.property?.title || invoice.property_id || "-"}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Tanggal Terbit</p>
                  <p className="font-medium">{formatDateSafe(invoice.issue_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Jatuh Tempo</p>
                  <p className="font-medium">{formatDateSafe(invoice.due_date)}</p>
                </div>
              </div>
              {invoice.paid_date && (
                <div>
                  <p className="text-sm text-slate-500">Tanggal Lunas</p>
                  <p className="font-medium">{formatDateSafe(invoice.paid_date)}</p>
                </div>
              )}
              {invoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-slate-500">Catatan</p>
                    <p className="text-sm">{invoice.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jumlah Tagihan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR - ACTIONS */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Invoice
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                onClick={async () => {
                  if (!confirm("Yakin hapus invoice ini?")) return;
                  try {
                    const { error } = await supabase
                      .from("invoices")
                      .delete()
                      .eq("id", invoice.id);
                    if (error) throw error;
                    toast.success("Invoice berhasil dihapus");
                    router.push("/invoices");
                  } catch (error: any) {
                    toast.error(error?.message || "Gagal hapus invoice");
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Invoice
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Tambahan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Dibuat</span>
                <span>{formatDateSafe(invoice.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID</span>
                <span className="font-mono text-xs">{invoice.id.slice(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}