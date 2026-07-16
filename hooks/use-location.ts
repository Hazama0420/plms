// hooks/use-location.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { locationService, Country, Province, City, District, Village } from "@/services/location.service";

export function useLocation() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState({
    countries: false,
    provinces: false,
    cities: false,
    districts: false,
    villages: false,
  });

  // ===== FETCH COUNTRIES =====
  const fetchCountries = useCallback(async () => {
    setLoading((prev) => ({ ...prev, countries: true }));
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch (error) {
      console.error("Failed to fetch countries:", error);
    } finally {
      setLoading((prev) => ({ ...prev, countries: false }));
    }
  }, []);

  // ===== FETCH PROVINCES =====
  const fetchProvinces = useCallback(async (countryId: string) => {
    if (!countryId) {
      setProvinces([]);
      return;
    }
    setLoading((prev) => ({ ...prev, provinces: true }));
    try {
      const data = await locationService.getProvinces(countryId);
      setProvinces(data);
    } catch (error) {
      console.error("Failed to fetch provinces:", error);
    } finally {
      setLoading((prev) => ({ ...prev, provinces: false }));
    }
  }, []);

  // ===== FETCH CITIES =====
  const fetchCities = useCallback(async (provinceId: string) => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    setLoading((prev) => ({ ...prev, cities: true }));
    try {
      const data = await locationService.getCities(provinceId);
      setCities(data);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
    } finally {
      setLoading((prev) => ({ ...prev, cities: false }));
    }
  }, []);

  // ===== FETCH DISTRICTS =====
  const fetchDistricts = useCallback(async (cityId: string) => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    setLoading((prev) => ({ ...prev, districts: true }));
    try {
      const data = await locationService.getDistricts(cityId);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to fetch districts:", error);
    } finally {
      setLoading((prev) => ({ ...prev, districts: false }));
    }
  }, []);

  // ===== FETCH VILLAGES =====
  const fetchVillages = useCallback(async (districtId: string) => {
    if (!districtId) {
      setVillages([]);
      return;
    }
    setLoading((prev) => ({ ...prev, villages: true }));
    try {
      const data = await locationService.getVillages(districtId);
      setVillages(data);
    } catch (error) {
      console.error("Failed to fetch villages:", error);
    } finally {
      setLoading((prev) => ({ ...prev, villages: false }));
    }
  }, []);

  // Load countries on mount
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    provinces,
    cities,
    districts,
    villages,
    loading,
    fetchCountries,
    fetchProvinces,
    fetchCities,
    fetchDistricts,
    fetchVillages,
  };
}