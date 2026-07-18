"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Building2,
  Calendar,
  Users,
  DollarSign,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================
// TIPE DATA
// ============================================================
interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: "planning" | "active" | "paused" | "completed" | "cancelled";
  progress: number;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  spent: number | null;
  project_manager: string | null;
  team_count: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  planning: {
    label: "Perencanaan",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  active: {
    label: "Aktif",
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  paused: {
    label: "Ditunda",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  completed: {
    label: "Selesai",
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/30",
  },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    status: "planning",
    start_date: "",
    end_date: "",
    budget: "",
    project_manager: "",
    team_count: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Gagal memuat data proyek");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      const { error } = await supabase.from("projects").insert({
        name: formData.name,
        description: formData.description || null,
        location: formData.location || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        project_manager: formData.project_manager || null,
        team_count: formData.team_count ? parseInt(formData.team_count) : null,
        created_by: user.user.id,
      });

      if (error) throw error;

      toast.success("Proyek berhasil dibuat");
      setIsCreateOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat proyek");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", selectedProject.id);

      if (error) throw error;

      toast.success("Proyek berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus proyek");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      location: "",
      status: "planning",
      start_date: "",
      end_date: "",
      budget: "",
      project_manager: "",
      team_count: "",
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            🏗️ Proyek Konstruksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola semua proyek konstruksi Anda
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Proyek
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari proyek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProjects()}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val || "all");
            setTimeout(fetchProjects, 100);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="planning">Perencanaan</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="paused">Ditunda</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchProjects}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: projects.length, color: "blue" },
          {
            label: "Aktif",
            value: projects.filter((p) => p.status === "active").length,
            color: "emerald",
          },
          {
            label: "Perencanaan",
            value: projects.filter((p) => p.status === "planning").length,
            color: "amber",
          },
          {
            label: "Selesai",
            value: projects.filter((p) => p.status === "completed").length,
            color: "green",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TABLE */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Building2 className="h-12 w-12" />
              <p className="text-lg font-medium">Belum ada proyek</p>
              <p className="text-sm">Klik "Tambah Proyek" untuk mulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead>Nama Proyek</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const status = statusConfig[project.status] || statusConfig.planning;
                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {project.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">
                              {project.description || "Tidak ada deskripsi"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {project.location || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.bg + " " + status.color + " border-0"}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress || 0} className="h-2 w-20" />
                            <span className="text-sm font-medium">{project.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(project.budget)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(project.end_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors">
    <MoreHorizontal className="h-4 w-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44 dark:bg-slate-800 dark:border-slate-700">
                              <DropdownMenuItem
                                onClick={() => router.push(`/projects/${project.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" /> Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/projects/${project.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedProject(project);
                                  setIsDeleteOpen(true);
                                }}
                                className="text-rose-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>➕ Tambah Proyek Baru</DialogTitle>
            <DialogDescription>
              Masukkan informasi proyek konstruksi Anda
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Nama Proyek *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama proyek"
              />
            </div>
            <div className="col-span-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi proyek"
                rows={3}
              />
            </div>
            <div>
              <Label>Lokasi</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Alamat proyek"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val || "planning" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Perencanaan</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="paused">Ditunda</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Tanggal Selesai</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Budget (Rp)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Project Manager</Label>
              <Input
                value={formData.project_manager}
                onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                placeholder="Nama PM"
              />
            </div>
            <div>
              <Label>Jumlah Tim</Label>
              <Input
                type="number"
                value={formData.team_count}
                onChange={(e) => setFormData({ ...formData, team_count: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !formData.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Hapus Proyek?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus proyek "{selectedProject?.name}"?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}