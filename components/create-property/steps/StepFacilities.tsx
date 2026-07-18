// components/create-property/steps/StepFacilities.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

const allFacilities = [
  "AC",
  "WiFi",
  "TV",
  "Kulkas",
  "Mesin Cuci",
  "Parkir",
  "Kolam Renang",
  "Gym",
  "Keamanan 24 Jam",
  "CCTV",
  "Akses Kartu",
  "Taman",
  "Area Bermain",
  "Musholla",
  "Café",
  "Mini Market",
  "Laundry",
  "Ruang Serbaguna",
];

interface StepFacilitiesProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepFacilities({ formData, updateFormData, nextStep, prevStep }: StepFacilitiesProps) {
  const [search, setSearch] = useState("");
  const selected = formData.facilities || [];

  const toggleFacility = (facility: string) => {
    const newSelected = selected.includes(facility)
      ? selected.filter((f: string) => f !== facility)
      : [...selected, facility];
    updateFormData({ facilities: newSelected });
  };

  const filtered = allFacilities.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pilih fasilitas yang tersedia di properti Anda
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari fasilitas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((facility) => (
          <label
            key={facility}
            className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={selected.includes(facility)}
              onCheckedChange={() => toggleFacility(facility)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{facility}</span>
          </label>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-4">
          Tidak ada fasilitas yang cocok
        </p>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          ← Kembali
        </Button>
        <Button
          onClick={nextStep}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Lanjut ke Deskripsi →
        </Button>
      </div>
    </div>
  );
}