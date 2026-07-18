// components/create-property/CreatePropertyWizard.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Save, Sparkles } from "lucide-react";

// ============================================================
// STEP DEFINITION
// ============================================================
export const steps = [
  { id: "category", label: "Kategori & Foto", icon: "Grid" },
  { id: "specification", label: "Spesifikasi", icon: "Ruler" },
  { id: "location", label: "Lokasi", icon: "MapPin" },
  { id: "facilities", label: "Fasilitas", icon: "Home" },
  { id: "price_description", label: "Harga & Deskripsi", icon: "DollarSign" },
  { id: "contact", label: "Kontak", icon: "User" },
  { id: "review", label: "Preview & Publish", icon: "CheckCircle" },
];

// ============================================================
// DEFAULT FORM DATA
// ============================================================
const defaultFormData = {
  // Category
  property_type: "",
  listing_type: "jual",
  property_status: "",
  co_broke: false,
  youtube_url: "",
  photos: [],
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
  facilities: [],

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
  initialData?: any;
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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>(() => ({
    ...defaultFormData,
    ...initialData,
  }));
  const [score, setScore] = useState(0);

  // ===== HITUNG SKOR =====
  const calculateScore = useCallback((data: any) => {
    let total = 0;
    if (data.property_type) total += 10;
    if (data.listing_type) total += 5;
    if (data.property_status) total += 5;
    if (data.selling_price || data.rental_price) total += 10;
    if (data.address) total += 10;
    if (data.photos?.length >= 3) total += 20;
    else if (data.photos?.length > 0) total += 10;
    if (data.description?.length > 50) total += 15;
    else if (data.description?.length > 20) total += 8;
    if (data.facilities?.length > 0) total += 10;
    if (data.owner_name) total += 5;
    if (data.bedroom && data.bathroom) total += 5;
    if (data.land_area || data.building_area) total += 5;
    return Math.min(total, 100);
  }, []);

  useEffect(() => {
    setScore(calculateScore(formData));
  }, [formData, calculateScore]);

  // ===== UPDATE FORM DATA =====
  const updateFormData = useCallback((data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
  }, []);

  // ===== NAVIGATION =====
  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  // ===== RENDER STEP =====
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

  // ===== HANDLE SAVE DRAFT =====
  const handleSaveDraft = () => {
    console.log("📝 Saving draft...", formData);
    // TODO: Implementasi save draft
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            <SidebarStepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={goToStep}
            />
            <PropertyScoreCard score={score} />
          </div>
        </div>

        {/* KONTEN UTAMA */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {/* ACTION BUTTONS */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="order-2 sm:order-1"
              >
                ← Kembali
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Simpan Draft
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-600/30"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {mode === "edit" ? "Update" : "Publikasikan"}
                    </>
                  ) : (
                    "Lanjutkan →"
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