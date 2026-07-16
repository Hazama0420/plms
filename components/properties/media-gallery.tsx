"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Star, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { mediaService } from "@/services/media.service";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface MediaItem {
  id: string;
  public_url: string;
  is_primary: boolean;
  sort_order: number;
  original_name: string;
  file_size: number;
}

interface MediaGalleryProps {
  propertyId: string;
  media: MediaItem[];
  onUpdate: () => void;
}

export function MediaGallery({ propertyId, media, onUpdate }: MediaGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Upload foto
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // ✅ FIX: pakai uploadImages, tanpa user.id
      const result = await mediaService.uploadImages(propertyId, files);
      if (result.length > 0) {
        toast.success(`${result.length} foto berhasil diupload!`);
        onUpdate();
      } else {
        toast.error("Gagal upload foto");
      }
    } catch (error: any) {
      toast.error("Error upload: " + error.message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Hapus foto
  const handleDelete = async (mediaId: string) => {
    if (!confirm("Yakin hapus foto ini?")) return;
    setLoading(true);
    try {
      await mediaService.deleteMedia(mediaId);
      toast.success("Foto berhasil dihapus!");
      onUpdate();
      if (selectedImage === mediaId) setSelectedImage(null);
    } catch (error: any) {
      toast.error("Gagal hapus: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Set sebagai primary
  const handleSetPrimary = async (mediaId: string) => {
    setLoading(true);
    try {
      // ✅ FIX: urutan parameter (propertyId dulu, baru mediaId)
      await mediaService.setPrimary(propertyId, mediaId);
      toast.success("Foto primary berhasil diupdate!");
      onUpdate();
    } catch (error: any) {
      toast.error("Gagal set primary: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format ukuran file
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Jika belum ada foto
  if (media.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
        <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Belum ada foto</p>
        <p className="text-sm">Upload foto property dengan klik tombol di bawah</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
          id="upload-media"
          disabled={uploading}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById("upload-media")?.click()}
          disabled={uploading}
          className="mt-4"
        >
          {uploading ? "Uploading..." : "📤 Upload Foto"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tombol Upload */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{media.length} foto</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
          id="upload-media"
          disabled={uploading}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById("upload-media")?.click()}
          disabled={uploading}
          className="border-dashed"
        >
          {uploading ? (
            <><span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2" />Uploading...</>
          ) : (
            <><Upload size={16} className="mr-2" />Tambah Foto</>
          )}
        </Button>
      </div>

      {/* Grid Foto */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {media.map((item) => (
          <div
            key={item.id}
            className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition cursor-pointer"
            onClick={() => setSelectedImage(item.id)}
          >
            <img
              src={item.public_url}
              alt={item.original_name}
              className="w-full h-full object-cover"
            />
            {item.is_primary && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">
                ⭐ Primary
              </div>
            )}
            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); handleSetPrimary(item.id); }}
                disabled={loading || item.is_primary}
              >
                <Star size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-rose-500/50"
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                disabled={loading}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition z-10"
            >
              <X size={20} />
            </button>
            <img
              src={media.find((m) => m.id === selectedImage)?.public_url}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <div className="p-4 bg-white flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {media.find((m) => m.id === selectedImage)?.original_name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatSize(media.find((m) => m.id === selectedImage)?.file_size || 0)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPrimary(selectedImage)}
                  disabled={loading || media.find((m) => m.id === selectedImage)?.is_primary}
                >
                  <Star size={14} className="mr-1" />
                  Set Primary
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(selectedImage)}
                  disabled={loading}
                >
                  <Trash2 size={14} className="mr-1" />
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}