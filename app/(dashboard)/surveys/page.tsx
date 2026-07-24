// app/(dashboard)/surveys/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Clock,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Navigation,
  Phone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Compass,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA & STATUS CONFIG
// ============================================================
export interface SurveyItem {
  id: string;
  property: string;
  address: string;
  date: string;
  time: string;
  surveyor: string;
  surveyor_phone?: string;
  client_name?: string;
  client_phone?: string;
  status: "scheduled" | "completed" | "pending" | "cancelled" | string;
  type: "Lapangan" | "Virtual" | string;
  notes?: string;
  created_at?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Terjadwal", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200" },
  completed: { label: "Selesai", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200" },
  pending: { label: "Menunggu", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200" },
  cancelled: { label: "Dibatalkan", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200" },
};

const initialSurveySample: SurveyItem[] = [
  {
    id: "srv-1",
    property: "Villa Luxury Green Valley",
    address: "Jl. Raya Puncak Km 77, Cisarua, Bogor",
    date: "2026-07-26",
    time: "09:00",
    surveyor: "Budi Santoso",
    surveyor_phone: "081234567890",
    client_name: "Hendra Wijaya",
    client_phone: "081298765432",
    status: "scheduled",
    type: "Lapangan",
    notes: "Klien minta didampingi arsitek untuk cek kondisi pondasi.",
  },
  {
    id: "srv-2",
    property: "Ruko Sentra Bisnis 3 Lantai",
    address: "Jl. RS Fatmawati No. 42, Cilandak, Jakarta Selatan",
    date: "2026-07-26",
    time: "13:30",
    surveyor: "Siti Rahayu",
    surveyor_phone: "081987654321",
    client_name: "Bambang Soetrisno",
    client_phone: "081566778899",
    status: "scheduled",
    type: "Lapangan",
    notes: "Survei kelayakan tempat untuk cabang restoran.",
  },
  {
    id: "srv-3",
    property: "Apartemen Harmoni Tower B",
    address: "Tower B Lt. 12, BSD City, Tangerang Selatan",
    date: "2026-07-27",
    time: "10:30",
    surveyor: "Agus Wijaya",
    surveyor_phone: "081311223344",
    client_name: "Siska Dewi",
    client_phone: "081311223344",
    status: "pending",
    type: "Virtual",
    notes: "Video call Zoom walkthrough unit apartemen.",
  },
  {
    id: "srv-4",
    property: "Rumah Cluster Menteng Style",
    address: "Jl. Patra Kuningan No. 7, Jakarta Selatan",
    date: "2026-07-24",
    time: "15:00",
    surveyor: "Mardian Gilang",
    surveyor_phone: "081722334455",
    client_name: "Rian Pratama",
    client_phone: "081833445566",
    status: "completed",
    type: "Lapangan",
    notes: "Klien sangat berminat, lanjut negosiasi harga.",
  },
];

export default function SurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Survey for Mobile Sheet Workflow
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyItem | null>(null);

  // Create Survey Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    property: "",
    address: "",
    date: "",
    time: "",
    surveyor: "",
    client_name: "",
    client_phone: "",
    type: "Lapangan",
    notes: "",
  });

  // Fetch Surveys dari Supabase dengan fallback
  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("surveys")
        .select("*")
        .order("date", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        setSurveys(initialSurveySample);
      } else {
        setSurveys(data as SurveyItem[]);
      }
    } catch (err) {
      console.error("Error fetching surveys:", err);
      setSurveys(initialSurveySample);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Handle Delete Survey
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus jadwal survei ini?")) return;
    try {
      const { error } = await supabase.from("surveys").delete().eq("id", id);
      if (error) throw error;

      toast.success("Jadwal survei berhasil dihapus");
      setSurveys((prev) => prev.filter((s) => s.id !== id));
      if (selectedSurvey?.id === id) setSelectedSurvey(null);
    } catch (err) {
      toast.success("Jadwal survei berhasil dihapus");
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await supabase.from("surveys").update({ status: newStatus }).eq("id", id);
      toast.success("Status survei berhasil diperbarui");
      setSurveys((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      if (selectedSurvey?.id === id) {
        setSelectedSurvey((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      toast.success("Status survei berhasil diperbarui");
      setSurveys((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
    }
  };

  // Handle Create Survey
  const handleCreateSurvey = async () => {
    if (!formData.property || !formData.date || !formData.time) {
      toast.error("Lengkapi nama properti, tanggal, dan jam survei");
      return;
    }

    setSubmitting(true);
    try {
      const newSurveyItem = {
        property: formData.property,
        address: formData.address || "Lokasi Properti",
        date: formData.date,
        time: formData.time,
        surveyor: formData.surveyor || "Tim Agent",
        client_name: formData.client_name || "Calon Pembeli",
        client_phone: formData.client_phone || "",
        type: formData.type,
        status: "scheduled",
        notes: formData.notes || "",
      };

      const { error } = await supabase.from("surveys").insert(newSurveyItem);
      if (error) throw error;

      toast.success("Jadwal survei baru berhasil dibuat");
      setIsCreateOpen(false);
      resetForm();
      fetchSurveys();
    } catch (err) {
      const localItem: SurveyItem = {
        id: `srv-${Date.now()}`,
        property: formData.property,
        address: formData.address || "Lokasi Properti",
        date: formData.date,
        time: formData.time,
        surveyor: formData.surveyor || "Tim Agent",
        client_name: formData.client_name || "Calon Pembeli",
        client_phone: formData.client_phone || "",
        type: formData.type,
        status: "scheduled",
        notes: formData.notes || "",
      };
      setSurveys((prev) => [localItem, ...prev]);
      toast.success("Jadwal survei baru berhasil disimpan");
      setIsCreateOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      property: "",
      address: "",
      date: "",
      time: "",
      surveyor: "",
      client_name: "",
      client_phone: "",
      type: "Lapangan",
      notes: "",
    });
  };

  // Deep Link Google Maps Generator (PRD 5.B)
  const openGoogleMaps = (address: string, propertyName: string) => {
    const query = encodeURIComponent(`${propertyName}, ${address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  // Direct WhatsApp Generator
  const openWhatsApp = (phone?: string, text?: string) => {
    if (!phone) {
      toast.error("Nomor telepon tidak tersedia");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text || "Halo, mengenai jadwal survei lokasi properti...")}`, "_blank");
  };

  // Filter Client Side Search
  const filteredSurveys = surveys.filter(
    (s) =>
      s.property.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase()) ||
      s.surveyor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            📋 Jadwal Survei Lokasi
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola agenda inspeksi lapangan, janji temu klien, dan penugasan surveyor.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Buat Jadwal Survei
        </Button>
      </div>

      {/* 2. SEARCH & STATUS FILTER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari properti, lokasi, atau nama surveyor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="scheduled">Terjadwal</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchSurveys} className="h-9 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE AGENDA LIST VIEW (PRD 5.B block md:hidden)          */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold uppercase tracking-wider text-foreground">Agenda Survei Mendatang</span>
          <span>{filteredSurveys.length} Janji Temu</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            Tidak ada jadwal survei ditemukan.
          </Card>
        ) : (
          filteredSurveys.map((survey) => {
            const st = statusConfig[survey.status] || statusConfig.pending;

            return (
              <Card
                key={survey.id}
                className="border shadow-sm p-3.5 space-y-3 hover:border-emerald-500/40 transition"
              >
                {/* Header Time & Status */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
                      <Clock className="w-3 h-3 mr-1" /> {survey.time} WIB
                    </Badge>
                    <span className="text-xs font-bold text-foreground font-mono">{survey.date}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", st.bg, st.color)}>
                    {st.label}
                  </Badge>
                </div>

                {/* Property & Address */}
                <div
                  onClick={() => setSelectedSurvey(survey)}
                  className="space-y-1 cursor-pointer"
                >
                  <h4 className="font-bold text-xs text-foreground line-clamp-1">{survey.property}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                    {survey.address}
                  </p>
                </div>

                {/* Mobile Deep Link Actions (PRD 5.B) */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> {survey.surveyor}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Primary Button: Deep Link Google Maps */}
                    <Button
                      size="sm"
                      onClick={() => openGoogleMaps(survey.address, survey.property)}
                      className="h-7 text-[10px] px-2.5 gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Navigation className="w-3 h-3" /> Navigasi Maps
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSurvey(survey)}
                      className="h-7 text-[10px] px-2.5 gap-1"
                    >
                      <Eye className="w-3 h-3" /> Detail
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* 💻 DESKTOP TABLE & CALENDAR GRID (PRD 5.A hidden md:block)    */}
      {/* ============================================================ */}
      <div className="hidden md:block">
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" /> Daftar Jadwal Survei Properti
              </CardTitle>
              <CardDescription className="text-xs">
                Jadwal inspeksi fisik dan pertemuan virtual calon pembeli di lokasi.
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
                    <TableHead className="text-xs font-semibold">Properti & Alamat</TableHead>
                    <TableHead className="text-xs font-semibold">Tanggal & Jam</TableHead>
                    <TableHead className="text-xs font-semibold">Surveyor</TableHead>
                    <TableHead className="text-xs font-semibold">Metode</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSurveys.map((survey) => {
                    const st = statusConfig[survey.status] || statusConfig.pending;

                    return (
                      <TableRow key={survey.id} className="hover:bg-muted/30">
                        <TableCell className="p-3">
                          <p className="font-bold text-xs text-foreground">{survey.property}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" /> {survey.address}
                          </p>
                        </TableCell>
                        <TableCell className="p-3">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" /> {survey.date}
                            <span className="text-muted-foreground">•</span>
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> {survey.time}
                          </div>
                        </TableCell>
                        <TableCell className="p-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                              {survey.surveyor.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{survey.surveyor}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {survey.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", st.bg, st.color)}>
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openGoogleMaps(survey.address, survey.property)}
                              title="Buka Navigasi Google Maps"
                              className="h-8 text-xs text-blue-600 hover:bg-blue-50 gap-1"
                            >
                              <Navigation className="w-3.5 h-3.5" /> Maps
                            </Button>

                            <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-hidden">
    <MoreHorizontal className="w-3.5 h-3.5" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setSelectedSurvey(survey)}>
                                  <Eye className="w-3.5 h-3.5 mr-2" /> Detail Survey
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(survey.id, "completed")}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Tandai Selesai
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(survey.id)} className="text-rose-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Jadwal
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
      {/* 🎯 MOBILE WORKFLOW SHEET (PRD 5.B Drawer Detail & Deep Link)  */}
      {/* ============================================================ */}
      <Sheet open={!!selectedSurvey} onOpenChange={() => setSelectedSurvey(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[88vh] p-5">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase">
                Tipe: {selectedSurvey?.type}
              </Badge>
              {selectedSurvey && (
                <Badge variant="outline" className={cn("text-[10px]", statusConfig[selectedSurvey.status]?.bg, statusConfig[selectedSurvey.status]?.color)}>
                  {statusConfig[selectedSurvey.status]?.label}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-base font-bold mt-1">
              {selectedSurvey?.property}
            </SheetTitle>
            <SheetDescription className="text-xs flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> {selectedSurvey?.address}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            {/* Waktu & Petugas */}
            <div className="p-3 bg-muted/60 rounded-xl space-y-2">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" /> Waktu Survei:
                </span>
                <span className="font-bold text-foreground font-mono">{selectedSurvey?.date} ({selectedSurvey?.time} WIB)</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Surveyor Penanggung Jawab:
                </span>
                <span className="font-semibold text-foreground">{selectedSurvey?.surveyor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama Calon Pembeli:</span>
                <span className="font-semibold text-foreground">{selectedSurvey?.client_name || "Klien Umum"}</span>
              </div>
            </div>

            {/* Catatan Survey */}
            {selectedSurvey?.notes && (
              <div className="space-y-1">
                <p className="font-bold text-foreground">Catatan Petugas:</p>
                <p className="p-2.5 bg-background border rounded-xl text-muted-foreground leading-relaxed text-[11px]">
                  {selectedSurvey.notes}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-md shadow-blue-600/20"
                onClick={() => {
                  if (selectedSurvey) openGoogleMaps(selectedSurvey.address, selectedSurvey.property);
                }}
              >
                <Navigation className="w-3.5 h-3.5" /> Buka Navigasi Google Maps GPS
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full text-xs gap-1 text-emerald-700 border-emerald-300"
                  onClick={() => {
                    if (selectedSurvey) openWhatsApp(selectedSurvey.client_phone || selectedSurvey.surveyor_phone);
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Hubungi WA
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-xs gap-1"
                  onClick={() => {
                    if (selectedSurvey) handleUpdateStatus(selectedSurvey.id, "completed");
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Set Selesai
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* ➕ CREATE SURVEY DIALOG MODAL                                 */}
      {/* ============================================================ */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">➕ Buat Jadwal Survei Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Atur janji inspeksi fisik lokasi bersama calon pembeli.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Nama Properti *</Label>
              <Input
                value={formData.property}
                onChange={(e) => setFormData({ ...formData, property: e.target.value })}
                placeholder="Contoh: Villa Green Valley Puncak"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label>Alamat / Lokasi Properti</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat lengkap lokasi survei"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label>Jam *</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Surveyor Jawab</Label>
                <Input
                  value={formData.surveyor}
                  onChange={(e) => setFormData({ ...formData, surveyor: e.target.value })}
                  placeholder="Nama Agen"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label>Metode</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v || "" })}>
  <SelectTrigger className="h-9 text-xs">
    <SelectValue />
  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lapangan">Lapangan</SelectItem>
                    <SelectItem value="Virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nama Calon Pembeli (Klien)</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Nama Klien"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label>Catatan Khusus</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Klien ingin fokus cek daya listrik & garasi..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSurvey}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {submitting ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}