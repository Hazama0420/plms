// components/properties/location-select.tsx

"use client";

import { useEffect } from "react";
import { useLocation } from "@/hooks/use-location";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LocationSelectProps {
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  districtId?: string;
  villageId?: string;
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
  onCountryChange,
  onProvinceChange,
  onCityChange,
  onDistrictChange,
  onVillageChange,
  disabled = false,
}: LocationSelectProps) {
  const {
    countries,
    provinces,
    cities,
    districts,
    villages,
    fetchProvinces,
    fetchCities,
    fetchDistricts,
    fetchVillages,
    loading,
  } = useLocation();

  // Load provinces when country changes
  useEffect(() => {
    if (countryId) {
      fetchProvinces(countryId);
    }
  }, [countryId, fetchProvinces]);

  // Load cities when province changes
  useEffect(() => {
    if (provinceId) {
      fetchCities(provinceId);
    }
  }, [provinceId, fetchCities]);

  // Load districts when city changes
  useEffect(() => {
    if (cityId) {
      fetchDistricts(cityId);
    }
  }, [cityId, fetchDistricts]);

  // Load villages when district changes
  useEffect(() => {
    if (districtId) {
      fetchVillages(districtId);
    }
  }, [districtId, fetchVillages]);

  return (
    <div className="space-y-4">
      {/* Country */}
      <div className="space-y-2">
        <Label>Negara</Label>
        <Select
          value={countryId || ""}
          onValueChange={onCountryChange}
          disabled={disabled || loading.countries}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih negara" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.id}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Province */}
      <div className="space-y-2">
        <Label>Provinsi</Label>
        <Select
          value={provinceId || ""}
          onValueChange={onProvinceChange}
          disabled={disabled || !countryId || loading.provinces}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih provinsi" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((province) => (
              <SelectItem key={province.id} value={province.id}>
                {province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label>Kota / Kabupaten</Label>
        <Select
          value={cityId || ""}
          onValueChange={onCityChange}
          disabled={disabled || !provinceId || loading.cities}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih kota" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name} {city.city_type ? `(${city.city_type})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* District */}
      <div className="space-y-2">
        <Label>Kecamatan</Label>
        <Select
          value={districtId || ""}
          onValueChange={onDistrictChange}
          disabled={disabled || !cityId || loading.districts}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih kecamatan" />
          </SelectTrigger>
          <SelectContent>
            {districts.map((district) => (
              <SelectItem key={district.id} value={district.id}>
                {district.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Village */}
      <div className="space-y-2">
        <Label>Kelurahan / Desa</Label>
        <Select
          value={villageId || ""}
          onValueChange={onVillageChange}
          disabled={disabled || !districtId || loading.villages}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih kelurahan" />
          </SelectTrigger>
          <SelectContent>
            {villages.map((village) => (
              <SelectItem key={village.id} value={village.id}>
                {village.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}