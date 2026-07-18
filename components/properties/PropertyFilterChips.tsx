// components/properties/PropertyFilterChips.tsx
"use client";

import { cn } from "@/lib/utils";

const chips = [
  { value: "all", label: "🏠 Semua" },
  { value: "rumah", label: "Rumah" },
  { value: "tanah", label: "Tanah" },
  { value: "ruko", label: "Ruko" },
  { value: "gudang", label: "Gudang" },
  { value: "villa", label: "Villa" },
  { value: "apartemen", label: "Apartemen" },
  { value: "kantor", label: "Kantor" },
];

interface PropertyFilterChipsProps {
  selectedChip: string;
  onChipClick: (value: string) => void;
}

export function PropertyFilterChips({ selectedChip, onChipClick }: PropertyFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChipClick(chip.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            selectedChip === chip.value
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}