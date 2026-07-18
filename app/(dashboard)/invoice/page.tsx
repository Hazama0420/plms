// app/(dashboard)/invoices/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, User, Calendar, DollarSign, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const invoices = [
  { id: "INV-001", client: "Budi Santoso", property: "Villa Green Valley", amount: 150000000, status: "paid", date: "2026-07-15", dueDate: "2026-07-25" },
  { id: "INV-002", client: "Siti Rahayu", property: "Ruko Sentra Bisnis", amount: 85000000, status: "unpaid", date: "2026-07-10", dueDate: "2026-07-20" },
  { id: "INV-003", client: "Agus Wijaya", property: "Apartemen Harmoni", amount: 250000000, status: "overdue", date: "2026-06-30", dueDate: "2026-07-10" },
  { id: "INV-004", client: "Mardian Gilang", property: "Rumah Komplek Menteri", amount: 60000000, status: "paid", date: "2026-07-18", dueDate: "2026-07-28" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Lunas", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  unpaid: { label: "Belum Dibayar", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  overdue: { label: "Jatuh Tempo", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
};

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredInvoices = invoices.filter((inv) =>
    inv.client.toLowerCase().includes(search.toLowerCase()) ||
    inv.property.toLowerCase().includes(search.toLowerCase()) ||
    inv.id.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
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
            Kelola tagihan dan pembayaran
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

      {/* FILTER */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari invoice, klien, atau properti..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Belum Dibayar</p>
            <p className="text-2xl font-bold text-amber-600">{invoices.filter((i) => i.status === "unpaid").length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-rose-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Jatuh Tempo</p>
            <p className="text-2xl font-bold text-rose-600">{invoices.filter((i) => i.status === "overdue").length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500">Lunas</p>
            <p className="text-2xl font-bold text-emerald-600">{invoices.filter((i) => i.status === "paid").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead>Klien</TableHead>
                <TableHead>Properti</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => {
                const status = statusConfig[inv.status] || statusConfig.unpaid;
                return (
                  <TableRow key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => router.push(`/invoices/${inv.id}`)}>
                    <TableCell className="font-mono font-medium text-sm">{inv.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 text-xs font-semibold">
                          {inv.client.charAt(0)}
                        </div>
                        <span className="text-sm">{inv.client}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{inv.property}</TableCell>
                    <TableCell className="text-sm text-slate-500">{inv.date}</TableCell>
                    <TableCell className="text-sm text-slate-500">{inv.dueDate}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-800">{formatCurrency(inv.amount)}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs border-0", status.bg, status.color)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600">
                          <Pencil size={16} />
                        </Button>
                      <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors">
    <MoreHorizontal className="h-4 w-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44 dark:bg-slate-800 dark:border-slate-700">
    {/* items */}
  </DropdownMenuContent>
</DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Tidak ada invoice ditemukan
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}