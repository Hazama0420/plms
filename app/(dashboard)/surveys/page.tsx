// app/(dashboard)/surveys/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  User,
  Clock,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
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

// Data dummy
const surveys = [
  {
    id: "1",
    property: "Villa Green Valley",
    address: "Puncak, Bogor",
    date: "2026-07-20",
    time: "09:00",
    surveyor: "Budi Santoso",
    status: "scheduled",
    type: "Lapangan",
  },
  {
    id: "2",
    property: "Ruko Sentra Bisnis",
    address: "Jakarta Selatan",
    date: "2026-07-22",
    time: "14:00",
    surveyor: "Siti Rahayu",
    status: "completed",
    type: "Virtual",
  },
  {
    id: "3",
    property: "Apartemen Harmoni",
    address: "BSD, Tangerang",
    date: "2026-07-25",
    time: "10:30",
    surveyor: "Agus Wijaya",
    status: "pending",
    type: "Lapangan",
  },
  {
    id: "4",
    property: "Rumah Komplek Menteri",
    address: "Patra Kuningan",
    date: "2026-07-18",
    time: "13:00",
    surveyor: "Mardian Gilang",
    status: "cancelled",
    type: "Lapangan",
  },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Terjadwal", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  completed: { label: "Selesai", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  pending: { label: "Menunggu", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  cancelled: { label: "Dibatalkan", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
};

export default function SurveysPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredSurveys = surveys.filter(
    (s) =>
      s.property.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Tambahkan fungsi handleDelete
  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus jadwal survei ini?")) {
      // TODO: implementasi delete ke database
      toast.success("Jadwal survei berhasil dihapus");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            📋 Jadwal Survei
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola jadwal survei properti Anda
          </p>
        </div>
        <Button
          onClick={() => router.push("/surveys/create")}
          className="bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500 text-white shadow-md shadow-emerald-600/30"
        >
          <Plus size={18} className="mr-2" />
          Buat Jadwal Survei
        </Button>
      </div>

      {/* FILTER */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari properti atau lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead>Properti</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Tanggal & Waktu</TableHead>
                <TableHead>Surveyor</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSurveys.map((survey) => {
                const status = statusConfig[survey.status] || statusConfig.pending;
                return (
                  <TableRow
                    key={survey.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => router.push(`/surveys/${survey.id}`)}
                  >
                    <TableCell className="font-medium">{survey.property}</TableCell>
                    <TableCell className="text-sm text-slate-500">{survey.address}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{survey.date}</span>
                        <Clock className="h-3.5 w-3.5 text-slate-400 ml-2" />
                        <span>{survey.time}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 text-xs font-semibold">
                          {survey.surveyor.charAt(0)}
                        </div>
                        <span className="text-sm">{survey.surveyor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {survey.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs border-0", status.bg, status.color)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                          onClick={() => router.push(`/surveys/${survey.id}`)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-amber-600"
                          onClick={() => router.push(`/surveys/${survey.id}/edit`)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                            <MoreHorizontal size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                            <DropdownMenuItem
                              onClick={() => router.push(`/surveys/${survey.id}/edit`)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(survey.id)}
                              className="text-rose-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredSurveys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Tidak ada jadwal survei ditemukan
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