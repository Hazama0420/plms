// app/(dashboard)/crm/followups/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Calendar, User, Clock, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
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
// TIPE DATA — DISESUAIKAN DENGAN SKEMA
// ============================================================
interface FollowUp {
  id: string;
  lead_id: string;
  notes: string | null;
  followup_date: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    name: string;        // ✅ kolom di crm_leads adalah "name", bukan "full_name"
    email: string;
    phone: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  completed: { label: "Selesai", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Dibatalkan", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
};

export default function FollowupsPage() {
  const router = useRouter();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from("crm_followups")
      .select(`
        *,
        lead:crm_leads(*),
        assigned_user:users!fk_crm_followups_assigned_to(id, full_name, email)
      `)
      .order("followup_date", { ascending: true });

    if (error) throw error;

    const mapped = (data || []).map((item: any) => {
      // Cari field nama yang tersedia di crm_leads
      const leadData = item.lead || {};
      const leadName = leadData.full_name || leadData.name || leadData.lead_name || leadData.contact_name || "Unknown";

      return {
        ...item,
        lead: item.lead ? {
          id: leadData.id,
          full_name: leadName,
          email: leadData.email || "",
          phone: leadData.phone || "",
        } : undefined,
        assigned_user: item.assigned_user || undefined,
      };
    });

    setFollowups(mapped);
  } catch (error: any) {
    console.error("Error fetching followups:", error?.message || error);
    toast.error(error?.message || "Gagal memuat data follow-up");
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus follow-up ini?")) return;
    try {
      const { error } = await supabase.from("crm_followups").delete().eq("id", id);
      if (error) throw error;
      toast.success("Follow-up berhasil dihapus");
      fetchFollowups();
    } catch (error: any) {
      console.error("Error deleting followup:", error?.message || error);
      toast.error(error?.message || "Gagal menghapus follow-up");
    }
  };

  const filtered = followups.filter((f) =>
    f.notes?.toLowerCase().includes(search.toLowerCase()) ||
    f.lead?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            📅 Follow-up
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola jadwal follow-up dengan leads
          </p>
        </div>
        <Button
          onClick={() => router.push("/crm/followups/create")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Follow-up
        </Button>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari catatan atau lead..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* TABLE */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <Calendar className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">Belum ada follow-up</p>
              <p className="text-sm">Klik "Tambah Follow-up" untuk mulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ditugaskan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((followup) => (
                    <TableRow key={followup.id}>
                      <TableCell className="font-medium">
                        {followup.lead?.name || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-500">
                        {followup.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {followup.followup_date
                          ? format(new Date(followup.followup_date), "dd MMM yyyy HH:mm", { locale: id })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs border-0",
                            statusConfig[followup.status]?.color || "bg-slate-100"
                          )}
                        >
                          {statusConfig[followup.status]?.label || followup.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {followup.assigned_user?.full_name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => router.push(`/crm/followups/${followup.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-amber-600"
                            onClick={() => router.push(`/crm/followups/${followup.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDelete(followup.id)}
                                className="text-rose-600 cursor-pointer"
                              >
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