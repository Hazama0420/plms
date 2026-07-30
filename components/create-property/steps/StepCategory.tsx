"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  Upload,
  X,
  Star,
  Sparkles,
  CheckCircle2,
  Wand2,
  Image as ImageIcon,
  Building2,
  ArrowRight,
  Database,
  GripVertical,
  Maximize2,
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompressor";
import { supabase } from "@/lib/supabase/client";

// DATA STATIS
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

interface PhotoItem {
  id: string;
  preview: string;
  public_url?: string;
  media_type?: string;
  file_name?: string;
  original_name?: string;
  storage_path?: string;
  mime_type?: string;
  file_size?: number;
  isCover?: boolean;
  uploaded?: boolean;
  isExisting?: boolean;
}

interface StepCategoryProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function StepCategory({ formData, updateFormData, nextStep }: StepCategoryProps) {
  const [parseText, setParseText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [showCoBrok, setShowCoBrok] = useState(formData.co_broke || false);
  const [youtubeUrl, setYoutubeUrl] = useState(formData.youtube_url || "");

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync Photos dari formData ke Local State saat inisialisasi/edit
 useEffect(() => {
  if (formData.photos && Array.isArray(formData.photos)) {
    const normalized = formData.photos.map((p: any, idx: number) => {
      if (typeof p === "string") {
        return {
          id: `existing-${idx}`,
          preview: p,
          public_url: p,
          media_type: "image",
          isCover: idx === 0,
          uploaded: true,
          isExisting: true,
        };
      }
      return {
        id: p.id || `photo-${idx}`,
        preview: p.public_url || p.preview || p.url || "",
        public_url: p.public_url || p.preview || p.url || "",
        media_type: p.media_type || "image",
        file_name: p.file_name,
        original_name: p.original_name,
        storage_path: p.storage_path,
        mime_type: p.mime_type,
        file_size: p.file_size,
        isCover: idx === 0,
        uploaded: true,
        isExisting: p.isExisting || false,
      };
    });
    setPhotos(normalized);
  }
}, [formData.photos]);

  // Update State Utama & Form Data
  const syncPhotosWithCover = (newPhotos: PhotoItem[]) => {
    const updated = newPhotos.map((p, idx) => ({
      ...p,
      isCover: idx === 0,
    }));
    setPhotos(updated);
    updateFormData({ photos: updated });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverItem = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...photos];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(targetIndex);
    syncPhotosWithCover(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Helper Upload File langsung ke Supabase Storage Bucket 'property-media'
  const uploadToStorage = async (file: File, originalName: string): Promise<PhotoItem | null> => {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const cleanOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const storagePath = `listings/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("property-media")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("Gagal upload foto ke Supabase Storage:", uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("property-media")
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    return {
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      preview: publicUrl,
      public_url: publicUrl,
      media_type: "image",
      file_name: fileName,
      original_name: cleanOriginalName,
      storage_path: uploadData.path,
      mime_type: file.type || "image/jpeg",
      file_size: file.size,
      uploaded: true,
      isExisting: false,
    };
  } catch (err) {
    console.error("Error uploadToStorage:", err);
    return null;
  }
};

  // Kompresi Gambar & Tambah File dengan Auto-Upload ke Storage
  const processAndAddFiles = async (files: File[]) => {
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    setIsCompressing(true);
    const loadingToast = toast.loading("Mengompresi & mengunggah foto ke storage...");

    try {
      const uploadedPhotos: PhotoItem[] = [];

      for (const file of validFiles) {
        // 1. Kompresi Gambar
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
        });

        // 2. Upload langsung ke Supabase Storage
        const uploadedItem = await uploadToStorage(compressedFile, file.name);
        if (uploadedItem) {
          uploadedPhotos.push(uploadedItem);
        }
      }

      if (uploadedPhotos.length > 0) {
        syncPhotosWithCover([...photos, ...uploadedPhotos]);
        toast.success(`${uploadedPhotos.length} foto berhasil diunggah & tersimpan!`, {
          id: loadingToast,
        });
      } else {
        toast.error("Gagal mengunggah foto ke storage Supabase.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Gagal memproses & mengunggah foto:", error);
      toast.error("Terjadi kesalahan saat memproses foto.", { id: loadingToast });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processAndAddFiles(files);
      e.target.value = "";
    }
  };

  const handleDropzoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropzoneActive(true);
  };

  const handleDropzoneDragLeave = () => {
    setIsDropzoneActive(false);
  };

  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropzoneActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      processAndAddFiles(files);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    syncPhotosWithCover(updated);
    if (previewIndex !== null) {
      setPreviewIndex(null);
    }
  };

  const applyCrop = async () => {
    if (previewIndex === null || !photos[previewIndex]) return;

    const currentPhoto = photos[previewIndex];
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = currentPhoto.preview;

    image.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const isRotated = cropRotation % 180 !== 0;
      const targetWidth = isRotated ? image.height : image.width;
      const targetHeight = isRotated ? image.width : image.height;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);

      ctx.drawImage(
        image,
        -image.width / 2,
        -image.height / 2,
        image.width,
        image.height
      );
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const rawCroppedFile = dataURLtoFile(croppedDataUrl, `cropped-${Date.now()}.jpg`);

      const compressedCropped = await compressImage(rawCroppedFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
      });

      const cropToast = toast.loading("Mengunggah foto hasil crop...");
      const uploadedCropped = await uploadToStorage(compressedCropped, `cropped_${Date.now()}.jpg`);

      if (uploadedCropped) {
        const updated = [...photos];
        updated[previewIndex] = uploadedCropped;

        syncPhotosWithCover(updated);
        setIsCropping(false);
        setCropZoom(1);
        setCropRotation(0);
        toast.success("Foto berhasil dipotong & diunggah ulang!", { id: cropToast });
      } else {
        toast.error("Gagal mengunggah foto hasil crop.", { id: cropToast });
      }
    };
  };

  const handleAIParse = async () => {
    if (!parseText.trim()) {
      toast.warning("Silakan tempelkan teks deskripsi listing terlebih dahulu.");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse",
          data: {
            text: parseText,
            currentType: formData.property_type || "belum ditentukan",
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const parsed = result.data;
        const updates: any = {};

        if (parsed.title) updates.title = parsed.title;
        if (parsed.property_type) updates.property_type = parsed.property_type.toLowerCase();
        if (parsed.listing_type) updates.listing_type = parsed.listing_type.toLowerCase();
        if (parsed.property_category) updates.property_status = parsed.property_category.toLowerCase();
        if (parsed.selling_point) updates.selling_point = parsed.selling_point;
        if (parsed.address) updates.address = parsed.address;
        if (parsed.selling_price) updates.selling_price = parsed.selling_price.toString();
        if (parsed.rental_price) updates.rental_price = parsed.rental_period.toString();

        updateFormData(updates);
        toast.success("✨ Data berhasil diekstrak AI!");
      } else {
        toast.error(result.error || "Gagal memproses deskripsi teks");
      }
    } catch (error) {
      console.error("AI parse error:", error);
      toast.error("Terjadi kesalahan saat terhubung ke AI service.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-emerald-600" />
          Kategori & Foto Properti
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Atur tipe properti, geser urutan foto, dan tinjau atau crop foto sesuai kebutuhan.
        </p>
      </div>

      {/* BANNER AI AUTO-FILL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 p-5 text-white shadow-xl border border-indigo-500/30">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
              </span>
              <h3 className="text-sm font-bold tracking-wide text-indigo-100">
                AI Listing Auto-Fill
              </h3>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] px-2 py-0.5 border-0">
              INLAND AI
            </Badge>
          </div>

          <Textarea
            placeholder="Tempel teks deskripsi (contoh: Dijual Rumah BSD Sektor 1.2 LT 120 LB 90 KT 3 KM 2 Rp 1.5 Milyar)..."
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            rows={2}
            className="bg-black/40 border-indigo-500/40 text-xs text-white placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl"
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAIParse}
              disabled={aiLoading}
              className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-md gap-2"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengekstrak Data...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Ekstrak dengan AI
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* SEKSI PILIHAN KATEGORI */}
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Tipe Properti <span className="text-rose-500">*</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {propertyTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ property_type: type.value })}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left flex items-center justify-between",
                  formData.property_type === type.value
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-600/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 text-slate-700 dark:text-slate-300 bg-background"
                )}
              >
                <span>{type.label}</span>
                {formData.property_type === type.value && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Tipe Listing <span className="text-rose-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {listingTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ listing_type: type.value })}
                className={cn(
                  "py-2.5 px-4 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2",
                  formData.listing_type === type.value
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-background hover:bg-slate-50"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Kondisi Properti
          </Label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => updateFormData({ property_status: status.value })}
                className={cn(
                  "px-4 py-1.5 rounded-full border text-xs font-medium transition-all",
                  formData.property_status === status.value
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-background"
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold">Kerjasama Co-Broke</Label>
              <p className="text-[11px] text-muted-foreground">Izinkan agen eksternal menjual unit ini</p>
            </div>
            <Switch
              checked={showCoBrok}
              onCheckedChange={(val) => {
                setShowCoBrok(val);
                updateFormData({ co_broke: val });
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Video className="w-4 h-4 text-rose-500" /> Link Video YouTube (Opsional)
            </Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                updateFormData({ youtube_url: e.target.value });
              }}
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* SEKSI MANAJEMEN FOTO */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              Galeri Foto Properti ({photos.length})
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <strong>Tips:</strong> Geser foto untuk mengurutkan. Foto <strong>baris/urutan pertama otomatis dijadikan Cover</strong>.
            </p>
          </div>
        </div>

        {/* DROPZONE FOTO */}
        <div
          onClick={() => !isCompressing && fileInputRef.current?.click()}
          onDragOver={handleDropzoneDragOver}
          onDragLeave={handleDropzoneDragLeave}
          onDrop={handleDropzoneDrop}
          className={cn(
            "border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer relative",
            isDropzoneActive
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
              : "border-slate-300 dark:border-slate-800 hover:border-emerald-400 bg-muted/20",
            isCompressing && "opacity-60 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            disabled={isCompressing}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full">
              {isCompressing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <p className="text-xs font-semibold">
              {isCompressing ? "Sedang Mengompresi & Mengunggah Foto..." : "Klik atau seret file foto ke area ini"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Format JPG, PNG, WEBP — Foto otomatis dikompresi & disimpan ke Supabase Storage
            </p>
          </div>
        </div>

        {/* GRID DRAGGABLE PREVIEW FOTO */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
            {photos.map((photo, idx) => (
              <motion.div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOverItem(e, idx)}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "relative group aspect-square rounded-xl overflow-hidden border bg-slate-900 shadow-2xs cursor-grab active:cursor-grabbing transition-transform duration-150",
                  draggedIndex === idx && "opacity-40 scale-95 ring-2 ring-blue-500",
                  idx === 0 && "ring-2 ring-amber-500 border-transparent shadow-md"
                )}
              >
                <div className="absolute top-1.5 left-1.5 z-20 bg-black/60 backdrop-blur-xs p-1 rounded text-white opacity-80 group-hover:opacity-100 transition">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                <img
                  src={photo.preview}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1 z-10">
                  {idx === 0 && (
                    <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 border-0 flex items-center gap-1 font-bold shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-current" /> Cover Utama
                    </Badge>
                  )}
                  {photo.isExisting && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-black/60 text-white border-0 flex items-center gap-1 backdrop-blur-xs">
                      <Database className="w-2.5 h-2.5 text-emerald-400" /> Database
                    </Badge>
                  )}
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewIndex(idx);
                      setIsCropping(false);
                      setCropZoom(1);
                      setCropRotation(0);
                    }}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                    title="Perbesar / Review Foto"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
                    title="Hapus Foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PREVIEW & CROPPER FOTO */}
      <Dialog
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
      >
        <DialogContent className="w-full max-w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:w-[92vw] p-4 bg-slate-950 border-slate-800 text-white rounded-2xl overflow-hidden">
          <DialogHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              Review & Edit Foto {previewIndex !== null ? `#${previewIndex + 1}` : ""}
              {previewIndex === 0 && (
                <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 border-0">
                  Cover Utama
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewIndex !== null && photos[previewIndex] && (
            <div className="space-y-4 py-2">
              <div className="relative w-full h-[50vh] sm:h-[65vh] md:h-[72vh] lg:h-[78vh] bg-black/90 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                {!isCropping ? (
                  <img
                    src={photos[previewIndex].preview}
                    alt="Preview Full"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
                    <img
                      src={photos[previewIndex].preview}
                      alt="Crop View"
                      style={{
                        transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`,
                        transition: "transform 0.15s ease-out",
                      }}
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-emerald-400/80 pointer-events-none m-6 sm:m-12 rounded-lg flex items-center justify-center">
                      <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded font-semibold border border-emerald-400/30">
                        Area Hasil Potongan
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {isCropping ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCropZoom((z) => Math.max(0.5, z - 0.2))}
                        className="h-8 w-8 p-0 text-white border-slate-700 hover:bg-slate-800"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="font-mono text-xs w-12 text-center">
                        {Math.round(cropZoom * 100)}%
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCropZoom((z) => Math.min(3, z + 0.2))}
                        className="h-8 w-8 p-0 text-white border-slate-700 hover:bg-slate-800"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCropRotation((r) => (r + 90) % 360)}
                      className="h-8 gap-1.5 text-white border-slate-700 text-xs hover:bg-slate-800"
                    >
                      <RotateCw className="w-4 h-4" /> Putar 90°
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsCropping(false)}
                      className="h-8 text-xs text-slate-400 hover:text-white"
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={applyCrop}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                    >
                      <Check className="w-4 h-4" /> Terapkan Hasil Potong
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-1">
                  <p className="text-xs text-slate-400">
                    {photos[previewIndex].uploaded ? "Foto tersimpan di Supabase Storage" : "Foto siap diunggah"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCropping(true)}
                    className="h-8 text-xs border-slate-700 text-white hover:bg-slate-800 gap-1.5"
                  >
                    <Crop className="w-3.5 h-3.5 text-emerald-400" /> Mode Crop & Rotasi
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />

      {/* FOOTER NAVIGASI */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="button"
          onClick={nextStep}
          className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
        >
          <span>Lanjut ke Lokasi & Alamat</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}