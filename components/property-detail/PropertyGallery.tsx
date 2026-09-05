// components/property-detail/PropertyGallery.tsx
"use client";

import { useState } from "react";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ImageIcon,
} from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
  defaultFallbackImage?: string;
}

export function PropertyGallery({
  images,
  title,
  defaultFallbackImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
}: PropertyGalleryProps) {
  const imageList = images.length > 0 ? images : [defaultFallbackImage];
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  const handlePrev = () => {
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-4">
      {/* Main Feature Image (Canonical 16:9) */}
      <div className="relative aspect-[16/9] w-full bg-muted group overflow-hidden rounded-2xl border border-border/60">
        <WatermarkedImage
          src={imageList[activeIdx] || defaultFallbackImage}
          alt={`${title} - Foto ${activeIdx + 1}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 pointer-events-none">
          <span className="text-xs text-white/90 font-medium">
            Foto {activeIdx + 1} dari {imageList.length}
          </span>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-md text-xs rounded-lg h-8"
            onClick={() => setIsLightboxOpen(true)}
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
            Perbesar
          </Button>
        </div>

        {/* Carousel controls if > 1 image */}
        {imageList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-80 hover:opacity-100 shadow-md"
              aria-label="Foto Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-80 hover:opacity-100 shadow-md"
              aria-label="Foto Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {imageList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {imageList.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative shrink-0 w-20 sm:w-24 aspect-[4/3] overflow-hidden transition-all cursor-pointer ${
                activeIdx === idx
                  ? "opacity-100 ring-2 ring-emerald-600 ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <WatermarkedImage
                src={imgUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                watermarkSize="w-1/2"
                watermarkOpacity={0.6}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent
          className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-black/95 border-neutral-800 text-white flex flex-col justify-between overflow-hidden"
          showCloseButton={false}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md z-10">
            <span className="text-sm font-medium text-white/90">
              {title} — <span className="text-white/60">{activeIdx + 1} / {imageList.length}</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-full h-8 w-8"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Lightbox Main Image */}
          <div className="relative flex-1 flex items-center justify-center p-4 min-h-0">
            <WatermarkedImage
              src={imageList[activeIdx] || defaultFallbackImage}
              alt={`${title} - Foto ${activeIdx + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />

            {imageList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Bar */}
          {imageList.length > 1 && (
            <div className="p-3 bg-black/60 backdrop-blur-md flex items-center justify-center gap-2 overflow-x-auto max-w-full">
              {imageList.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    activeIdx === idx
                      ? "border-emerald-500 opacity-100 scale-105"
                      : "border-transparent opacity-40 hover:opacity-80"
                  }`}
                >
                  <WatermarkedImage
                    src={imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                    watermarkSize="w-1/2"
                    watermarkOpacity={0.6}
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
