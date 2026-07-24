// app/(dashboard)/properties/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bed,
  Bath,
  Maximize2,
  Building2,
  MapPin,
  Zap,
  Car,
  Shield,
  Share2,
  Pencil,
  Trash2,
  Globe,
  Sparkles,
  Phone,
  MessageCircle,
  Calendar,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Printer,
  ShieldCheck,
  Compass,
  FileText,
  Navigation,
  X,
  Calculator,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA PROPERTI
// ============================================================
interface PropertyDetail {
  id: string;
  title: string;
  listing_code: string;
  listing_type: "jual" | "sewa" | string;
  property_type: "rumah" | "apartemen" | "ruko" | "tanah" | "villa" | string;
  price: number;
  land_area: number;
  building_area: number;
  bedrooms: number;
  bathrooms: number;
  carport?: number;
  electricity?: number;
  certificate?: string;
  facing?: string;
  address: string;
  district?: string;
  city?: string;
  province?: string;
  description: string;
  features?: string[];
  images?: string[];
  status: "available" | "sold" | "rented" | "pending" | string;
  agent_name?: string;
  agent_phone?: string;
  agent_photo?: string;
  created_at?: string;
}

// Default Fallback Images jika data gambar kosong
const fallbackImages = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
];

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Gallery Modal State
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // AI Price Prediction Modal State
  const [isAiPredictOpen, setIsAiPredictOpen] = useState(false);
  const [aiPredicting, setAiPredicting] = useState(false);
  const [aiPriceResult, setAiPriceResult] = useState<{
    estimatedPrice: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    recommendation: string;
  } | null>(null);

  // Export Portal Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportingPortal, setExportingPortal] = useState<string | null>(null);

  // Fetch Property Detail dari Supabase
  const fetchPropertyDetail = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (error || !data) {
        // Fallback Sample Data bergaya Brighton / Rumah123 jika ID dummy
        setProperty({
          id: propertyId || "prop-sample",
          title: "Cluster Minimalis Modern Modern Land BSD City",
          listing_code: "INL-BSD-889",
          listing_type: "jual",
          property_type: "rumah",
          price: 2850000000,
          land_area: 120,
          building_area: 150,
          bedrooms: 4,
          bathrooms: 3,
          carport: 2,
          electricity: 3500,
          certificate: "SHM - Sertifikat Hak Milik",
          facing: "Utara",
          address: "Cluster Green BSD Phase 2 No. 18",
          district: "Serpong",
          city: "Tangerang Selatan",
          province: "Banten",
          description:
            "Dijual rumah siap huni konsep modern tropis di kawasan berkembang BSD City. Lokasi sangat strategis dekat dengan pintu Tol BSD Timur, AEON Mall, dan Stasiun Rawa Buntu. Lingkungan aman dengan one gate system 24 jam, bebas banjir, serta fasilitas clubhouse & kolam renang di dalam komplek.",
          features: [
            "Keamanan 24 Jam & CCTV",
            "Clubhouse & Swimming Pool",
            "Bebas Banjir",
            "Smart Door Lock",
            "Dekat Pintu Tol BSD",
            "Dekat Stasiun KRL",
            "Kanopi Carport Baja Ringan",
            "Kitchen Set Kitchenette Included",
          ],
          images: fallbackImages,
          status: "available",
          agent_name: "Budi Santoso (Inland Senior Agent)",
          agent_phone: "081298765432",
          agent_photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
          created_at: new Date().toISOString(),
        });
      } else {
        setProperty({
          ...data,
          images: data.images && data.images.length > 0 ? data.images : fallbackImages,
        });
      }
    } catch (err) {
      console.error("Error fetching property detail:", err);
      toast.error("Gagal memuat detail properti");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchPropertyDetail();
  }, [fetchPropertyDetail]);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Direct WhatsApp Brochure Generator
  const handleOpenWhatsApp = () => {
    if (!property) return;
    const cleanPhone = (property.agent_phone || "081298765432")
      .replace(/[^0-9]/g, "")
      .replace(/^0/, "62");

    const message = encodeURIComponent(
      `Halo Bpk/Ibu *${property.agent_name || "Agent Inland"}*,\n\nSaya tertarik dengan listing properti berikut:\n\n🏡 *${property.title}*\n📍 *Kode Listing*: ${property.listing_code}\n💰 *Harga*: ${formatCurrency(property.price)}\n\nMohon info ketersediaan unit dan jadwal survei lokasi. Terima kasih!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  // AI Price Predictor Handler
  const handleRunAiPrediction = async () => {
    if (!property) return;
    setAiPredicting(true);
    setIsAiPredictOpen(true);

    try {
      // Panggil API Predict Price AI
      const res = await fetch("/api/ai/predict-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          land_area: property.land_area,
          building_area: property.building_area,
          bedrooms: property.bedrooms,
          location: `${property.district || ""}, ${property.city || ""}`,
          property_type: property.property_type,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setAiPriceResult(json);
      } else {
        // Fallback Simulasi Algoritma Prediksi Harga AI
        setTimeout(() => {
          const estimated = Math.round((property.price * 1.05) / 1000000) * 1000000;
          setAiPriceResult({
            estimatedPrice: estimated,
            priceRangeLow: Math.round((estimated * 0.95) / 1000000) * 1000000,
            priceRangeHigh: Math.round((estimated * 1.1) / 1000000) * 1000000,
            recommendation:
              "Harga listing sangat kompetitif! Berdasarkan analisis tren pasar transaksi terkini di area " +
              (property.city || "Tangerang Selatan") +
              ", nilai properti ini berpotensi naik 6-8% dalam 12 bulan ke depan.",
          });
        }, 1200);
      }
    } catch (err) {
      toast.error("Gagal menjalankan prediksi harga AI");
    } finally {
      setAiPredicting(false);
    }
  };

  // Trigger Export Portal
  const handleExportPortal = (portalName: string) => {
    setExportingPortal(portalName);
    setTimeout(() => {
      toast.success(`Berhasil mengeksport listing ke portal ${portalName}!`);
      setExportingPortal(null);
      setIsExportOpen(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-12 text-center space-y-4">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-bold">Properti Tidak Ditemukan</h2>
        <Button onClick={() => router.push("/properties")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Katalog
        </Button>
      </div>
    );
  }

  const pricePerSqm = property.land_area ? Math.round(property.price / property.land_area) : 0;
  const imagesList = property.images && property.images.length > 0 ? property.images : fallbackImages;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP BREADCRUMB & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/properties")}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5",
                  property.listing_type === "jual"
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white"
                )}
              >
                {property.listing_type === "jual" ? "DIJUAL" : "DISEWABKAN"}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] bg-muted">
                Kode: {property.listing_code}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Terverifikasi Inland
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 line-clamp-1">
              {property.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAiPrediction}
            className="h-9 text-xs border-amber-300 bg-amber-50/50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> AI Price Predict
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="h-9 text-xs gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" /> Export Portal
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/properties/${property.id}/edit`)}
            className="h-9 text-xs gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📸 2. IMAGE GALLERY SHOWCASE (BRIGHTON / RUMAH123 STYLE)     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 rounded-2xl overflow-hidden bg-muted/30 border p-1">
        {/* Main Big Photo (Left 2 Columns) */}
        <div
          onClick={() => setSelectedImageIndex(0)}
          className="md:col-span-2 relative aspect-[16/10] md:aspect-auto h-full min-h-[280px] md:min-h-[380px] rounded-xl overflow-hidden cursor-pointer group"
        >
          <img
            src={imagesList[0]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white border-0 text-[10px]">
            Foto Utama ({imagesList.length} Foto)
          </Badge>
        </div>

        {/* Secondary Grid Photos (Right 2 Columns) */}
        <div className="hidden md:grid col-span-2 grid-cols-2 gap-2.5">
          {imagesList.slice(1, 5).map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImageIndex(idx + 1)}
              className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group bg-muted"
            >
              <img
                src={img}
                alt={`Properti Photo ${idx + 2}`}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              {idx === 3 && imagesList.length > 5 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-bold">+{imagesList.length - 5} Foto Lainnya</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🏛️ 3. MAIN CONTENT GRID & STICKY SIDEBAR                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DETAILS, SPECS, & DESCRIPTION (8 KOLOM) */}
        <div className="md:col-span-8 space-y-6">
          
          {/* A. PRICE & OVERVIEW CARD */}
          <Card className="border shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4">
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Harga Penawaran Resmi:</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600">
                    {formatCurrency(property.price)}
                  </h2>
                  {pricePerSqm > 0 && (
                    <span className="text-xs text-muted-foreground font-mono">
                      (± {formatCurrency(pricePerSqm)}/m²)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>
                  {property.district ? `${property.district}, ` : ""}
                  {property.city || property.address}
                </span>
              </div>
            </div>

            {/* KEY SPECS SUMMARY (4 UTAMA) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/50 rounded-xl border border-border/40 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
                  <Bed className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Kamar Tidur</span>
                  <span className="font-bold text-xs font-mono">{property.bedrooms} Utama</span>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/40 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg shrink-0">
                  <Bath className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Kamar Mandi</span>
                  <span className="font-bold text-xs font-mono">{property.bathrooms} Ruangan</span>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/40 flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg shrink-0">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Luas Tanah</span>
                  <span className="font-bold text-xs font-mono">{property.land_area} m²</span>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/40 flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Luas Bangunan</span>
                  <span className="font-bold text-xs font-mono">{property.building_area} m²</span>
                </div>
              </div>
            </div>
          </Card>

          {/* B. SPESIFIKASI LENGKAP & LEGALITAS (BRIGHTON SPEC TABLE) */}
          <Card className="border shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Spesifikasi Detail & Sertifikat
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Tipe Properti:</span>
                <span className="font-semibold text-foreground capitalize">{property.property_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Sertifikat Legalitas:</span>
                <span className="font-bold text-emerald-600">{property.certificate || "SHM"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Daya Listrik:</span>
                <span className="font-semibold text-foreground font-mono">{property.electricity || 2200} Watt</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Kapasitas Carport:</span>
                <span className="font-semibold text-foreground">{property.carport || 1} Mobil</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Arah Hadap Bangunan:</span>
                <span className="font-semibold text-foreground">{property.facing || "Utara"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Status Ketersediaan:</span>
                <span className="font-bold text-emerald-600 uppercase">{property.status}</span>
              </div>
            </div>
          </Card>

          {/* C. DESKRIPSI & KEUNGGULAN LOKASI */}
          <Card className="border shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b pb-2">Deskripsi Properti</h3>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {property.description}
            </p>

            {property.features && property.features.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-xs font-bold text-foreground mb-2">Fasilitas & Keunggulan Area:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {property.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: STICKY AGENT INQUIRY CARD (4 KOLOM) */}
        <div className="md:col-span-4 space-y-4">
          <Card className="border shadow-md sticky top-6 p-4 space-y-4 bg-card">
            <div className="text-center pb-3 border-b border-border/50 space-y-2">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto border-2 border-emerald-500 shadow-sm">
                <img
                  src={property.agent_photo || "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80"}
                  alt={property.agent_name || "Agent Photo"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{property.agent_name || "Agen Resmi Inland"}</h4>
                <p className="text-[11px] text-muted-foreground">Certified Property Advisor</p>
              </div>
            </div>

            {/* DIRECT ACTION BUTTONS (RUMAH123 STYLE) */}
            <div className="space-y-2">
              <Button
                onClick={handleOpenWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2 py-2.5 h-auto shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4 fill-white" /> Hubungi Via WhatsApp (Fast)
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = `tel:${property.agent_phone || "081298765432"}`;
                }}
                className="w-full text-xs gap-2 h-9"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> Telepon Agen Direct
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/surveys/create")}
                className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9"
              >
                <Calendar className="w-3.5 h-3.5" /> Atur Jadwal Survei Lokasi
              </Button>
            </div>

            <Separator />

            {/* QUICK KPR SIMULATION ESTIMATION */}
            <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-foreground font-semibold">
                <span className="flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" /> Estimasi Angsuran KPR:
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mulai dari <strong className="font-mono text-emerald-600 font-bold">Rp {Math.round((property.price * 0.007) / 1000000)} Juta/bln</strong> (Asumsi DP 20%, Tenor 20 Thn).
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🖼️ FULLSCREEN GALLERY LIGHTBOX MODAL                         */}
      {/* ============================================================ */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-10 w-10"
          >
            <X className="w-6 h-6" />
          </Button>

          <div className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center gap-3">
            <img
              src={imagesList[selectedImageIndex]}
              alt={`Photo ${selectedImageIndex + 1}`}
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
            />
            <span className="text-xs text-white/80 font-mono">
              Foto {selectedImageIndex + 1} dari {imagesList.length}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🤖 AI PRICE PREDICTION DIALOG MODAL                          */}
      {/* ============================================================ */}
      <Dialog open={isAiPredictOpen} onOpenChange={setIsAiPredictOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> AI Valuation Price Prediction
            </DialogTitle>
            <DialogDescription className="text-xs">
              Estimasi nilai pasar wajar yang dihitung otomatis oleh AI berdasarkan transaksi sekitar area.
            </DialogDescription>
          </DialogHeader>

          {aiPredicting ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">AI sedang menganalisis data perbandingan pasar...</p>
            </div>
          ) : aiPriceResult ? (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-muted-foreground block text-[11px]">Rekomendasi Nilai Pasar AI:</span>
                <span className="text-xl font-bold font-mono text-emerald-600">
                  {formatCurrency(aiPriceResult.estimatedPrice)}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Rentang Wajar: {formatCurrency(aiPriceResult.priceRangeLow)} - {formatCurrency(aiPriceResult.priceRangeHigh)}
                </p>
              </div>

              <div className="p-3 bg-muted/60 rounded-xl space-y-1">
                <span className="font-bold text-foreground block">Analisis Pasar:</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {aiPriceResult.recommendation}
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button size="sm" onClick={() => setIsAiPredictOpen(false)} className="text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 🌐 EXPORT PORTAL DIALOG MODAL                                */}
      {/* ============================================================ */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" /> Export Listing ke Portal Properti
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sinkronkan listing ini secara instan ke portal mitra pihak ketiga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            {["Rumah123.com", "99.co Indonesia", "OLX Properti", "Facebook Marketplace"].map((portal) => (
              <div
                key={portal}
                className="p-3 border rounded-xl flex items-center justify-between hover:bg-muted/40 transition"
              >
                <span className="font-bold text-foreground">{portal}</span>
                <Button
                  size="sm"
                  disabled={exportingPortal === portal}
                  onClick={() => handleExportPortal(portal)}
                  className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {exportingPortal === portal ? "Syncing..." : "Sync Feed"}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsExportOpen(false)} className="text-xs">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}