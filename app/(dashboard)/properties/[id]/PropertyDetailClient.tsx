"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, ChevronRight, MapPin, Shield } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { supabase } from "@/lib/supabase/client";
import propertyService from "@/services/property.service";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadCaptureModal } from "@/components/inquiry/LeadCaptureModal";
import { useLeadCapture } from "@/hooks/use-lead-capture";
import { formatKprCurrency } from "@/lib/kpr";
import { PropertyCard } from "@/components/properties/PropertyCard";

import {
  PropertyHeader,
  PropertyGallery,
  PropertySpecsGrid,
  PropertyDescription,
  PropertyLocationMap,
  PropertyAgentCard,
  PropertyKprSection,
  PropertyActionMenu,
  PropertyModals,
} from "@/components/property-detail";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draf Internal", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  review: { label: "Peninjauan", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  published: { label: "Dipublikasikan", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  sold: { label: "Terjual", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  rented: { label: "Tersewa", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  archived: { label: "Diarsip", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
};

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80";

export function PropertyDetailClient({
  property: initialProperty,
  relatedProperties: initialRelatedProperties,
  agents: initialAgents,
  userRole: initialUserRole,
  isLoggedIn: initialIsLoggedIn,
  currentUser: initialCurrentUser,
}: any) {
  const router = useRouter();
  
  const [property, setProperty] = useState<any>(initialProperty);
  const [agents, setAgents] = useState<any[]>(initialAgents || []);
  const [userRole, setUserRole] = useState<string>(initialUserRole || "guest");
  const [currentUser, setCurrentUser] = useState<any>(initialCurrentUser);
  const [relatedProperties, setRelatedProperties] = useState<any[]>(initialRelatedProperties || []);

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  // Client-side fallback for session
  useEffect(() => {
    if (!initialUserRole) {
      const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          setUserRole((userData?.role || user.user_metadata?.role || "agent").toLowerCase());
        }
      };
      fetchUser();
    }
  }, [initialUserRole]);

  // Load agents if superadmin and agents weren't passed (fallback)
  useEffect(() => {
    if ((userRole === "super_admin" || userRole === "superadmin") && agents.length === 0) {
      supabase.from("users").select("id, full_name, email, avatar_url, phone, whatsapp").order("full_name")
        .then(({ data }) => setAgents(data || []));
    }
  }, [userRole, agents.length]);

  const assignedAgent = useMemo(() => {
    if (!property) return null;
    if (property.assigned_to) {
      const foundInList = agents.find((a: any) => a.id === property.assigned_to);
      if (foundInList) return foundInList;
    }
    if (property.assigned_user && typeof property.assigned_user === "object") {
      return property.assigned_user;
    }
    return null;
  }, [property, agents]);

  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
  const isAdmin = isSuperAdmin || userRole === "admin";
  const isLoggedIn = !!currentUser;

  const { requestContact, modalProps } = useLeadCapture({
    isLoggedIn,
    source: "Website Property Detail",
    fallbackWhatsapp: assignedAgent?.whatsapp || assignedAgent?.phone || null,
  });

  const priceObj = Array.isArray(property?.price) ? property.price[0] : property?.price;
  const addressObj = Array.isArray(property?.address) ? property.address[0] : property?.address;
  const specObj = Array.isArray(property?.specifications)
    ? property.specifications[0]
    : property?.specifications || (Array.isArray(property?.specs) ? property.specs[0] : property?.specs);
  const buildingObj = Array.isArray(property?.building) ? property.building[0] : property?.building;
  const landObj = Array.isArray(property?.land) ? property.land[0] : property?.land;

  const numericPrice = useMemo(() => {
    if (typeof property?.price === "number") return property.price;
    if (priceObj?.selling_price) return Number(priceObj.selling_price);
    if (priceObj?.rental_price) return Number(priceObj.rental_price);
    if (priceObj?.price) return Number(priceObj.price);
    return 0;
  }, [property, priceObj]);

  const landAreaVal = landObj?.land_area || specObj?.land_area || 0;
  const pricePerMeterFormatted = useMemo(() => {
    if (numericPrice > 0 && landAreaVal > 0) {
      return `${formatKprCurrency(Math.round(numericPrice / landAreaVal))} / m²`;
    }
    return null;
  }, [numericPrice, landAreaVal]);

  const imageList = useMemo(() => {
    if (!property) return [];
    let list: string[] = [];
    if (property.media && Array.isArray(property.media) && property.media.length > 0) {
      list = property.media
        .map((m: any) => m.file_url || m.public_url || m.url || m.file_path)
        .filter((url: any) => typeof url === "string" && url.trim() !== "");
    }
    if (list.length === 0 && property.images) {
      if (Array.isArray(property.images)) {
        list = property.images.filter((img: any) => typeof img === "string" && img.trim() !== "");
      } else if (typeof property.images === "string") {
        try {
          const parsed = JSON.parse(property.images);
          if (Array.isArray(parsed)) list = parsed.filter((img: any) => typeof img === "string" && img.trim() !== "");
        } catch {
          list = [property.images];
        }
      }
    }
    return list;
  }, [property]);

  const formattedAddressText = useMemo(() => {
    if (!addressObj) return property?.location || "Lokasi Properti";
    return [
      addressObj.street_address,
      addressObj.village_name || addressObj.village,
      addressObj.district_name || addressObj.district,
      addressObj.city_name || addressObj.city,
      addressObj.province_name || addressObj.province,
    ].filter(Boolean).join(", ") || "Lokasi Terverifikasi";
  }, [addressObj, property]);

  const canEdit = useMemo(() => {
    if (!currentUser || !property) return false;
    if (isSuperAdmin || isAdmin) return true;
    return (
      property.created_by === currentUser.id ||
      property.user_id === currentUser.id ||
      property.assigned_to === currentUser.id
    );
  }, [currentUser, property, isSuperAdmin, isAdmin]);

  const handleAssignAgent = async (agentId: string | null) => {
    if (!property || !isSuperAdmin) return;
    setAssignLoading(true);
    try {
      const result = await propertyService.updateAssignedTo(property.id, agentId || null);
      setProperty(result.data);
      if (result.drafted) toast.warning("Penugasan dilepas", { description: result.message });
      else toast.success(agentId ? "Agen penanggung jawab berhasil ditugaskan." : "Penugasan agen dilepas.");
      setShowAssignDialog(false);
    } catch (error: any) {
      toast.error("Gagal menugaskan agen", { description: error.message });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!property || !canEdit) return;
    setUpdatingStatus(true);
    try {
      const result = await propertyService.updateStatus(property.id, newStatus as any);
      if (result.downgraded) toast.warning("Listing disimpan sebagai draf", { description: result.message });
      else toast.success(`Status publikasi diubah menjadi ${statusConfig[result.data.status]?.label || result.data.status}`);
      setProperty(await propertyService.getById(property.id));
      setShowStatusDialog(false);
    } catch (error: any) {
      toast.error("Gagal mengubah status", { description: error.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!property || !canEdit) return;
    setDeleting(true);
    try {
      await propertyService.delete(property.id);
      toast.success("Properti berhasil dihapus permanen");
      router.push("/properties");
    } catch (error: any) {
      toast.error("Gagal menghapus properti", { description: error.message });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDuplicate = async () => {
    if (!property || !canEdit) return;
    try {
      const duplicated = await propertyService.duplicate(property.id);
      toast.success("Properti berhasil diduplikasi!");
      router.push(`/properties/${duplicated.id}`);
    } catch (error: any) {
      toast.error("Gagal menduplikasi properti", { description: error.message });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.title,
        text: `Lihat properti ${property?.title} di Inland Property`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Tautan properti disalin ke clipboard!");
    }
  };

  const currentStatusConfig = statusConfig[property?.status] || statusConfig.draft;

  if (!property) return null;

  return (
    <div className="pb-32 sm:pb-24 text-foreground relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 space-y-8">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Button>

          <PropertyActionMenu
            propertyId={property.id}
            canEdit={canEdit}
            isSuperAdmin={isSuperAdmin}
            onOpenStatusDialog={() => setShowStatusDialog(true)}
            onOpenAssignDialog={() => setShowAssignDialog(true)}
            onOpenDeleteDialog={() => setShowDeleteDialog(true)}
            onDuplicate={handleDuplicate}
            onShare={handleShare}
          />
        </div>

        {/* 2-COLUMN EDITORIAL LAYOUT (Desktop) / SINGLE-COLUMN (Mobile) */}
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* LEFT: VISUALS & NARRATIVE */}
          <div className="lg:flex-1 space-y-8 min-w-0">
            {/* Gallery Component */}
            <PropertyGallery
              images={imageList}
              title={property.title}
              defaultFallbackImage={DEFAULT_FALLBACK_IMAGE}
            />

            {/* Header / Title / Pricing */}
            <PropertyHeader
              title={property.title}
              listingCode={property.listing_code || "INL-000"}
              listingType={property.listing_type}
              statusLabel={currentStatusConfig.label}
              statusColor={currentStatusConfig.color}
              statusBg={currentStatusConfig.bg}
              priceFormatted={numericPrice > 0 ? formatKprCurrency(numericPrice) : "Hubungi Agen"}
              pricePerMeter={pricePerMeterFormatted}
              location={formattedAddressText}
            />

            {/* Specs Grid */}
            <PropertySpecsGrid
              bedrooms={specObj?.bedroom || property.bedrooms}
              bathrooms={specObj?.bathroom || property.bathrooms}
              buildingArea={buildingObj?.building_area || specObj?.building_area || property.building_area}
              landArea={landObj?.land_area || specObj?.land_area || property.land_area}
              electricity={specObj?.electricity}
              certificate={specObj?.certificate}
              carport={specObj?.carport}
              floors={specObj?.floors || buildingObj?.floor_count}
              facing={specObj?.facing_direction}
              furnishing={specObj?.furnishing}
            />

            {/* Description */}
            <PropertyDescription
              description={property.description}
              sellingPoints={property.selling_point}
              buildingDetails={{
                foundation: buildingObj?.foundation,
                structure: buildingObj?.structure,
                walls: buildingObj?.walls,
                roof: buildingObj?.roof,
                flooring: buildingObj?.flooring,
                sanitary: buildingObj?.sanitary,
                waterSource: buildingObj?.water_source,
              }}
            />

            {/* Map */}
            <PropertyLocationMap
              addressFormatted={formattedAddressText}
              street={addressObj?.street_address}
              rtRw={addressObj?.rt_rw}
              village={addressObj?.village_name || addressObj?.village}
              district={addressObj?.district_name || addressObj?.district}
              city={addressObj?.city_name || addressObj?.city}
              province={addressObj?.province_name || addressObj?.province}
              postalCode={addressObj?.postal_code}
              latitude={addressObj?.latitude}
              longitude={addressObj?.longitude}
            />
          </div>

          {/* RIGHT: ACTION, AGENT, & KPR */}
          <div className="lg:w-[380px] shrink-0 space-y-6">
            <div className="sticky top-20 space-y-6">
              
              <PropertyAgentCard
                agentName={assignedAgent?.full_name || "Agen Resmi Inland Property"}
                agentAvatar={assignedAgent?.avatar_url}
                agentPhone={assignedAgent?.phone || assignedAgent?.whatsapp}
                onRequestWhatsApp={() => requestContact({ id: property.id, title: property.title, listing_code: property.listing_code })}
                onRequestInquiry={() => requestContact({ id: property.id, title: property.title, listing_code: property.listing_code })}
              />

              <PropertyKprSection
                propertyPrice={numericPrice}
                propertyTitle={property.title}
                onConsultWhatsApp={() => requestContact({ id: property.id, title: property.title, listing_code: property.listing_code })}
              />

              {/* Quick Listing Info Card */}
              <div className="bg-card border border-border/40 shadow-sm rounded-xl p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Kode Listing</span>
                  <span className="font-mono font-bold text-foreground">{property.listing_code}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Tipe Transaksi</span>
                  <span className="font-bold text-foreground uppercase">{property.listing_type}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Terdaftar Sejak</span>
                  <span className="font-medium text-foreground">
                    {property.created_at ? format(new Date(property.created_at), "dd MMM yyyy", { locale: localeId }) : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Status Listing</span>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${currentStatusConfig.color} ${currentStatusConfig.bg}`}>
                    {currentStatusConfig.label}
                  </Badge>
                </div>
              </div>

              {/* Owner details card (Admin only) */}
              {isAdmin && property.owner && (
                <Card className="border border-border/40 rounded-xl bg-muted/30 shadow-none">
                  <CardHeader className="p-4 border-b border-border/40">
                    <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>Data Pemilik Properti (Internal Admin)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-semibold text-[10px] uppercase">Nama Pemilik:</span>
                      <span className="font-bold text-foreground block">{property.owner.name || "-"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-semibold text-[10px] uppercase">Nomor Telepon:</span>
                      <span className="font-bold text-foreground block">{property.owner.phone || "-"}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* RELATED PROPERTIES */}
        {relatedProperties.length > 0 && (
          <div className="space-y-6 pt-10 border-t border-border/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Properti Serupa di Area Ini</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/properties?property_type=${property.property_type}`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 h-8"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProperties.map((relProp) => (
                <PropertyCard
                  key={relProp.id}
                  variant="dashboard"
                  property={relProp}
                  onClick={() => router.push(`/properties/${relProp.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY BOTTOM CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/40 p-4 z-40 safe-area-bottom">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button
            type="button"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
            onClick={() => requestContact({ id: property.id, title: property.title, listing_code: property.listing_code })}
          >
            WhatsApp Agen
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-border/40 hover:bg-muted font-bold h-12 rounded-xl"
            onClick={() => requestContact({ id: property.id, title: property.title, listing_code: property.listing_code })}
          >
            Jadwalkan Survey
          </Button>
        </div>
      </div>

      <PropertyModals
        showDeleteDialog={showDeleteDialog}
        onCloseDeleteDialog={() => setShowDeleteDialog(false)}
        onConfirmDelete={handleDelete}
        deleting={deleting}
        propertyTitle={property.title}
        showStatusDialog={showStatusDialog}
        onCloseStatusDialog={() => setShowStatusDialog(false)}
        currentStatus={property.status}
        statusConfig={statusConfig}
        onConfirmUpdateStatus={handleUpdateStatus}
        updatingStatus={updatingStatus}
        showAssignDialog={showAssignDialog}
        onCloseAssignDialog={() => setShowAssignDialog(false)}
        agents={agents}
        currentAssignedId={property.assigned_to}
        onConfirmAssign={handleAssignAgent}
        assigningAgent={assignLoading}
      />
      <LeadCaptureModal {...modalProps} />
    </div>
  );
}
