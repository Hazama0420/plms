// components/ui/WatermarkedImage.tsx
"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface WatermarkedImageProps {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  watermarkOpacity?: number;
  watermarkSize?: string;
  showWatermark?: boolean;
  // 🆕 Kontrol object-fit lewat inline style — dijamin menang di atas class apa pun,
  // tidak bergantung urutan/importance Tailwind. Default "cover" supaya semua
  // pemanggilan lama (thumbnail, kartu properti, dll) tidak berubah perilakunya.
  objectFit?: "cover" | "contain";
}

export function WatermarkedImage({
  src,
  alt = "Foto Properti",
  className,
  imageClassName,
  watermarkOpacity = 0.6,
  watermarkSize = "w-1/3",
  showWatermark = true,
  objectFit = "cover",
}: WatermarkedImageProps) {
  return (
    <div className={cn("relative overflow-hidden select-none", className)}>
      {/* 1. FOTO UTAMA DARI SUPABASE (BERSIH) */}
      <img
        src={src}
        alt={alt}
        // object-fit TIDAK lagi diatur lewat class Tailwind di sini — dipindah ke
        // inline style di bawah supaya prop objectFit yang dipakai parent selalu menang.
        className={cn("w-full h-full", imageClassName)}
        style={{ objectFit, objectPosition: "center" }}
      />
      {/* 2. OVERLAY LOGO WATERMARK */}
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