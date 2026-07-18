// components/create-property/steps/StepCategory.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Upload,
  X,
  Star,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// ============================================================
// DATA STATIS
// ============================================================
const propertyTypes = [
  { value: "rumah", label: "🏠 Rumah" },
  { value: "apartemen", label: "🏢 Apartemen" },
  { value: "tanah", label: "🌿 Tanah" },
  { value: "ruko", label: "🏪 Ruko" },
  { value: "kost", label: "🛏️ Kost" },
  { value: "villa", label: "🏖️ Villa" },
  { value: "hotel", label: "🏨 Hotel" },
  { value: "pabrik", label: "🏭 Pabrik" },
  { value: "gudang", label: "📦 Gudang" },
  { value: "perkantoran", label: "🏢 Perkantoran" },
  { value: "ruang_usaha", label: "🏪 Ruang Usaha" },
];

const listingTypes = [
  { value: "jual", label: "💰 Jual" },
  { value: "sewa", label: "📋 Sewa" },
];

const statusOptions = [
  { value: "baru", label: "Baru" },
  { value: "second", label: "Second" },
  { value: "aset_bank", label: "Aset Bank" },
];

// ============================================================
// INTERFACE
// ============================================================
interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  isCover: boolean;
  uploadProgress: number;
  uploaded: boolean;
  error?: string;
}

interface StepCategoryProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
}

// ============================================================
// COMPONENT
// ============================================================
export function StepCategory({ formData, updateFormData, nextStep }: StepCategoryProps) {
  // ===== AI PARSE =====
  const [parseText, setParseText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ===== CO-BROKE & YOUTUBE =====
  const [showCoBrok, setShowCoBrok] = useState(formData.co_broke || false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // ===== PHOTOS =====
  const [photos, setPhotos] = useState<PhotoFile[]>(formData.photos || []);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // AI PARSE HANDLER
  // ============================================================
  const handleAIParse = async () => {
    if (!parseText.trim()) {
      toast.warning("Silakan tempelkan teks listing terlebih dahulu.");
      return;
    }

    setAiLoading(true);

    try {
      const fieldNames = [
        "title",
        "property_type",
        "listing_type",
        "property_category",
        "selling_point",
        "address",
        "selling_price",
        "rental_price",
        "rental_period",
        "bedroom",
        "bathroom",
        "garage",
        "carport",
        "floor",
        "electricity",
        "water_source",
        "certificate",
        "facing",
        "condition",
        "furnishing",
        "year_built",
        "land_area",
        "land_unit",
        "land_width",
        "land_length",
        "building_area",
        "building_width",
        "building_length",
        "owner_name",
        "owner_phone",
        "owner_whatsapp",
        "owner_email",
      ].join(", ");

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse",
          data: {
            text: parseText,
            currentType: formData.property_type || "belum ditentukan",
            fieldNames,
            areaList: "Daftar area tersedia (contoh: BSD, Serpong, Bintaro)",
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        const parsed = result.data;

        const mapping: Record<string, string> = {
          title: "title",
          property_type: "property_type",
          listing_type: "listing_type",
          property_category: "property_status",
          selling_point: "selling_point",
          address: "address",
          selling_price: "selling_price",
          rental_price: "rental_price",
          rental_period: "rental_period",
          bedroom: "bedroom",
          bathroom: "bathroom",
          garage: "garage",
          carport: "carport",
          floor: "floor",
          electricity: "electricity",
          water_source: "water_source",
          certificate: "certificate",
          facing: "facing",
          condition: "condition",
          furnishing: "furnishing",
          year_built: "year_built",
          land_area: "land_area",
          land_unit: "land_unit",
          land_width: "land_width",
          land_length: "land_length",
          building_area: "building_area",
          building_width: "building_width",
          building_length: "building_length",
        };

        const updates: any = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            const field = mapping[key];
            if (field) {
              updates[field] = value.toString();
            }
          }
        });

        updateFormData(updates);

        // Jika ada city, nanti bisa dicari city_id
        toast.success(`✅ Data berhasil diekstrak dengan AI (${result.provider || "AI"})!`);
      } else {
        toast.error(result.error || "Gagal parsing teks");
      }
    } catch (error: any) {
      console.error("AI parse error:", error);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setAiLoading(false);
    }
  };

  // ============================================================
  // HANDLERS KATEGORI
  // ============================================================
  const handlePropertyTypeSelect = (value: string) => {
    updateFormData({ property_type: value });
  };

  const handleListingTypeSelect = (value: string) => {
    updateFormData({ listing_type: value });
  };

  const handleStatusSelect = (value: string) => {
    updateFormData({ property_status: value });
  };

  const handleCoBrokChange = (checked: boolean) => {
    setShowCoBrok(checked);
    updateFormData({ co_broke: checked });
  };

  // ============================================================
  // HANDLERS FOTO (MANUAL)
  // ============================================================
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => file.type.startsWith("image/"));
      if (validFiles.length !== files.length) {
        toast.warning("Beberapa file bukan gambar dan akan diabaikan");
      }
      if (validFiles.length > 0) {
        const newPhotos = validFiles.map((file) => ({
          id: Math.random().toString(36).slice(2),
          file,
          preview: URL.createObjectURL(file),
          isCover: photos.length === 0,
          uploadProgress: 0,
          uploaded: false,
        }));
        const updated = [...photos, ...newPhotos];
        setPhotos(updated);
        updateFormData({ photos: updated });
      }
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => file.type.startsWith("image/"));
      if (validFiles.length > 0) {
        const newPhotos = validFiles.map((file) => ({
          id: Math.random().toString(36).slice(2),
          file,
          preview: URL.createObjectURL(file),
          isCover: photos.length === 0,
          uploadProgress: 0,
          uploaded: false,
        }));
        const updated = [...photos, ...newPhotos];
        setPhotos(updated);
        updateFormData({ photos: updated });
      }
    }
  };

  const removePhoto = (id: string) => {
    const filtered = photos.filter((p) => p.id !== id);
    if (filtered.length > 0 && !filtered.some((p) => p.isCover)) {
      filtered[0].isCover = true;
    }
    setPhotos(filtered);
    updateFormData({ photos: filtered });
  };

  const setCover = (id: string) => {
    const updated = photos.map((p) => ({ ...p, isCover: p.id === id }));
    setPhotos(updated);
    updateFormData({ photos: updated });
  };

  // ===== SIMULASI UPLOAD (nanti diintegrasikan dengan API) =====
  const handleUpload = async () => {
    setUploading(true);
    for (let i = 0; i < photos.length; i++) {
      if (photos[i].uploaded) continue;
      for (let progress = 0; progress <= 100; progress += 10) {
        setPhotos((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploadProgress: progress };
          return updated;
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      setPhotos((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], uploaded: true };
        return updated;
      });
    }
    setUploading(false);
    updateFormData({ photos_uploaded: true });
    toast.success(`${photos.length} foto berhasil diupload!`);
  };

  const totalUploaded = photos.filter((p) => p.uploaded).length;
  const uploadProgress = photos.length > 0 ? Math.round((totalUploaded / photos.length) * 100) : 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kategori & Foto</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pilih tipe properti, unggah foto, dan gunakan AI Parse untuk mengisi data otomatis
        </p>
      </div>

      {/* ===== AI PARSE ===== */}
      <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-200 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-blue-500" />
          <Label className="font-semibold text-blue-700 dark:text-blue-300">
            ✨ AI Parsing – Isi Otomatis dari Teks Listing
          </Label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tempelkan teks listing (dari email, website, atau dokumen) lalu klik tombol AI Parse untuk mengisi semua field secara otomatis.
        </p>
        <Textarea
          placeholder="Tempelkan teks listing di sini..."
          value={parseText}
          onChange={(e) => setParseText(e.target.value)}
          rows={3}
          className="border-blue-200 dark:border-blue-800 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-200"
        />
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleAIParse}
          disabled={aiLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
        >
          {aiLoading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Parsing...
            </>
          ) : (
            <>
              <Wand2 size={16} className="mr-2" />
              ✨ AI Parse
            </>
          )}
        </Button>
      </div>

      {/* ===== BAGIAN KATEGORI ===== */}
      <div className="space-y-6">
        {/* Tipe Properti */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tipe Properti
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {propertyTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handlePropertyTypeSelect(type.value)}
                className={cn(
                  "px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                  formData.property_type === type.value
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Jual / Sewa */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tipe Listing
          </Label>
          <div className="flex gap-3">
            {listingTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleListingTypeSelect(type.value)}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  formData.listing_type === type.value
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Properti */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Status Properti
            </Label>
            <span className="text-xs text-rose-500 font-medium">Wajib</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                onClick={() => handleStatusSelect(status.value)}
                className={cn(
                  "px-5 py-2 rounded-full border text-sm font-medium transition-all",
                  formData.property_status === status.value
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Co-Broke */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Bisa di Co-Broke
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Izinkan agen lain ikut menjual properti ini
              </p>
            </div>
            <Switch checked={showCoBrok} onCheckedChange={handleCoBrokChange} />
          </div>
          {showCoBrok && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-4 space-y-2 border border-blue-200/50 dark:border-blue-800/50">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Keuntungan Co-Broke</p>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Jangkau pasar lebih luas</li>
                <li>Properti lebih cepat terjual</li>
                <li>Komisi dibagi sesuai kesepakatan</li>
              </ul>
            </div>
          )}
        </div>

        {/* YouTube Video */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Video className="h-4 w-4 text-red-500" />
            Link Video YouTube
          </Label>
          <div className="flex gap-3">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFormData({ youtube_url: youtubeUrl })}
              disabled={!youtubeUrl}
            >
              Tambahkan
            </Button>
          </div>
          {formData.youtube_url && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              ✅ Video terpasang
            </div>
          )}
        </div>
      </div>

      {/* ===== BAGIAN FOTO ===== */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            📸 Foto Properti
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload minimal 3 foto untuk hasil terbaik
          </p>
        </div>

        {/* Drop Zone Manual */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer",
            isDragging
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-3">
              <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Klik atau drag & drop foto di sini
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              (max 10MB per foto, format JPG, PNG, WEBP)
            </p>
          </div>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {photos.length} foto
                </span>
                <Badge variant="secondary" className="text-xs">
                  {totalUploaded} diupload
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={uploading || photos.every((p) => p.uploaded)}
                className="gap-2"
              >
                {uploading ? "Mengupload..." : "Upload Semua"}
              </Button>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="h-2" />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square"
                >
                  <Image
                    src={photo.preview}
                    alt={`Foto ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {photo.isCover && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-blue-600 text-white border-0 gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Cover
                      </Badge>
                    </div>
                  )}
                  {!photo.uploaded && photo.uploadProgress > 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-white text-sm font-medium">{photo.uploadProgress}%</div>
                        <Progress value={photo.uploadProgress} className="h-1 w-20 mt-1 bg-white/20" indicatorClassName="bg-white" />
                      </div>
                    </div>
                  )}
                  {photo.uploaded && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500 bg-white/80 rounded-full" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      onClick={() => setCover(photo.id)}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition"
                      title="Jadikan Cover"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="p-1.5 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-white transition"
                      title="Hapus"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {photos.length >= 3 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Coba Listing Photo Makeover</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tingkatkan kualitas foto iklanmu dengan AI</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Coba Sekarang
                </Button>
              </div>
            )}

            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
              <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Tips:</strong> Gunakan foto dengan resolusi tinggi,
                  pastikan pencahayaan baik, dan tampilkan semua sudut properti.
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={nextStep}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Lanjut ke Spesifikasi →
        </Button>
      </div>
    </div>
  );
}