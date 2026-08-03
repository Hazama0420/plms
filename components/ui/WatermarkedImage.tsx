"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface WatermarkedImageProps {
  src: string;
  alt?: string;
  className?: string;          // Untuk styling pembungkus/container
  imageClassName?: string;     // Untuk styling foto
  watermarkOpacity?: number;   // Opacity: 0.1 sampai 1.0 (contoh: 0.6 = 60%)
  watermarkSize?: string;      // Ukuran logo (contoh: "w-1/4", "w-1/3", "w-1/2")
  showWatermark?: boolean;     // Default true
}

export function WatermarkedImage({
  src,
  alt = "Foto Properti",
  className,
  imageClassName,
  watermarkOpacity = 0.6,    // Opacity 60% agar jelas
  watermarkSize = "w-1/3",     // Ukuran logo 33% dari lebar foto (bisa diganti w-1/4 jika mau lebih kecil)
  showWatermark = true,
}: WatermarkedImageProps) {
  return (
    <div className={cn("relative overflow-hidden select-none", className)}>
      {/* 1. FOTO UTAMA DARI SUPABASE (BERSIH) */}
      <img
        src={src}
        alt={alt}
        className={cn("w-full h-full object-cover", imageClassName)}
      />

      {/* 2. OVERLAY LOGO WATERMARK (LENGKAP DENGAN RATA TENGAH & OPACITY) */}
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <img
            src="/watermark.png"
            alt="Watermark"
            style={{ opacity: watermarkOpacity }}
            className={cn("object-contain pointer-events-none max-h-[60%]", watermarkSize)}
          />
        </div>
      )}
    </div>
  );
}