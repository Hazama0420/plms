"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Save, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { SidebarStepper } from "./SidebarStepper";
import { PropertyScoreCard } from "./PropertyScoreCard";
import { StepCategory } from "./steps/StepCategory";
import { StepSpecification } from "./steps/StepSpecification";
import { StepLocation } from "./steps/StepLocation";
import { StepFacilities } from "./steps/StepFacilities";
import { StepPriceDescription } from "./steps/StepPriceDescription";
import { StepContact } from "./steps/StepContact";
import { StepReview } from "./steps/StepReview";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { hasRegion } from "@/lib/property-address";

// STEP DEFINITION
export const steps = [
  { id: "category", label: "Kategori & Foto", icon: "Grid" },
  { id: "specification", label: "Spesifikasi", icon: "Ruler" },
  { id: "location", label: "Lokasi", icon: "MapPin" },
  { id: "facilities", label: "Fasilitas", icon: "Home" },
  { id: "price_description", label: "Harga & Deskripsi", icon: "DollarSign" },
  { id: "contact", label: "Kontak", icon: "User" },
  { id: "review", label: "Preview & Publish", icon: "CheckCircle" },
];

// DEFAULT FORM DATA
const defaultFormData = {
  // Category
  property_type: "",
  listing_type: "jual",
  property_status: "",
  co_broke: false,
  youtube_url: "",
  photos: [] as any[],
  photos_uploaded: false,
  title: "",
  listing_code: "",

  // Specification
  bedroom: "",
  bathroom: "",
  garage: "",
  carport: "",
  floor: "",
  electricity: "",
  land_area: "",
  land_unit: "m²",
  land_width: "",
  land_length: "",
  building_area: "",
  building_width: "",
  building_length: "",
  year_built: "",
  certificate: "",
  condition: "",
  furnishing: "",
  water_source: "",
  facing: "",

  // Price & Description
  selling_price: "",
  rental_price: "",
  service_charge: "",
  maintenance_fee: "",
  rental_period: "",
  negotiable: false,
  description: "",
  selling_point: "",

  // Location
  region_id: null as number | null,
  location_candidate: null as string | null,
  province_name: "",
  city_name: "",
  district_name: "",
  village_name: "",
  address: "",
  postal_code: "",
  latitude: "",
  longitude: "",

  // Facilities
  facilities: [] as string[],

  // Contact
  owner_name: "",
  owner_phone: "",
  owner_whatsapp: "",
  owner_email: "",
  owner_identity_type: "",
  owner_identity_number: "",
  owner_address: "",
  owner_notes: "",

  // Review / Publish
  status: "published",
};

interface CreatePropertyWizardProps {
  initialData?: Record<string, any>;
  mode?: "create" | "edit";
  propertyId?: string;
  onSuccess?: () => void;
}

export function CreatePropertyWizard({
  initialData,
  mode = "create",
  propertyId,
  onSuccess,
}: CreatePropertyWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    ...defaultFormData,
    ...initialData,
  }));
  const [score, setScore] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState<Record<string, any> | null>(null);

  // SAFE DRAFT HYDRATION CHECK (Hanya untuk mode Create dan tidak ada initialData)
  useEffect(() => {
    if (mode !== "create" || initialData) return;
    try {
      const raw = localStorage.getItem("inland_property_draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.title || parsed.property_type || parsed.region_id || parsed.selling_price || parsed.address)
      ) {
        setSavedDraft(parsed);
      }
    } catch (err) {
      console.warn("Draf tersimpan tidak valid, mengabaikan:", err);
    }
  }, [mode, initialData]);

  const handleRestoreDraft = () => {
    if (savedDraft) {
      setFormData((prev) => ({
        ...prev,
        ...savedDraft,
      }));
      toast.success("Draf properti berhasil dipulihkan!");
      setSavedDraft(null);
    }
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem("inland_property_draft");
    } catch {}
    setSavedDraft(null);
    toast.info("Draf sebelumnya telah dibuang.");
  };

  // HITUNG SKOR KELENGKAPAN LISTING
  const calculateScore = useCallback((data: Record<string, any>) => {
    let total = 0;
    if (data.property_type) total += 10;
    if (data.listing_type) total += 5;
    if (data.property_status) total += 5;
    if (data.selling_price || data.rental_price) total += 10;
    // Yang menandai lokasi lengkap adalah wilayah hasil pencarian, bukan nama
    // jalan — nama jalan sekarang opsional.
    if (hasRegion(data)) total += 10;
    if (Array.isArray(data.photos) && data.photos.length >= 3) total += 20;
    else if (Array.isArray(data.photos) && data.photos.length > 0) total += 10;
    if (data.description && data.description.length > 50) total += 15;
    else if (data.description && data.description.length > 20) total += 8;
    if (Array.isArray(data.facilities) && data.facilities.length > 0) total += 10;
    if (data.owner_name) total += 5;
    if (data.bedroom && data.bathroom) total += 5;
    if (data.land_area || data.building_area) total += 5;
    return Math.min(total, 100);
  }, []);

  useEffect(() => {
    setScore(calculateScore(formData));
  }, [formData, calculateScore]);

  // UPDATE FORM DATA
  const updateFormData = useCallback((data: Partial<typeof defaultFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // NAVIGATION
  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // SAVE DRAFT FUNCTIONALITY
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      localStorage.setItem("inland_property_draft", JSON.stringify(formData));
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.success("Draft properti berhasil disimpan!", {
        description: "Data wilayah & formulir aman tersimpan di browser Anda.",
      });
    } catch (err) {
      toast.error("Gagal menyimpan draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const stepProgressPercentage = useMemo(() => {
    return Math.round(((currentStep + 1) / steps.length) * 100);
  }, [currentStep]);

  const isLastStep = currentStep === steps.length - 1;

  // RENDER ACTIVE STEP
  const renderStep = () => {
    const props = {
      formData,
      updateFormData,
      nextStep,
      prevStep,
      goToStep,
      mode,
      propertyId,
      onSuccess,
    };

    switch (steps[currentStep].id) {
      case "category":
        return <StepCategory {...props} />;
      case "specification":
        return <StepSpecification {...props} />;
      case "location":
        return <StepLocation {...props} />;
      case "facilities":
        return <StepFacilities {...props} />;
      case "price_description":
        return <StepPriceDescription {...props} />;
      case "contact":
        return <StepContact {...props} />;
      case "review":
        return <StepReview {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-4 space-y-3 sm:space-y-4">
      
      {/* ⬅️ HEADER PAGE WITH BACK BUTTON */}
      <div className="flex items-center justify-between border-b pb-4 dark:border-border">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Kembali ke halaman sebelumnya"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </Button>
          <div>
            <h1 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === "edit" ? "Edit Data Properti" : "Tambah Properti Baru"}
            </h1>
            <p className="text-[11px] sm:text-xs lg:text-sm text-muted-foreground">
              {mode === "edit"
                ? "Perbarui informasi dan spesifikasi properti Anda"
                : "Lengkapi data spesifikasi, lokasi, dan foto properti"}
            </p>
          </div>
        </div>
      </div>

      {/* 💾 DRAFT RECOVERY BANNER */}
      {savedDraft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-foreground animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                Draf properti tersimpan ditemukan!
              </p>
              <p className="text-[11px] text-muted-foreground">
                {savedDraft.title ? `"${savedDraft.title}"` : "Formulir properti yang belum selesai"} — Apakah Anda ingin memulihkan data tersebut?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-8 px-3 text-xs rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Buang
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRestoreDraft}
              className="h-8 px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              Pulihkan Draf
            </Button>
          </div>
        </div>
      )}

      {/* 📱 MOBILE STEP PROGRESS BAR (KHUSUS HP) */}
      <div className="lg:hidden bg-card border rounded-2xl p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
          <span className="text-emerald-600 font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> Langkah {currentStep + 1}/{steps.length}
          </span>
          <span className="text-foreground truncate text-right">{steps[currentStep].label}</span>
        </div>
        <Progress value={stepProgressPercentage} className="h-2 bg-muted" />
        {/* Langkah berikutnya ditampilkan agar terlihat apa yang menanti setelah
            menekan "Lanjutkan" — di HP daftar langkah samping tidak tampak. */}
        {!isLastStep && (
          <p className="text-[10px] text-muted-foreground truncate">
            Berikutnya: {steps[currentStep + 1].label}
          </p>
        )}
      </div>

      {/* 💻 DESKTOP & MOBILE GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* SIDEBAR STEPPER & SCORE CARD (DESKTOP) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 space-y-5">
          <div className="bg-card border rounded-2xl p-4 shadow-xs">
            <SidebarStepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={goToStep}
            />
          </div>
          <PropertyScoreCard score={score} />
        </div>

        {/* MAIN FORM CONTAINER */}
        <div className="lg:col-span-8 xl:col-span-9 w-full">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-3 sm:p-6 lg:p-7 space-y-4 sm:space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {/* NAVIGASI BOTTOM ACTION BUTTONS
                Mobile: 3 button horizontal (Kiri-Tengah-Kanan)
                Desktop: 2 button horizontal dengan gap */}
            <div className="sticky bottom-0 z-20 -mx-3 sm:mx-0 mt-6 sm:mt-8 px-3 sm:px-0 py-2.5 sm:py-0 sm:pt-4 border-t border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:bg-transparent sm:backdrop-blur-none">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {/* Mobile: [Sebelumnya, Draft, Lanjutkan] • Desktop: [Previous + [Draft + Next]] */}
                
                {/* BUTTON KIRI - Sebelumnya */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex-1 sm:flex-none text-[11px] sm:text-xs h-10 sm:h-9 px-2 sm:px-5 gap-1.5 sm:gap-2 font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                  <span className="hidden sm:inline">Langkah Sebelumnya</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                {/* Mobile: SIMPAN DRAFT (tengah) */}
                <div className="flex justify-center flex-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="text-[10px] h-10 px-3 shadow-sm border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Save className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    {isSavingDraft ? "..." : "Draft"}
                  </Button>
                </div>

                {/* Desktop: SIMPAN DRAFT */}
                <div className="hidden sm:flex">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="text-[11px] h-9 px-4 gap-2 border shadow-sm"
                  >
                    <Save className="h-4 w-4 text-slate-500" />
                    {isSavingDraft ? "Menyimpan..." : "Simpan Draft"}
                  </Button>
                </div>

                {/* BUTTON KANAN - Lanjutkan */}
                {!isLastStep && (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-[11px] sm:text-xs h-10 sm:h-9 gap-1.5 sm:gap-2 px-2 sm:px-7 font-bold tracking-wide"
                  >
                    <span className="hidden sm:inline">Lanjutkan</span>
                    <span className="sm:hidden">Next</span>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}