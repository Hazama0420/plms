// components/create-property/steps/StepFacilities.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  CheckCircle2,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Wind,
  Wifi,
  Tv,
  Refrigerator,
  Shirt,
  Car,
  Waves,
  Dumbbell,
  ShieldCheck,
  Camera,
  KeyRound,
  Trees,
  Gamepad2,
  Building,
  Coffee,
  ShoppingBag,
  WashingMachine,
  Users,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// DATA FASILITAS DENGAN IKON & KATEGORI
// ============================================================
interface FacilityItem {
  id: string;
  label: string;
  category: "Kenyamanan & Perabot" | "Keamanan & Akses" | "Olahraga & Rekreasi" | "Fasilitas Komunitas";
  icon: any;
}

const facilityCategories: FacilityItem[] = [
  // Kenyamanan
  { id: "AC", label: "AC", category: "Kenyamanan & Perabot", icon: Wind },
  { id: "WiFi", label: "WiFi / Internet", category: "Kenyamanan & Perabot", icon: Wifi },
  { id: "TV", label: "TV / Cable TV", category: "Kenyamanan & Perabot", icon: Tv },
  { id: "Kulkas", label: "Kulkas", category: "Kenyamanan & Perabot", icon: Refrigerator },
  { id: "Mesin Cuci", label: "Mesin Cuci", category: "Kenyamanan & Perabot", icon: Shirt },
  { id: "Water Heater", label: "Water Heater", category: "Kenyamanan & Perabot", icon: Wind },

  // Keamanan & Akses
  { id: "Parkir", label: "Area Parkir", category: "Keamanan & Akses", icon: Car },
  { id: "Keamanan 24 Jam", label: "Keamanan 24 Jam", category: "Keamanan & Akses", icon: ShieldCheck },
  { id: "CCTV", label: "CCTV System", category: "Keamanan & Akses", icon: Camera },
  { id: "Akses Kartu", label: "Akses Kartu / Access Card", category: "Keamanan & Akses", icon: KeyRound },

  // Olahraga & Rekreasi
  { id: "Kolam Renang", label: "Kolam Renang", category: "Olahraga & Rekreasi", icon: Waves },
  { id: "Gym", label: "Gym / Fitness Center", category: "Olahraga & Rekreasi", icon: Dumbbell },
  { id: "Taman", label: "Taman / Garden", category: "Olahraga & Rekreasi", icon: Trees },
  { id: "Area Bermain", label: "Playground", category: "Olahraga & Rekreasi", icon: Gamepad2 },

  // Fasilitas Komunitas
  { id: "Musholla", label: "Musholla / Tempat Ibadah", category: "Fasilitas Komunitas", icon: Building },
  { id: "Café", label: "Café / Resto", category: "Fasilitas Komunitas", icon: Coffee },
  { id: "Mini Market", label: "Mini Market", category: "Fasilitas Komunitas", icon: ShoppingBag },
  { id: "Laundry", label: "Laundry Service", category: "Fasilitas Komunitas", icon: WashingMachine },
  { id: "Ruang Serbaguna", label: "Ruang Serbaguna / Hall", category: "Fasilitas Komunitas", icon: Users },
  { id: "Balon / Balkon", label: "Balkon", category: "Kenyamanan & Perabot", icon: Building2 },
];

interface StepFacilitiesProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepFacilities({ formData, updateFormData, nextStep, prevStep }: StepFacilitiesProps) {
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [customFacilities, setCustomFacilities] = useState<string[]>([]);

  const selected: string[] = formData.facilities || [];

  // Toggle Pilihan Fasilitas
  const toggleFacility = (facilityLabel: string) => {
    const newSelected = selected.includes(facilityLabel)
      ? selected.filter((f) => f !== facilityLabel)
      : [...selected, facilityLabel];
    updateFormData({ facilities: newSelected });
  };

  // Tambah Fasilitas Kustom
  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (
      facilityCategories.some((f) => f.label.toLowerCase() === trimmed.toLowerCase()) ||
      customFacilities.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.info("Fasilitas tersebut sudah ada di daftar.");
      setCustomInput("");
      return;
    }

    const updatedCustom = [...customFacilities, trimmed];
    setCustomFacilities(updatedCustom);

    // Otomatis centang fasilitas kustom yang baru ditambahkan
    const newSelected = [...selected, trimmed];
    updateFormData({ facilities: newSelected });

    setCustomInput("");
    toast.success(`Fasilitas "${trimmed}" berhasil ditambahkan!`);
  };

  // Filter Fasilitas Berdasarkan Search
  const filteredCategories = facilityCategories.filter((f) =>
    f.label.toLowerCase().includes(search.toLowerCase())
  );

  const categoriesList = [
    "Kenyamanan & Perabot",
    "Keamanan & Akses",
    "Olahraga & Rekreasi",
    "Fasilitas Komunitas",
  ] as const;

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          Fasilitas Properti
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pilih fasilitas yang tersedia untuk meningkatkan daya tarik listing Anda.
        </p>
      </div>

      {/* SEARCH BAR & BADGE SUMMARY */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari fasilitas (misal: AC, Gym, Swimming Pool)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="h-10 px-3.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0"
          >
            {selected.length} Fasilitas Terpilih
          </Badge>

          {selected.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFormData({ facilities: [] })}
              className="h-10 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* GRID FASILITAS BERDASARKAN KATEGORI */}
      <div className="space-y-6">
        {categoriesList.map((catName) => {
          const itemsInCat = filteredCategories.filter((item) => item.category === catName);
          if (itemsInCat.length === 0) return null;

          return (
            <div
              key={catName}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {catName}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {itemsInCat.map((item) => {
                  const Icon = item.icon;
                  const isChecked = selected.includes(item.label);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleFacility(item.label)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 group relative overflow-hidden",
                        isChecked
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-background hover:bg-slate-100/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isChecked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                      </div>

                      {isChecked && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* SECTION FASILITAS KUSTOM (JIKA ADA) */}
        {customFacilities.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Fasilitas Tambahan Kustom
            </h3>
            <div className="flex flex-wrap gap-2">
              {customFacilities.map((custom) => {
                const isChecked = selected.includes(custom);
                return (
                  <button
                    key={custom}
                    type="button"
                    onClick={() => toggleFacility(custom)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2",
                      isChecked
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-background"
                    )}
                  >
                    <span>{custom}</span>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* INPUT UNTUK MENAMBAH FASILITAS KUSTOM BARU */}
        <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-background/50 space-y-2">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Fasilitas Lainnya (Kustom)
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Contoh: Smart Home System, EV Charger..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              className="h-9 text-xs flex-1"
            />
            <Button
              type="button"
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
              className="h-9 text-xs bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white gap-1 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </Button>
          </div>
        </div>

        {filteredCategories.length === 0 && customFacilities.length === 0 && (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed">
            <p className="text-xs text-slate-500">Tidak ada fasilitas yang cocok dengan pencarian "{search}".</p>
          </div>
        )}
      </div>

      {/* FOOTER NAVIGASI WIZARD */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="gap-2 text-xs h-9 border-slate-300 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Button>

        <Button
          type="button"
          onClick={nextStep}
          className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 font-semibold"
        >
          <span>Lanjut ke Deskripsi & Catatan</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}