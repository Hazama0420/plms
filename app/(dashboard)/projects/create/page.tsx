'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Material {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  status: 'safe' | 'warning' | 'critical';
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    progress: 0,
    description: '',
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    stock: 0,
    threshold: 20,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'progress' ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addMaterial = () => {
    if (!newMaterial.name.trim()) {
      toast.error('Nama material wajib diisi!');
      return;
    }
    if (newMaterial.stock < 0) {
      toast.error('Stok tidak boleh negatif!');
      return;
    }

    const status = newMaterial.stock < newMaterial.threshold * 0.5 ? 'critical' 
      : newMaterial.stock < newMaterial.threshold ? 'warning' 
      : 'safe';

    setMaterials((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        ...newMaterial,
        status,
      },
    ]);
    setNewMaterial({ name: '', stock: 0, threshold: 20 });
  };

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validasi
      if (!formData.name.trim()) {
        toast.error('Nama proyek wajib diisi!');
        setLoading(false);
        return;
      }
      if (materials.length === 0) {
        toast.error('Tambahkan minimal 1 material!');
        setLoading(false);
        return;
      }

      // Simulasi simpan ke database
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Proyek konstruksi berhasil dibuat!');
      router.push('/projects');
    } catch (error) {
      toast.error('Gagal membuat proyek');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Proyek Konstruksi</h1>
          <p className="text-sm text-muted-foreground">
            Buat proyek konstruksi baru dan kelola material bangunan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Proyek */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Proyek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Proyek *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Masukkan nama proyek"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleSelectChange('status', val || "")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="planning">Perencanaan</SelectItem>
                    <SelectItem value="paused">Ditunda</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="progress">Progres (%)</Label>
                <Input
                  id="progress"
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.progress}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Deskripsi proyek"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Material Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Material Bangunan</span>
              <Badge variant="outline">{materials.length} material</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form Tambah Material */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="materialName">Nama Material</Label>
                <Input
                  id="materialName"
                  placeholder="Contoh: Baja"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="materialStock">Stok (%)</Label>
                <Input
                  id="materialStock"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={newMaterial.stock}
                  onChange={(e) => setNewMaterial({ ...newMaterial, stock: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="materialThreshold">Batas Minimum (%)</Label>
                <Input
                  id="materialThreshold"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="20"
                  value={newMaterial.threshold}
                  onChange={(e) => setNewMaterial({ ...newMaterial, threshold: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMaterial}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Material
            </Button>

            {/* Daftar Material */}
            {materials.length > 0 && (
              <div className="space-y-2 mt-4 border-t pt-4">
                <p className="text-sm font-medium">Daftar Material</p>
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground ml-2">
                        Stok: {m.stock}% | Batas: {m.threshold}%
                      </span>
                      <Badge
                        variant={m.status === 'critical' ? 'destructive' : m.status === 'warning' ? 'outline' : 'default'}
                        className="ml-2 text-xs"
                      >
                        {m.status === 'critical' ? 'Kritis' : m.status === 'warning' ? 'Menipis' : 'Aman'}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMaterial(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Buat Proyek'}
          </Button>
        </div>
      </form>
    </div>
  );
}