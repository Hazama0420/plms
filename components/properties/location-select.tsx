// components/properties/location-select.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationSelectProps {
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  districtId?: string;
  villageId?: string;

  countries: { id: string; name: string }[];
  provinces: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  districts: { id: string; name: string }[];
  villages: { id: string; name: string }[];

  loading: {
    countries: boolean;
    provinces: boolean;
    cities: boolean;
    districts: boolean;
    villages: boolean;
  };

  onCountryChange: (id: string) => void;
  onProvinceChange: (id: string) => void;
  onCityChange: (id: string) => void;
  onDistrictChange: (id: string) => void;
  onVillageChange: (id: string) => void;

  disabled?: boolean;
}

export function LocationSelect({
  countryId,
  provinceId,
  cityId,
  districtId,
  villageId,
  countries,
  provinces,
  cities,
  districts,
  villages,
  loading,
  onCountryChange,
  onProvinceChange,
  onCityChange,
  onDistrictChange,
  onVillageChange,
  disabled = false,
}: LocationSelectProps) {
  return (
    <div className="space-y-4">
      {/* Country */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Negara</label>
        {loading.countries ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={countryId || ""}
            onValueChange={(val) => onCountryChange(val || "")}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih negara" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Province */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Provinsi</label>
        {loading.provinces ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={provinceId || ""}
            onValueChange={(val) => onProvinceChange(val || "")}
            disabled={disabled || !countryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih provinsi" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* City */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Kota / Kabupaten</label>
        {loading.cities ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={cityId || ""}
            onValueChange={(val) => onCityChange(val || "")}
            disabled={disabled || !provinceId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kota" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* District */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Kecamatan</label>
        {loading.districts ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={districtId || ""}
            onValueChange={(val) => onDistrictChange(val || "")}
            disabled={disabled || !cityId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kecamatan" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Village */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Kelurahan / Desa</label>
        {loading.villages ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={villageId || ""}
            onValueChange={(val) => onVillageChange(val || "")}
            disabled={disabled || !districtId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kelurahan" />
            </SelectTrigger>
            <SelectContent>
              {villages.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}