// app/(dashboard)/projects/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, HardHat, Calendar, MapPin, DollarSign, UserCheck, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface MaterialInputItem {
  id: string;
  material_name: string;
  stock: number;
  unit: string;
  threshold: number;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State Konstruksi Proyek
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    status: 'planning',
    progress: 0,
    start_date: '',
    end_date: '',
    budget: '',
    project_manager: '',
    team_count: '',
  });

  // Material Management State
  const [materials, setMaterials] = useState<MaterialInputItem[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    material_name: '',
    stock: 0,
    unit: 'Sak',
    threshold: 20,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'progress' || name === 'team_count' ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Tambah Material ke State Lokal
  const addMaterial = () => {
    if (!newMaterial.material_name.trim()) {
      toast.error('Nama material wajib diisi!');
      return;
    }
    if (newMaterial.stock < 0) {
      toast.error('Jumlah stok tidak boleh negatif!');
      return;
    }

    setMaterials((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ...newMaterial,
      },
    ]);
    setNewMaterial({ material_name: '', stock: 0, unit: 'Sak', threshold: 20 });
  };

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Submit Handler ke Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama proyek konstruksi wajib diisi!');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert ke tabel 'projects'
      const { data: createdProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          status: formData.status,
          progress: Number(formData.progress) || 0,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          spent: 0,
          project_manager: formData.project_manager.trim() || null,
          team_count: formData.team_count ? parseInt(formData.team_count) : null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const projectId = createdProject?.id;

      // 2. Jika ada material, insert ke tabel 'project_materials'
      if (materials.length > 0 && projectId) {
        const materialPayloads = materials.map((m) => {
          const status = m.stock <= m.threshold * 0.5 ? 'critical' : m.stock <= m.threshold ? 'low' : 'normal';
          return {
            project_id: projectId,
            project_name: formData.name.trim(),
            material_name: m.material_name,
            stock: m.stock,
            unit: m.unit,
            status: status,
          };
        });

        const { error: materialError } = await supabase
          .from('project_materials')
          .insert(materialPayloads);

        if (materialError) {
          console.error("Warning material insert error:", materialError);
        }
      }

      toast.success('Proyek konstruksi & logistik material berhasil dibuat!');
      router.push('/projects');
      router.refresh();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Gagal membuat proyek: ' + (error.message || 'Terjadi kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            🏗️ Tambah Proyek Konstruksi
          </h1>
          <p className="text-xs text-muted-foreground">
            Inisialisasi lokasi pembangunan fisik baru, anggaran, dan pengawasan material lapangan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Utama Proyek */}
        <Card className="border shadow-md">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <HardHat className="w-4 h-4 text-emerald-600" /> Informasi Utama Konstruksi
            </CardTitle>
            <CardDescription className="text-xs">
              Rincian fisik dan status perencanaan proyek properti.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold">Nama Proyek / Cluster *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Contoh: Cluster Green BSD Phase 2"
                value={formData.name}
                onChange={handleChange}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-bold">Status Pembangunan</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleSelectChange('status', val || "planning")}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning" className="text-xs">Perencanaan (Planning)</SelectItem>
                    <SelectItem value="active" className="text-xs">Aktif Running (Active)</SelectItem>
                    <SelectItem value="paused" className="text-xs">Ditunda (Paused)</SelectItem>
                    <SelectItem value="completed" className="text-xs">Selesai (Completed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="progress" className="text-xs font-bold">Progres Fisik Awal (%)</Label>
                <Input
                  id="progress"
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.progress}
                  onChange={handleChange}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Lokasi / Alamat Proyek
              </Label>
              <Input
                id="location"
                name="location"
                placeholder="Contoh: BSD City Sektor 1.2, Tangerang Selatan"
                value={formData.location}
                onChange={handleChange}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" /> Tanggal Mulai Proyek
                </Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date" className="text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Target Selesai (Deadline)
                </Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="budget" className="text-xs font-bold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Estimasi Anggaran (Rp)
                </Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  placeholder="Contoh: 4500000000"
                  value={formData.budget}
                  onChange={handleChange}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project_manager" className="text-xs font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-500" /> Project Manager
                </Label>
                <Input
                  id="project_manager"
                  name="project_manager"
                  placeholder="Nama Kepala Proyek / PM"
                  value={formData.project_manager}
                  onChange={handleChange}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team_count" className="text-xs font-bold">Jumlah Pekerja Lapangan</Label>
                <Input
                  id="team_count"
                  name="team_count"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.team_count}
                  onChange={handleChange}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold">Deskripsi & Spesifikasi Bangunan</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Rincian spesifikasi material struktur, tipe rumah, atau catatan khusus konstruksi..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="text-xs leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Manajemen Persediaan Material Lapangan */}
        <Card className="border shadow-md">
          <CardHeader className="bg-muted/40 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" /> Logistik Material Awal
                </CardTitle>
                <CardDescription className="text-xs">
                  Daftarkan stok bahan bangunan yang tersedia di gudang proyek.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">{materials.length} material</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {/* Form Input Material */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-xl border">
              <div className="sm:col-span-1.5 space-y-1">
                <Label className="text-[11px] font-bold">Nama Material</Label>
                <Input
                  placeholder="Semen / Besi / Bata"
                  value={newMaterial.material_name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_name: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Stok Awal</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newMaterial.stock}
                  onChange={(e) => setNewMaterial({ ...newMaterial, stock: Number(e.target.value) })}
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Satuan</Label>
                <Input
                  placeholder="Sak / Batang / Kubik"
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={addMaterial}
                  className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </div>
            </div>

            {/* List Material Ditambahkan */}
            {materials.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Daftar Material Terdaftar:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs bg-card border px-3 py-2.5 rounded-lg shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">{m.material_name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {m.stock} {m.unit}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => removeMaterial(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="text-xs h-9 px-5"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-6 shadow-md shadow-emerald-600/20"
          >
            {loading ? 'Menyimpan Proyek...' : 'Simpan & Publikasikan Proyek'}
          </Button>
        </div>
      </form>
    </div>
  );
}