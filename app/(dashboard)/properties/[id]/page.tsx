"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import propertyService from "@/services/property.service";
import { PropertyDetailClient } from "./PropertyDetailClient";

export default function PropertyDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const propertyId = params.id as string;

  const [property, setProperty] = useState<any | null>(null);
  const [relatedProperties, setRelatedProperties] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState("guest");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Fetch Auth State (Client-Side)
        const { data: { user } } = await supabase.auth.getUser();
        let role = "guest";
        let superAdmin = false;
        
        if (user) {
          setCurrentUser(user);
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          
          role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
          superAdmin = role === "super_admin" || role === "superadmin";
          setUserRole(role);
          setIsSuperAdmin(superAdmin);
        }

        // 2. Fetch Property via Original Service
        const propData = await propertyService.getById(propertyId);
        
        if (!isMounted) return;
        setProperty(propData);

        // 3. Fetch Related Properties via Service
        if (propData?.property_type) {
          const { data: relData } = await propertyService.getList({
            property_type: propData.property_type,
            status: "published",
            limit: 5,
          });
          
          // Format them to match what PropertyDetailClient expects
          const formattedRelated = relData
            .filter(p => p.id !== propData.id)
            .slice(0, 4)
            .map((p: any) => {
              const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
              const addrObj = Array.isArray(p.address) ? p.address[0] : p.address;
              const specObj = Array.isArray(p.specifications) ? p.specifications[0] : p.specifications;
              const mediaArr = Array.isArray(p.media) ? p.media : [];

              let thumbnail = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80";
              if (mediaArr.length > 0) {
                const primary = mediaArr.find((m: any) => m.is_primary) || mediaArr[0];
                thumbnail = primary?.public_url || primary?.url || primary?.file_path || thumbnail;
              }
              
              let priceVal = null;
              if (typeof p.price === "number") priceVal = p.price;
              else if (typeof priceObj === "number") priceVal = priceObj;
              else if (priceObj && typeof priceObj === "object") priceVal = priceObj.selling_price || priceObj.rental_price || priceObj.price || null;

              return {
                id: p.id,
                title: p.title || "Properti Inland",
                listing_code: p.listing_code || "INL-000",
                listing_type: p.listing_type || "jual",
                property_type: p.property_type || "Rumah",
                price: priceVal,
                location: addrObj?.city_name || addrObj?.district_name || addrObj?.city || p.location || "Lokasi Terverifikasi",
                bedrooms: Number(specObj?.bedroom || p.bedrooms || 0),
                bathrooms: Number(specObj?.bathroom || p.bathrooms || 0),
                building_area: Number(specObj?.building_area || p.building_area || 0),
                land_area: Number(specObj?.land_area || p.land_area || 0),
                thumbnail,
              };
            });
            
          setRelatedProperties(formattedRelated);
        }

        // 4. Fetch Agents if Super Admin
        if (superAdmin) {
          const { data: agentsData } = await supabase
            .from("users")
            .select("id, full_name, email, avatar_url, phone, whatsapp")
            .order("full_name");
          if (agentsData) setAgents(agentsData);
        }

      } catch (err: any) {
        console.error("Property Fetch Error:", err);
        if (isMounted) {
          setError(err.message || "Properti tidak ditemukan");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Memuat data properti...
        </p>
      </div>
    );
  }

  if (error || !property) {
    // Distinguish database/service error from a missing property.
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto space-y-4 p-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-3xl border border-border/40 shadow-sm">
          {error?.toLowerCase().includes("not found") ? "🏠" : "⚠️"}
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {error?.toLowerCase().includes("not found") ? "Properti Tidak Ditemukan" : "Terjadi Kesalahan"}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error?.toLowerCase().includes("not found")
            ? "Data properti ini mungkin telah dihapus atau Anda tidak memiliki hak akses untuk melihatnya."
            : `Gagal memuat properti: ${error}`}
        </p>
      </div>
    );
  }

  return (
    <PropertyDetailClient
      property={property}
      relatedProperties={relatedProperties}
      agents={agents}
      userRole={userRole}
      isLoggedIn={!!currentUser}
      currentUser={currentUser}
    />
  );
}