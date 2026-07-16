// app/(dashboard)/crm/leads/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Pencil, Trash2, RefreshCw, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { crmService } from "@/services/crm.service";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================
// STATUS CONFIG
// ============================================================
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-600", bg: "bg-blue-100" },
  contacted: { label: "Contacted", color: "text-amber-600", bg: "bg-amber-100" },
  qualified: { label: "Qualified", color: "text-emerald-600", bg: "bg-emerald-100" },
  proposal: { label: "Proposal", color: "text-purple-600", bg: "bg-purple-100" },
  negotiation: { label: "Negotiation", color: "text-orange-600", bg: "bg-orange-100" },
  won: { label: "Won", color: "text-green-700", bg: "bg-green-100" },
  lost: { label: "Lost", color: "text-rose-600", bg: "bg-rose-100" },
};

const statusOptions = Object.entries(statusConfig).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function LeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    page: 1,
  });
  const [data, setData] = useState<{ data: any[]; count: number; totalPages: number }>({
    data: [],
    count: 0,
    totalPages: 0,
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result = await crmService.getLeads({
        search: filters.search,
        status: filters.status as any,
        page: filters.page,
        limit: 10,
      });
      setData(result);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Gagal memuat leads", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const refetchLeads = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    fetchLeads();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus lead "${name}"?`)) return;
    try {
      await supabase.from("crm_leads").delete().eq("id", id);
      toast.success("Lead berhasil dihapus");
      refetchLeads();
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error("Gagal hapus lead", {
        description: error.message || "Silakan coba lagi.",
      });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await crmService.updateStatus(id, status as any);
      toast.success("Status berhasil diperbarui");
      refetchLeads();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal update status", {
        description: error.message || "Silakan coba lagi.",
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">👥 Leads</h1>
            <p className="text-sm text-white/80">Kelola prospek dan pelanggan potensial</p>
          </div>
          <Button
            onClick={() => router.push("/crm/leads/create")}
            className="bg-white/20 text-white hover:bg-white/30 transition"
          >
            <Plus size={18} className="mr-2" />
            Tambah Lead
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="shadow-sm border-0">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder="Cari nama atau telepon..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9"
              />
              <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">
                <Search size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={refetchLeads} className="h-9">
                <RefreshCw size={16} />
              </Button>
            </div>

            <Select
              value={filters.status}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val, page: 1 }))}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.data.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <div className="text-6xl">👥</div>
              <p className="text-lg font-medium">Belum ada lead</p>
              <p className="text-sm">Klik &quot;Tambah Lead&quot; untuk mulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="font-semibold">Kontak</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Sumber</TableHead>
                    <TableHead className="font-semibold text-right">Budget</TableHead>
                    <TableHead className="font-semibold">Tanggal</TableHead>
                    <TableHead className="font-semibold text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((lead: any) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                      onClick={() => router.push(`/crm/leads/${lead.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {lead.contact?.full_name || "Tanpa Nama"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {lead.contact?.phone && <span>📞 {lead.contact.phone}</span>}
                            {lead.contact?.email && <span>✉️ {lead.contact.email}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium border-0",
                            statusConfig[lead.status]?.bg,
                            statusConfig[lead.status]?.color
                          )}
                        >
                          {statusConfig[lead.status]?.label || lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                        {lead.source || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700 dark:text-slate-200">
                        {lead.budget ? formatCurrency(lead.budget) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(lead.created_at)}
                      </TableCell>
                     <TableCell>
  <div
    className="flex items-center justify-end gap-1"
    onClick={(e) => e.stopPropagation()}
  >
    {/* Detail */}
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-blue-600"
      onClick={() => router.push(`/crm/leads/${lead.id}`)}
    >
      <Eye size={16} />
    </Button>

    {/* Edit */}
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-amber-600"
      onClick={() => router.push(`/crm/leads/${lead.id}/edit`)}
    >
      <Pencil size={16} />
    </Button>

    {/* More Actions - FIXED: tanpa asChild dan tanpa nested button */}
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          Ubah Status
        </DropdownMenuItem>
        {statusOptions.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => handleStatusChange(lead.id, opt.value)}
            className="text-sm"
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => handleDelete(lead.id, lead.contact?.full_name || "Lead")}
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        >
          <Trash2 size={14} className="mr-2" />
          Hapus
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

      {/* PAGINATION */}
      {data.totalPages > 1 && !loading && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan {data.data.length} dari {data.count} data
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  className={cn(filters.page === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setFilters((prev) => ({ ...prev, page: pageNum }))}
                      isActive={filters.page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {data.totalPages > 5 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.min(data.totalPages, prev.page + 1) }))
                  }
                  className={cn(filters.page === data.totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}