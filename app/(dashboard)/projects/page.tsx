// app/(dashboard)/projects/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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
  HardHat,
  AlertTriangle,
  Package,
  Boxes,
  ShieldAlert,
  ArrowUpRight,
  Wrench,
  CheckCircle2,
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
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA & STATUS CONFIG
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
}

interface MaterialLog {
  id: string;
  project_name: string;
  material_name: string;
  stock: number;
  unit: string;
  status: "normal" | "low" | "critical";
  last_updated: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: "Perencanaan", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200" },
  active: { label: "Aktif", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200" },
  paused: { label: "Ditunda", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200" },
  completed: { label: "Selesai", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/60 border-green-200" },
  cancelled: { label: "Dibatalkan", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200" },
};

const initialMaterialSample: MaterialLog[] = [
  { id: "mat-1", project_name: "Cluster Green BSD", material_name: "Semen Portland Tiga Roda", stock: 12, unit: "Sak", status: "critical", last_updated: "2 Jam lalu" },
  { id: "mat-2", project_name: "Ruko Sentra Fatmawati", material_name: "Besi Ulir 12mm", stock: 8, unit: "Batang", status: "low", last_updated: "5 Jam lalu" },
  { id: "mat-3", project_name: "Villa Green Valley", material_name: "Bata Ringan Hebel 7.5cm", stock: 140, unit: "Kubik", status: "normal", last_updated: "1 Hari lalu" },
  { id: "mat-4", project_name: "Cluster Green BSD", material_name: "Pasir Pasang Bangka", stock: 4, unit: "Truk", status: "critical", last_updated: "30 Menit lalu" },
  { id: "mat-5", project_name: "Apartemen Harmoni Tower", material_name: "Cat Tembok Nippon Paint", stock: 18, unit: "Pail", status: "low", last_updated: "3 Jam lalu" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<MaterialLog[]>(initialMaterialSample);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Stock Editor Dialog State (PRD 4.B Mobile Workflow)
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

  const fetchProjects = useCallback(async () => {
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
      if (error || !data || data.length === 0) {
        // Fallback sample projects jika database masih kosong
        setProjects([
          {
            id: "prj-1",
            name: "Cluster Green BSD City",
            description: "Pembangunan 12 unit rumah tipe 70/90 konsep minimalis.",
            location: "BSD City, Tangerang Selatan",
            status: "active",
            progress: 68,
            start_date: "2026-01-10",
            end_date: "2026-11-30",
            budget: 4500000000,
            spent: 2950000000,
            project_manager: "Ir. Ahmad Hidayat",
            team_count: 24,
            created_at: new Date().toISOString(),
          },
          {
            id: "prj-2",
            name: "Ruko Sentra Fatmawati 3 Lantai",
            description: "Pekerjaan konstruksi struktur baja ruko komersial.",
            location: "Fatmawati, Jakarta Selatan",
            status: "active",
            progress: 42,
            start_date: "2026-02-01",
            end_date: "2026-08-15",
            budget: 1800000000,
            spent: 820000000,
            project_manager: "Budi Santoso, ST",
            team_count: 14,
            created_at: new Date().toISOString(),
          },
          {
            id: "prj-3",
            name: "Villa Luxury Green Valley",
            description: "Perencanaan dan fondasi villa kayu jati puncak.",
            location: "Cisarua, Bogor",
            status: "planning",
            progress: 15,
            start_date: "2026-04-01",
            end_date: "2026-12-20",
            budget: 2200000000,
            spent: 310000000,
            project_manager: "Deni Irawan",
            team_count: 8,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setProjects(data as Project[]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Gagal memuat data proyek");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Create Project Handler
  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("projects").insert({
        name: formData.name,
        description: formData.description || null,
        location: formData.location || null,
        status: formData.status,
        progress: 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        project_manager: formData.project_manager || null,
        team_count: formData.team_count ? parseInt(formData.team_count) : null,
        created_by: user.user?.id || "admin-fallback",
      });

      if (error) throw error;

      toast.success("Proyek baru berhasil dibuat");
      setIsCreateOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat proyek baru");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Project Handler
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
      toast.error(error.message || "Gagal menghapus proyek");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Material Stock Update (PRD 4.B)
  const handleUpdateStock = () => {
    if (!selectedMaterial) return;
    const qty = parseInt(newStockValue);
    if (isNaN(qty) || qty < 0) {
      toast.error("Masukkan jumlah stok yang valid");
      return;
    }

    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === selectedMaterial.id) {
          const newStatus = qty <= 5 ? "critical" : qty <= 15 ? "low" : "normal";
          return { ...m, stock: qty, status: newStatus, last_updated: "Baru saja" };
        }
        return m;
      })
    );

    toast.success(`Stok ${selectedMaterial.material_name} berhasil diperbarui: ${qty} ${selectedMaterial.unit}`);
    setSelectedMaterial(null);
    setNewStockValue("");
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
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter Material Kritis / Menipis untuk Mobile Warning Section (PRD 4.B)
  const warningMaterials = materials.filter((m) => m.status === "critical" || m.status === "low");

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🏗️ Proyek Konstruksi & Material
          </h1>
          <p className="text-sm text-muted-foreground">
            Pemantauan fisik pembangunan unit, persentase progres, dan log persediaan material.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Tambah Proyek Baru
        </Button>
      </div>

      {/* 2. SEARCH & STATUS FILTER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama proyek atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProjects()}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val || "all")}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="planning">Perencanaan</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="paused">Ditunda</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchProjects} className="h-9 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE VIEW (PRD 4.B block md:hidden)                     */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-5">
        
        {/* A. WARNING MATERIAL SECTION (Khusus Menipis & Kritis) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Peringatan Material Kritis ({warningMaterials.length})
            </h3>
          </div>

          <div className="space-y-2">
            {warningMaterials.map((mat) => (
              <Card
                key={mat.id}
                className={cn(
                  "border shadow-sm p-3 flex items-center justify-between",
                  mat.status === "critical"
                    ? "bg-rose-500/10 border-rose-500/30"
                    : "bg-amber-500/10 border-amber-500/30"
                )}
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-xs text-foreground">{mat.material_name}</p>
                  <p className="text-[10px] text-muted-foreground">{mat.project_name}</p>
                  <p className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                    Sisa Stok: {mat.stock} {mat.unit}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedMaterial(mat);
                    setNewStockValue(mat.stock.toString());
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 gap-1 shadow-sm shrink-0"
                >
                  <Wrench className="w-3 h-3" /> Kelola
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* B. COMPACT PROGRESS CARDS (PRD 4.B Mobile Card) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            📋 Proyek Konstruksi
          </h3>

          {projects.map((proj) => {
            const st = statusConfig[proj.status] || statusConfig.planning;
            return (
              <Card key={proj.id} className="border shadow-sm p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border mb-1", st.bg, st.color)}>
                      {st.label}
                    </Badge>
                    <h4 className="font-bold text-xs text-foreground line-clamp-1">{proj.name}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{proj.location || "-"}</p>
                  </div>
                  <span className="text-base font-bold font-mono text-emerald-600 shrink-0">
                    {proj.progress || 0}%
                  </span>
                </div>

                {/* Progress Bar Visual */}
                <div className="space-y-1">
                  <Progress value={proj.progress || 0} className="h-2 bg-muted" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Anggaran: {formatCurrency(proj.budget)}</span>
                    <span>PM: {proj.project_manager || "-"}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 💻 DESKTOP VIEW (PRD 4.A hidden md:block)                    */}
      {/* ============================================================ */}
      <div className="hidden md:block space-y-6">
        
        {/* A. CONSTRUCTION GRID WITH LARGE VISUAL PROGRESS */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-emerald-600" /> Proyek Konstruksi Aktif
          </h2>

          <div className="grid grid-cols-3 gap-4">
            {projects.map((proj) => {
              const st = statusConfig[proj.status] || statusConfig.planning;

              return (
                <Card key={proj.id} className="border shadow-sm hover:border-emerald-500/40 transition flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={cn("text-[10px] font-semibold border", st.bg, st.color)}>
                        {st.label}
                      </Badge>
                     <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
    <MoreHorizontal className="w-3.5 h-3.5" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => router.push(`/projects/${proj.id}`)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Detail Proyek
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
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

                    <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                      {proj.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {proj.location || "Lokasi tidak tercantum"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Big Progress Indicator */}
                    <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border/50">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground font-medium">Progres Fisik</span>
                        <span className="text-lg font-bold font-mono text-emerald-600">{proj.progress || 0}%</span>
                      </div>
                      <Progress value={proj.progress || 0} className="h-2.5 bg-muted" />
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
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
        </div>

        {/* B. INVENTORY LOGS TABLE (PRD 4.A Table) */}
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" /> Log Kuantitas Material Bangunan
              </CardTitle>
              <CardDescription className="text-xs">
                Status stok material fisik di seluruh area konstruksi proyek.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Nama Material</TableHead>
                  <TableHead className="text-xs font-semibold">Proyek</TableHead>
                  <TableHead className="text-xs font-semibold">Sisa Stok</TableHead>
                  <TableHead className="text-xs font-semibold">Status Stok</TableHead>
                  <TableHead className="text-xs font-semibold">Terakhir Update</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
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
                        <Wrench className="w-3 h-3 text-amber-600" /> Kelola Stok
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 🛠️ QUICK STOCK EDITOR DIALOG (PRD 4.B Workflow Mobile)       */}
      {/* ============================================================ */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" /> Kelola Stok Material
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah jumlah stok atau lakukan reorder cepat tanpa menu kompleks.
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

      {/* ============================================================ */}
      {/* ➕ CREATE PROJECT DIALOG                                     */}
      {/* ============================================================ */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">➕ Tambah Proyek Konstruksi</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan rincian proyek pembangunan fisik baru.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2">
              <Label>Nama Proyek *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Cluster Green BSD Phase 2"
                className="h-9 text-xs"
              />
            </div>
            <div className="col-span-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi proyek..."
                rows={2}
                className="text-xs"
              />
            </div>
            <div>
              <Label>Lokasi</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Alamat lokasi"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label>Status Initial</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val || "planning" })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Perencanaan</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="paused">Ditunda</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget (Rp)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label>Project Manager</Label>
              <Input
                value={formData.project_manager}
                onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                placeholder="Nama PM"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
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

      {/* ============================================================ */}
      {/* ⚠️ DELETE DIALOG                                             */}
      {/* ============================================================ */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">⚠️ Hapus Proyek?</DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus proyek "{selectedProject?.name}"? Tindakan ini permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
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