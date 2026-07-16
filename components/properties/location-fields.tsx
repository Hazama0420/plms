"use client";

import { useState, useEffect } from "react";
import { MapPin, Globe, Building2, LocateFixed, MapPinned, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LocationFieldsProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

interface LocationOption {
  id: string;
  name: string;
}

export function LocationFields({ formData, onChange, errors = {} }: LocationFieldsProps) {
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [villages, setVillages] = useState<LocationOption[]>([]);

  const [loading, setLoading] = useState({
    countries: false,
    provinces: false,
    cities: false,
    districts: false,
    villages: false,
  });

  // Load countries
  useEffect(() => {
    const fetchCountries = async () => {
      setLoading((prev) => ({ ...prev, countries: true }));
      try {
        const { data, error } = await supabase
          .from("countries")
          .select("id, name")
          .order("name");
        if (!error && data) setCountries(data);
      } catch (e) {
        console.error("Failed to load countries:", e);
      } finally {
        setLoading((prev) => ({ ...prev, countries: false }));
      }
    };
    fetchCountries();
  }, []);

  // Load provinces when country changes
  useEffect(() => {
    if (!formData.country_id) {
      setProvinces([]);
      return;
    }
    const fetchProvinces = async () => {
      setLoading((prev) => ({ ...prev, provinces: true }));
      try {
        const { data, error } = await supabase
          .from("provinces")
          .select("id, name")
          .eq("country_id", formData.country_id)
          .order("name");
        if (!error && data) setProvinces(data);
      } catch (e) {
        console.error("Failed to load provinces:", e);
      } finally {
        setLoading((prev) => ({ ...prev, provinces: false }));
      }
    };
    fetchProvinces();
  }, [formData.country_id]);

  // Load cities when province changes
  useEffect(() => {
    if (!formData.province_id) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      setLoading((prev) => ({ ...prev, cities: true }));
      try {
        const { data, error } = await supabase
          .from("cities")
          .select("id, name")
          .eq("province_id", formData.province_id)
          .order("name");
        if (!error && data) setCities(data);
      } catch (e) {
        console.error("Failed to load cities:", e);
      } finally {
        setLoading((prev) => ({ ...prev, cities: false }));
      }
    };
    fetchCities();
  }, [formData.province_id]);

  // Load districts when city changes
  useEffect(() => {
    if (!formData.city_id) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      setLoading((prev) => ({ ...prev, districts: true }));
      try {
        const { data, error } = await supabase
          .from("districts")
          .select("id, name")
          .eq("city_id", formData.city_id)
          .order("name");
        if (!error && data) setDistricts(data);
      } catch (e) {
        console.error("Failed to load districts:", e);
      } finally {
        setLoading((prev) => ({ ...prev, districts: false }));
      }
    };
    fetchDistricts();
  }, [formData.city_id]);

  // Load villages when district changes
  useEffect(() => {
    if (!formData.district_id) {
      setVillages([]);
      return;
    }
    const fetchVillages = async () => {
      setLoading((prev) => ({ ...prev, villages: true }));
      try {
        const { data, error } = await supabase
          .from("villages")
          .select("id, name")
          .eq("district_id", formData.district_id)
          .order("name");
        if (!error && data) setVillages(data);
      } catch (e) {
        console.error("Failed to load villages:", e);
      } finally {
        setLoading((prev) => ({ ...prev, villages: false }));
      }
    };
    fetchVillages();
  }, [formData.district_id]);

  // Helper untuk render select dengan icon
  const renderSelect = (
    label: string,
    field: string,
    options: LocationOption[],
    placeholder: string,
    icon: React.ReactNode,
    loadingState: boolean
  ) => {
    const value = formData[field] || "";
    const hasError = !!errors[field];

    return (
      <div className="space-y-1.5">
        <Label htmlFor={field} className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
          {icon}
          {label}
          <span className="text-xs text-rose-500">*</span>
        </Label>
        <Select
          value={value}
          onValueChange={(val) => onChange(field, val)}
          disabled={loadingState || options.length === 0}
        >
          <SelectTrigger
            id={field}
            className={cn(
              "h-11 border-2 bg-white dark:bg-slate-900 transition-all",
              hasError
                ? "border-rose-500 ring-rose-500/20"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
              !value && "text-slate-400"
            )}
          >
            <SelectValue placeholder={loadingState ? "Memuat..." : placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {options.length === 0 && !loadingState ? (
              <div className="px-2 py-6 text-center text-sm text-slate-400">
                {value ? "Tidak ada opsi" : "Pilih opsi di atas"}
              </div>
            ) : (
              options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    {option.name}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {hasError && (
          <p className="text-xs text-rose-500 mt-1">{errors[field]}</p>
        )}
        {value && !hasError && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            ✓ {options.find((o) => o.id === value)?.name || "Terpilih"}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="border-2 border-blue-100/60 dark:border-blue-900/30 shadow-sm">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Alamat & Lokasi
          </h3>
          <span className="text-xs text-slate-400 ml-2">(Isi semua data lokasi)</span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Negara */}
          {renderSelect(
            "Negara",
            "country_id",
            countries,
            "Pilih negara",
            <Globe size={16} />,
            loading.countries
          )}

          {/* Provinsi */}
          {renderSelect(
            "Provinsi",
            "province_id",
            provinces,
            "Pilih provinsi",
            <MapPin size={16} />,
            loading.provinces
          )}

          {/* Kota */}
          {renderSelect(
            "Kota / Kabupaten",
            "city_id",
            cities,
            "Pilih kota",
            <Building2 size={16} />,
            loading.cities
          )}

          {/* Kecamatan */}
          {renderSelect(
            "Kecamatan",
            "district_id",
            districts,
            "Pilih kecamatan",
            <LocateFixed size={16} />,
            loading.districts
          )}

          {/* Kelurahan */}
          {renderSelect(
            "Kelurahan / Desa",
            "village_id",
            villages,
            "Pilih kelurahan",
            <MapPinned size={16} />,
            loading.villages
          )}
        </div>

        {/* Alamat Lengkap */}
        <div className="space-y-1.5 mt-2">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Search size={16} />
            Alamat Lengkap
            <span className="text-xs text-rose-500">*</span>
          </Label>
          <Input
            id="address"
            placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan"
            value={formData.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            className={cn(
              "h-11 border-2 bg-white dark:bg-slate-900 transition-all",
              errors.address
                ? "border-rose-500 ring-rose-500/20"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            )}
          />
          {errors.address && (
            <p className="text-xs text-rose-500 mt-1">{errors.address}</p>
          )}
        </div>

        {/* Kode Pos, Latitude, Longitude */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="postal_code" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Kode Pos
            </Label>
            <Input
              id="postal_code"
              placeholder="15310"
              value={formData.postal_code || ""}
              onChange={(e) => onChange("postal_code", e.target.value)}
              className="h-11 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="latitude" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Latitude
            </Label>
            <Input
              id="latitude"
              placeholder="-6.3223"
              value={formData.latitude || ""}
              onChange={(e) => onChange("latitude", e.target.value)}
              className="h-11 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longitude" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Longitude
            </Label>
            <Input
              id="longitude"
              placeholder="106.7890"
              value={formData.longitude || ""}
              onChange={(e) => onChange("longitude", e.target.value)}
              className="h-11 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}