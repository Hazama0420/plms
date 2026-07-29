// app/(dashboard)/projects/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  CheckCircle2,
  Clock,
  HardHat,
  AlertTriangle,
  Package,
  Boxes,
  ShieldAlert,
  ArrowUpRight,
  Wrench,
  FolderPlus,
  TrendingUp,
  MapPin,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA & STATUS CONFIG
// ============================================================
interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: "planning" | "active" | "paused" | "completed" | "cancelled" | string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  spent: number | null;
  project_manager: string | null;
  team_count: number | null;
  created_at: string;
}

interface MaterialLog {
  id: string;
  project_id?: string;
  project_name: string;
  material_name: string;
  stock: number;
  unit: string;
  status: "normal" | "low" | "critical" | string;
  last_updated?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planning: {
    label: "Perencanaan",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
  },
  active: {
    label: "Aktif Running",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
  },
  paused: {
    label: "Ditunda",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
  },
  completed: {
    label: "Selesai",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 dark:bg-green-950/60 border-green-200 dark:border-green-800",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800",
  },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<MaterialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Stock Editor Dialog State
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialLog | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>("");

  // Form State
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

  // ===== FETCH PROJECTS FROM SUPABASE =====
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,project_manager.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setProjects((data as Project[]) || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error?.message || error);
      toast.error("Gagal memuat data proyek konstruksi");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // ===== FETCH MATERIALS FROM SUPABASE =====
  const fetchMaterials = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("project_materials")
        .select(`
          *,
          project:projects (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback jika nama tabel di DB adalah 'materials'
        const { data: altData } = await supabase
          .from("materials")
          .select("*")
          .order("created_at", { ascending: false });

        if (altData) {
          setMaterials(
            altData.map((m: any) => ({
              id: m.id,
              project_name: m.project_name || "Proyek Konstruksi",
              material_name: m.material_name || m.name || "Material",
              stock: m.stock || 0,
              unit: m.unit || "Unit",
              status: m.stock <= 5 ? "critical" : m.stock <= 15 ? "low" : "normal",
              last_updated: "Baru saja",
            }))
          );
          return;
        }
        setMaterials([]);
        return;
      }

      const mapped: MaterialLog[] = (data || []).map((m: any) => ({
        id: m.id,
        project_id: m.project_id,
        project_name: m.project?.name || m.project_name || "Proyek Umum",
        material_name: m.material_name || m.name || "Material",
        stock: m.stock || 0,
        unit: m.unit || "Unit",
        status: m.status || (m.stock <= 5 ? "critical" : m.stock <= 15 ? "low" : "normal"),
        last_updated: m.updated_at ? new Date(m.updated_at).toLocaleDateString("id-ID") : "Baru saja",
      }));

      setMaterials(mapped);
    } catch (error) {
      console.error("Error fetching materials:", error);
      setMaterials([]);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchMaterials();
  }, [fetchProjects, fetchMaterials]);

  // ===== CREATE PROJECT HANDLER =====
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama proyek wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userSession } = await supabase.auth.getUser();

      const { error } = await supabase.from("projects").insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        status: formData.status,
        progress: 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        spent: 0,
        project_manager: formData.project_manager.trim() || null,
        team_count: formData.team_count ? parseInt(formData.team_count) : null,
        created_by: userSession.user?.id || null,
      });

      if (error) throw error;

      toast.success("Proyek baru berhasil ditambahkan!");
      setIsCreateOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error(error.message || "Gagal membuat proyek baru");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== DELETE PROJECT HANDLER =====
  const handleDelete = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", selectedProject.id);
      if (error) throw error;

      toast.success("Proyek berhasil dihapus");
      setIsDeleteOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error(error.message || "Gagal menghapus proyek");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== QUICK MATERIAL STOCK UPDATE =====
  const handleUpdateStock = async () => {
    if (!selectedMaterial) return;
    const qty = parseInt(newStockValue);
    if (isNaN(qty) || qty < 0) {
      toast.error("Masukkan jumlah stok yang valid");
      return;
    }

    const newStatus = qty <= 5 ? "critical" : qty <= 15 ? "low" : "normal";

    // Optimistic UI Update
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === selectedMaterial.id) {
          return { ...m, stock: qty, status: newStatus, last_updated: "Baru saja" };
        }
        return m;
      })
    );

    try {
      await supabase
        .from("project_materials")
        .update({ stock: qty, status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedMaterial.id);

      toast.success(`Stok ${selectedMaterial.material_name} diperbarui: ${qty} ${selectedMaterial.unit}`);
    } catch (err) {
      // Ignore if table name differs
    } finally {
      setSelectedMaterial(null);
      setNewStockValue("");
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
    if (!value || value === 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Stats KPI Calculation
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const criticalMaterials = materials.filter((m) => m.status === "critical" || m.status === "low").length;

    return { total, active, totalBudget, criticalMaterials };
  }, [projects, materials]);

  const warningMaterials = materials.filter((m) => m.status === "critical" || m.status === "low");

  return (
    <div className="space-y-6 pb-16">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🏗️ Manajemen Proyek Konstruksi
          </h1>
          <p className="text-xs text-muted-foreground">
            Pemantauan fisik pembangunan unit, persentase progres, dan log inventaris material lapangan.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-xs gap-2 shrink-0 h-9"
        >
          <Plus className="h-4 w-4" /> Tambah Proyek Baru
        </Button>
      </div>

      {/* 2. BENTO KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-xs bg-card hover:border-emerald-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
            Total Proyek
          </span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
            {stats.total}
          </span>
        </Card>
        <Card className="p-3.5 border shadow-xs bg-card hover:border-emerald-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
            Proyek Aktif
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-0.5 block">
            {stats.active}
          </span>
        </Card>
        <Card className="p-3.5 border shadow-xs bg-card hover:border-blue-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
            Total Anggaran
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-blue-600 mt-0.5 block truncate">
            {formatCurrency(stats.totalBudget)}
          </span>
        </Card>
        <Card className="p-3.5 border shadow-xs bg-card hover:border-amber-500/30 transition">
          <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
            Material Kritis
          </span>
          <span className="text-xl font-bold font-mono text-amber-600 mt-0.5 block">
            {stats.criticalMaterials}
          </span>
        </Card>
      </div>

      {/* 3. SEARCH & STATUS TABS FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama proyek, lokasi, atau PM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProjects()}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
            <TabsList className="bg-muted p-1 h-9">
              <TabsTrigger value="all" className="text-xs px-2.5">
                Semua
              </TabsTrigger>
              <TabsTrigger value="planning" className="text-xs px-2.5">
                Perencanaan
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs px-2.5 text-emerald-600">
                Aktif
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-2.5">
                Selesai
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchProjects();
              fetchMaterials();
            }}
            className="h-9 w-9 shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4. MAIN PROJECT LIST SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <HardHat className="w-4 h-4 text-emerald-600" /> Daftar Proyek Pembangunan
          </h2>
          <span className="text-[11px] text-muted-foreground">
            💡 Klik 2x pada kartu proyek untuk melihat rincian detail
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* EMPTY STATE */
          <Card className="border shadow-xs">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <div className="p-4 bg-muted rounded-full mb-3">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground">Belum Ada Data Proyek Konstruksi</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Tidak ada proyek yang ditemukan berdasarkan pencarian Anda. Tambahkan proyek baru untuk memulai pemantauan progres.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
              >
                <Plus className="w-4 h-4" /> Buat Proyek Baru
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* PROJECT GRID */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const st = statusConfig[proj.status] || statusConfig.planning;

              return (
                <Card
                  key={proj.id}
                  onDoubleClick={() => router.push(`/projects/${proj.id}`)}
                  className="border shadow-xs hover:border-emerald-500/40 transition flex flex-col justify-between cursor-pointer select-none group"
                  title="Klik 2x untuk membuka detail proyek"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 border", st.bg, st.color)}>
                        {st.label}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => router.push(`/projects/${proj.id}`)}>
                            <Eye className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Detail Proyek
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(proj);
                              setIsDeleteOpen(true);
                            }}
                            className="text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Proyek
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CardTitle className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {proj.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                      {proj.location || "Lokasi belum dicantumkan"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Visual Progress Bar */}
                    <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border/50">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] text-muted-foreground font-medium">Progres Fisik</span>
                        <span className="text-base font-bold font-mono text-emerald-600">{proj.progress || 0}%</span>
                      </div>
                      <Progress value={proj.progress || 0} className="h-2 bg-muted" />
                    </div>

                    {/* Project Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t">
                      <div>
                        <span className="block text-[10px] font-semibold text-foreground">Project Manager:</span>
                        <span className="truncate block">{proj.project_manager || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-foreground">Total Budget:</span>
                        <span className="font-mono font-bold text-foreground">{formatCurrency(proj.budget)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. INVENTORY & MATERIAL LOGS SECTION */}
      <div className="pt-4">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" /> Log Kuantitas Material Bangunan
              </CardTitle>
              <CardDescription className="text-xs">
                Status stok material fisik di seluruh area lokasi konstruksi.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {materials.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Belum ada data log material proyek yang tersimpan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Nama Material</TableHead>
                      <TableHead className="text-xs font-semibold">Proyek Terkait</TableHead>
                      <TableHead className="text-xs font-semibold">Sisa Stok</TableHead>
                      <TableHead className="text-xs font-semibold">Status Stok</TableHead>
                      <TableHead className="text-xs font-semibold">Terakhir Update</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Kelola</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((mat) => (
                      <TableRow key={mat.id} className="hover:bg-muted/30">
                        <TableCell className="p-3 text-xs font-bold text-foreground">
                          {mat.material_name}
                        </TableCell>
                        <TableCell className="p-3 text-xs text-muted-foreground">
                          {mat.project_name}
                        </TableCell>
                        <TableCell className="p-3 text-xs font-mono font-bold">
                          {mat.stock} {mat.unit}
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0.5 border font-semibold",
                              mat.status === "critical"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 border-rose-200"
                                : mat.status === "low"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 border-amber-200"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 border-emerald-200"
                            )}
                          >
                            {mat.status === "critical" ? "⚠️ Kritis" : mat.status === "low" ? "⚡ Menipis" : "✅ Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3 text-xs text-muted-foreground font-mono">
                          {mat.last_updated}
                        </TableCell>
                        <TableCell className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMaterial(mat);
                              setNewStockValue(mat.stock.toString());
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            <Wrench className="w-3 h-3 text-amber-600" /> Stok
                          </Button>
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

      {/* MODAL 1: QUICK STOCK EDITOR */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" /> Update Stok Material
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah jumlah stok lapangan saat ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/60 rounded-xl space-y-1">
              <p className="font-bold text-foreground">{selectedMaterial?.material_name}</p>
              <p className="text-muted-foreground">{selectedMaterial?.project_name}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Jumlah Stok Baru ({selectedMaterial?.unit}):</Label>
              <Input
                type="number"
                value={newStockValue}
                onChange={(e) => setNewStockValue(e.target.value)}
                placeholder="Masukkan kuantitas"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedMaterial(null)} className="text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleUpdateStock} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Stok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CREATE PROJECT DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-600" /> Tambah Proyek Konstruksi Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan informasi dasar proyek pembangunan baru.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <Label className="font-bold">Nama Proyek <span className="text-rose-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Cluster Green BSD Phase 2"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="font-bold">Deskripsi Singkat</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Penjelasan cakupan pekerjaan proyek..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Lokasi Proyek</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Kota / Alamat lokasi"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Status Awal</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val || "planning" })}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning" className="text-xs">Perencanaan</SelectItem>
                  <SelectItem value="active" className="text-xs">Aktif Running</SelectItem>
                  <SelectItem value="paused" className="text-xs">Ditunda</SelectItem>
                  <SelectItem value="completed" className="text-xs">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Budget Anggaran (Rp)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Project Manager</Label>
              <Input
                value={formData.project_manager}
                onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                placeholder="Nama PM penanggung jawab"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={submitting || !formData.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {submitting ? "Menyimpan..." : "Simpan Proyek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              ⚠️ Hapus Proyek Konstruksi?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus proyek <span className="font-bold text-foreground">"{selectedProject?.name}"</span>? Tindakan ini bersifat permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={submitting}
              className="text-xs"
            >
              {submitting ? "Menghapus..." : "Hapus Proyek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}