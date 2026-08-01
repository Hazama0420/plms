// components/ui/page-loader.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Setiap kali pathname atau searchParams berubah (pindah halaman), picu animasi loading singkat
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400); // Durasi transisi singkat yang mulus (400ms)

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md transition-all animate-in fade-in-0 duration-200">
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border/80 shadow-xl">
        <div className="relative flex items-center justify-center">
          {/* Efek Lingkaran Luar Berdenyut */}
          <div className="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping" />
          {/* Icon Loader Utama */}
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xs font-bold text-foreground">Inland Property</p>
          <p className="text-[10px] text-muted-foreground font-mono animate-pulse">Memuat halaman...</p>
        </div>
      </div>
    </div>
  );
}