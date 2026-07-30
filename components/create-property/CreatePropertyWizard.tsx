"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Save, Sparkles, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

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
  country_id: "",
  province_id: "",
  city_id: "",
  district_id: "",
  village_id: "",
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

  // HITUNG SKOR KELENGKAPAN LISTING
  const calculateScore = useCallback((data: Record<string, any>) => {
    let total = 0;
    if (data.property_type) total += 10;
    if (data.listing_type) total += 5;
    if (data.property_status) total += 5;
    if (data.selling_price || data.rental_price) total += 10;
    if (data.address) total += 10;
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
        description: "Anda dapat melanjutkan pengisian kapan saja.",
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

  // RENDER ACTIVE STEP
  const renderStep = () => {
    const props = {
      formData,
      updateFormData,
      nextStep,
      prevStep,
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
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
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
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === "edit" ? "Edit Data Properti" : "Tambah Properti Baru"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {mode === "edit"
                ? "Perbarui informasi dan spesifikasi properti Anda"
                : "Lengkapi data spesifikasi, lokasi, dan foto properti"}
            </p>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE STEP PROGRESS BAR (KHUSUS HP) */}
      <div className="lg:hidden bg-card border rounded-2xl p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-emerald-600 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Langkah {currentStep + 1} dari {steps.length}
          </span>
          <span className="text-muted-foreground font-mono">{steps[currentStep].label}</span>
        </div>
        <Progress value={stepProgressPercentage} className="h-2 bg-muted" />
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
          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-8 lg:p-10 space-y-6">
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

            {/* NAVIGASI BOTTOM ACTION BUTTONS */}
            <div className="mt-8 sm:mt-12 pt-6 border-t border-border/80 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="w-full sm:w-auto text-xs h-10 px-5 gap-2 order-2 sm:order-1 font-medium"
              >
                <ArrowLeft className="h-4 w-4" /> Langkah Sebelumnya
              </Button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5 sm:gap-3 order-1 sm:order-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="w-full sm:w-auto text-xs h-10 px-4 gap-2 border shadow-2xs"
                >
                  <Save className="h-4 w-4 text-muted-foreground" />
                  {isSavingDraft ? "Menyimpan..." : "Simpan Draft"}
                </Button>

                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-xs h-10 gap-2 px-7 font-bold tracking-wide"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {mode === "edit" ? "Update Properti" : "Publikasikan Properti"}
                    </>
                  ) : (
                    <>
                      Lanjutkan <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}