// app/prototype-v2/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  // Navigation & Shell
  Home,
  Building2,
  Users,
  Receipt,
  ClipboardCheck,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Bell,
  Clock,
  Sparkles,
  ShieldCheck,
  Phone,
  MessageCircle,
  Eye,
  EyeOff,
  Plus,
  Download,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Check,
  Calculator,
  Share2,
  Heart,
  Bed,
  Bath,
  Maximize2,
  FileCheck,
  Zap,
  Car,
  Layers,
  Compass,
  Armchair,
  FileText,
  UserCheck,
  ArrowRight,
  Sun,
  Moon,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// MOCK DATA FOR PROTOTYPES
// ============================================================================

const MOCK_PROPERTIES = [
  {
    id: "prop-1",
    listing_code: "IP-00192801",
    title: "Rumah Modern Minimalis Cluster Grand Wisata",
    price: 1850000000,
    listing_type: "sale",
    property_type: "house",
    address: { district: "Tambun Selatan", city: "Bekasi" },
    specs: { bedrooms: 3, bathrooms: 2, building_area: 110, land_area: 120 },
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
    agent: { name: "Budi Santoso", phone: "081234567890", role: "Senior Consultant", avatar: "BS" },
    status: "published",
  },
  {
    id: "prop-2",
    listing_code: "IP-00192802",
    title: "Villa Tropis Eksklusif Kolam Renang Privat",
    price: 3500000000,
    listing_type: "sale",
    property_type: "villa",
    address: { district: "Canggu", city: "Badung" },
    specs: { bedrooms: 4, bathrooms: 4, building_area: 280, land_area: 350 },
    image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop&q=80",
    agent: { name: "Siti Rahmawati", phone: "081298765432", role: "Luxury Specialist", avatar: "SR" },
    status: "published",
  },
  {
    id: "prop-3",
    listing_code: "IP-00192803",
    title: "Apartemen Studio Furnished Dekat Stasiun MRT",
    price: 65000000,
    listing_type: "rent",
    property_type: "apartment",
    address: { district: "Kebayoran Baru", city: "Jakarta Selatan" },
    specs: { bedrooms: 1, bathrooms: 1, building_area: 36, land_area: 36 },
    image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80",
    agent: { name: "Ahmad Fauzi", phone: "081345678901", role: "Rental Advisor", avatar: "AF" },
    status: "published",
  },
  {
    id: "prop-4",
    listing_code: "IP-00192804",
    title: "Ruko Strategis 3 Lantai Jalur Bisnis Utama",
    price: 2750000000,
    listing_type: "sale",
    property_type: "commercial",
    address: { district: "Serpong", city: "Tangerang Selatan" },
    specs: { bedrooms: 2, bathrooms: 3, building_area: 195, land_area: 90 },
    image_url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&auto=format&fit=crop&q=80",
    agent: { name: "Budi Santoso", phone: "081234567890", role: "Senior Consultant", avatar: "BS" },
    status: "review",
  },
];

const MOCK_LEADS = [
  { id: "lead-1", name: "Hendro Wijaya", stage: "new", budget: "2,0 M", phone: "081288991122", interest: "Grand Wisata Bekasi", time: "10 mnt lalu" },
  { id: "lead-2", name: "Dewi Lestari", stage: "contacted", budget: "3,5 M", phone: "081122334455", interest: "Villa Canggu Bali", time: "1 jam lalu" },
  { id: "lead-3", name: "Rudi Hartono", stage: "qualified", budget: "1,8 M", phone: "085677889900", interest: "Rumah 3 KT BSD", time: "3 jam lalu" },
  { id: "lead-4", name: "Clarissa Tan", stage: "proposal", budget: "2,8 M", phone: "081700112233", interest: "Ruko 3 Lantai Serpong", time: "Kemarin" },
  { id: "lead-5", name: "Bambang Soediro", stage: "negotiation", budget: "1,75 M", phone: "081399887766", interest: "Grand Wisata Nego", time: "Kemarin" },
  { id: "lead-6", name: "Melani Putri", stage: "won", budget: "3,4 M", phone: "081933445566", interest: "Villa Canggu Deal", time: "2 hari lalu" },
];

const MOCK_INVOICES = [
  { id: "INV-2026-0089", client: "Hendro Wijaya", property: "Grand Wisata (IP-00192801)", amount: 46250000, type: "Komisi Penjualan", status: "paid", date: "02 Sep 2026" },
  { id: "INV-2026-0090", client: "Dewi Lestari", property: "Villa Canggu (IP-00192802)", amount: 87500000, type: "Komisi Penjualan", status: "sent", date: "03 Sep 2026" },
  { id: "INV-2026-0091", client: "Rudi Hartono", property: "Jasa Listing Premium", amount: 2500000, type: "Marketing Fee", status: "draft", date: "03 Sep 2026" },
  { id: "INV-2026-0092", client: "Clarissa Tan", property: "Ruko Serpong (IP-00192804)", amount: 68750000, type: "Komisi Penjualan", status: "overdue", date: "25 Agu 2026" },
];

function formatIDR(val: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
}

// ============================================================================
// MAIN PROTOTYPE HARNESS
// ============================================================================

export default function PrototypeV2Page() {
  const [activeTab, setActiveTab] = useState<"prototype-a" | "prototype-b" | "prototype-c">("prototype-a");
  const [erpSection, setErpSection] = useState<"dashboard" | "crm" | "invoices">("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [maskPhone, setMaskPhone] = useState(true);
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [crmMobileStage, setCrmMobileStage] = useState("new");

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground flex flex-col">
      {/* ─── PROTOTYPE HARNESS CONTROLLER BAR ─── */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 shrink-0 z-50 sticky top-0 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-sm tracking-tight text-white">
              INLAND <span className="text-emerald-400">DESIGN SYSTEM V2</span>
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
              VALIDATION LAB
            </span>
          </div>

          <Separator orientation="vertical" className="h-5 bg-slate-700 hidden sm:block" />

          {/* Prototype Selector */}
          <nav className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab("prototype-a")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "prototype-a"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Prototype A: ERP Shell
            </button>
            <button
              onClick={() => setActiveTab("prototype-b")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "prototype-b"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Prototype B: Storefront
            </button>
            <button
              onClick={() => setActiveTab("prototype-c")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "prototype-c"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Prototype C: Property Detail
            </button>
          </nav>
        </div>

        {/* Viewport & Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "prototype-a" && (
            <div className="flex items-center bg-slate-800/60 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setErpSection("dashboard")}
                className={`px-2 py-0.5 rounded ${erpSection === "dashboard" ? "bg-slate-700 text-emerald-400 font-bold" : "text-slate-400"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setErpSection("crm")}
                className={`px-2 py-0.5 rounded ${erpSection === "crm" ? "bg-slate-700 text-emerald-400 font-bold" : "text-slate-400"}`}
              >
                CRM Kanban
              </button>
              <button
                onClick={() => setErpSection("invoices")}
                className={`px-2 py-0.5 rounded ${erpSection === "invoices" ? "bg-slate-700 text-emerald-400 font-bold" : "text-slate-400"}`}
              >
                Invoices Table
              </button>
            </div>
          )}

          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setDeviceView("desktop")}
              className={`p-1.5 rounded ${deviceView === "desktop" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceView("mobile")}
              className={`p-1.5 rounded ${deviceView === "mobile" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN PROTOTYPE CANVAS ─── */}
      <main className="flex-1 overflow-auto p-2 sm:p-4 flex items-start justify-center">
        <div
          className={`transition-all duration-300 w-full ${
            deviceView === "mobile"
              ? "max-w-[400px] my-4 rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden bg-background min-h-[780px]"
              : "max-w-7xl rounded-2xl border border-border shadow-xl bg-background overflow-hidden"
          }`}
        >
          {activeTab === "prototype-a" && (
            <PrototypeA_OperationalShell
              section={erpSection}
              collapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              maskPhone={maskPhone}
              onToggleMaskPhone={() => setMaskPhone(!maskPhone)}
              deviceView={deviceView}
              crmMobileStage={crmMobileStage}
              onSelectMobileStage={setCrmMobileStage}
            />
          )}

          {activeTab === "prototype-b" && (
            <PrototypeB_StorefrontDiscovery deviceView={deviceView} />
          )}

          {activeTab === "prototype-c" && (
            <PrototypeC_PropertyDetail deviceView={deviceView} />
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// PROTOTYPE A — OPERATIONAL ERP SHELL
// ============================================================================

function PrototypeA_OperationalShell({
  section,
  collapsed,
  onToggleSidebar,
  maskPhone,
  onToggleMaskPhone,
  deviceView,
  crmMobileStage,
  onSelectMobileStage,
}: {
  section: "dashboard" | "crm" | "invoices";
  collapsed: boolean;
  onToggleSidebar: () => void;
  maskPhone: boolean;
  onToggleMaskPhone: () => void;
  deviceView: "desktop" | "mobile";
  crmMobileStage: string;
  onSelectMobileStage: (s: string) => void;
}) {
  return (
    <div className="flex h-[820px] bg-background overflow-hidden relative">
      {/* ─── 1. PERSISTENT COLLAPSIBLE SIDEBAR (DESKTOP) ─── */}
      {deviceView === "desktop" && (
        <aside
          className={`shrink-0 border-r border-border/80 bg-card transition-all duration-300 flex flex-col z-20 ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          {/* Sidebar Header */}
          <div className="h-14 border-b border-border/60 flex items-center justify-between px-3.5">
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0E2C24] border border-[#E2B23B]/40 flex items-center justify-center font-black text-sm text-[#E2B23B]">
                  IP
                </div>
                <div className="leading-tight">
                  <p className="font-extrabold text-xs tracking-tight text-foreground">
                    INLAND <span className="text-emerald-600">ERP</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">Budi Santoso (Agent)</p>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 mx-auto rounded-lg bg-[#0E2C24] border border-[#E2B23B]/40 flex items-center justify-center font-black text-xs text-[#E2B23B]">
                IP
              </div>
            )}
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              title={collapsed ? "Buka Sidebar" : "Kecilkan Sidebar"}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Sidebar Nav Items */}
          <nav className="flex-1 py-3 px-2 space-y-1 text-xs">
            <p className={`px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 ${collapsed ? "hidden" : "block"}`}>
              Operasional
            </p>

            <a
              href="#"
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold transition-all ${
                section === "dashboard"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Home className="w-4 h-4 shrink-0 text-emerald-600" />
              {!collapsed && <span>Beranda Agen</span>}
            </a>

            <a
              href="#"
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold transition-all ${
                section === "crm"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-emerald-600" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>CRM Leads</span>
                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px] font-mono font-bold">
                    6
                  </span>
                </div>
              )}
            </a>

            <a
              href="#"
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold transition-all ${
                section === "invoices"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0 text-emerald-600" />
              {!collapsed && <span>Invoices & Keuangan</span>}
            </a>

            <a
              href="#"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <ClipboardCheck className="w-4 h-4 shrink-0 text-muted-foreground" />
              {!collapsed && <span>Jadwal Survei</span>}
            </a>

            <a
              href="#"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-muted-foreground" />
              {!collapsed && <span>Laporan Penjualan</span>}
            </a>

            <Separator className="my-2" />

            <a
              href="#"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
              {!collapsed && <span>Ke Etalase Publik</span>}
            </a>
          </nav>

          {/* Sidebar Footer User Info */}
          <div className="p-3 border-t border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  BS
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">Budi Santoso</p>
                    <p className="text-[10px] text-muted-foreground truncate">budi@inland.id</p>
                  </div>
                )}
              </div>
              {!collapsed && (
                <button
                  onClick={onToggleMaskPhone}
                  className={`p-1.5 rounded-lg border transition ${
                    maskPhone
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  }`}
                  title={maskPhone ? "Kontak Disensor (Klik untuk buka)" : "Kontak Terbuka"}
                >
                  {maskPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* ─── 2. OPERATIONAL CANVAS & OPERATIONAL HEADER ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* OPERATIONAL HEADER */}
        <header className="h-14 border-b border-border/80 bg-card px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {deviceView === "mobile" && (
              <button className="p-1.5 rounded-lg border border-border text-muted-foreground">
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <span>PLMS</span>
                <span>/</span>
                <span>Operasional</span>
                <span>/</span>
                <span className="text-foreground font-bold capitalize">{section}</span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
                {section === "dashboard" && "Command Desk Agen"}
                {section === "crm" && "Pipeline Lead CRM"}
                {section === "invoices" && "Buku Tagihan & Komisi"}
              </h1>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2">
            {section === "crm" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleMaskPhone}
                className={`h-8 text-xs font-semibold gap-1.5 rounded-lg ${
                  maskPhone ? "border-amber-500/30 text-amber-600 bg-amber-500/10" : "border-emerald-500/30 text-emerald-600"
                }`}
              >
                {maskPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{maskPhone ? "Sensor Aktif" : "Buka Sensor"}</span>
              </Button>
            )}

            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Baru</span>
            </Button>
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* SECTION A: DASHBOARD VIEW */}
          {section === "dashboard" && (
            <div className="space-y-5">
              {/* 4-Column KPI Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Listing Aktif</p>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-foreground tabular-nums mt-2">24</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +3 minggu ini
                  </p>
                </Card>

                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prospek Hangat</p>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-foreground tabular-nums mt-2">12</p>
                  <p className="text-[11px] text-blue-600 font-semibold mt-0.5">6 perlu dihubungi</p>
                </Card>

                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Survei Terjadwal</p>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-foreground tabular-nums mt-2">5</p>
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">2 hari ini</p>
                </Card>

                <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Deal Won (Bln Ini)</p>
                    <div className="p-2 rounded-xl bg-[#0E2C24] text-[#E2B23B] border border-[#E2B23B]/30">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-foreground tabular-nums mt-2">Rp 128 Jt</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">3 transaksi lolos</p>
                </Card>
              </div>

              {/* Action Agenda Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900/15 via-emerald-800/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                      Prioritas Follow-up Hari Ini: Hendro Wijaya (Grand Wisata)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Klien sudah kualifikasi DP 20%; menjadwalkan survei lokasi sore ini pukul 16:00 WIB.
                    </p>
                  </div>
                </div>
                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shrink-0">
                  Kirim Pesan WhatsApp
                </Button>
              </div>

              {/* Quick Pipeline Preview Table */}
              <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Aktivitas Lead Terakhir
                  </CardTitle>
                  <span className="text-[11px] text-emerald-600 font-semibold cursor-pointer hover:underline">
                    Buka Pipeline Lengkap →
                  </span>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                      <tr>
                        <th className="py-2.5 px-4">Nama Klien</th>
                        <th className="py-2.5 px-4">Minat Properti</th>
                        <th className="py-2.5 px-4">Budget</th>
                        <th className="py-2.5 px-4">Tahapan CRM</th>
                        <th className="py-2.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {MOCK_LEADS.slice(0, 4).map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-foreground flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                              {lead.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="leading-tight">{lead.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">
                                {maskPhone ? "08xx-xxxx-xxxx" : lead.phone}
                              </p>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-muted-foreground">{lead.interest}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-foreground tabular-nums">{lead.budget}</td>
                          <td className="py-2.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {lead.stage.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-emerald-600 font-bold">
                              Rincian
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* SECTION B: CRM KANBAN VIEW */}
          {section === "crm" && (
            <div className="space-y-4">
              {/* Mobile Stage Selector Tabs (When viewed on small screen) */}
              {deviceView === "mobile" && (
                <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
                  {["new", "contacted", "qualified", "proposal", "negotiation", "won"].map((st) => (
                    <button
                      key={st}
                      onClick={() => onSelectMobileStage(st)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                        crmMobileStage === st
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Kanban Columns Grid */}
              <div className="flex items-start gap-3 overflow-x-auto pb-4">
                {[
                  { id: "new", label: "New Leads", color: "blue", dot: "bg-blue-500" },
                  { id: "contacted", label: "Contacted", color: "amber", dot: "bg-amber-500" },
                  { id: "qualified", label: "Qualified", color: "cyan", dot: "bg-cyan-500" },
                  { id: "negotiation", label: "Negotiation", color: "orange", dot: "bg-orange-500" },
                  { id: "won", label: "Won Deal", color: "emerald", dot: "bg-emerald-500" },
                ]
                  .filter((col) => (deviceView === "mobile" ? col.id === crmMobileStage : true))
                  .map((col) => {
                    const colLeads = MOCK_LEADS.filter((l) => l.stage === col.id);
                    return (
                      <div
                        key={col.id}
                        className="w-full sm:w-64 shrink-0 rounded-xl border border-border/80 bg-card/60 p-2.5 space-y-2.5 min-h-[480px]"
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-1 pb-1.5 border-b border-border/60">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                            <span className="text-xs font-bold text-foreground">{col.label}</span>
                          </div>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                            {colLeads.length}
                          </span>
                        </div>

                        {/* Column Cards */}
                        <div className="space-y-2">
                          {colLeads.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground/60 text-xs border border-dashed rounded-lg">
                              Kosong
                            </div>
                          ) : (
                            colLeads.map((card) => (
                              <Card
                                key={card.id}
                                className="rounded-xl border border-border/80 shadow-2xs hover:border-emerald-500/50 hover:shadow-sm transition-all p-3 space-y-2 bg-card cursor-grab"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-foreground">{card.name}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{card.time}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">{card.interest}</p>
                                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                  <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                                    {card.budget}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {maskPhone ? "08xx-xxxx" : card.phone.slice(0, 8) + "..."}
                                  </span>
                                </div>
                              </Card>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SECTION C: INVOICES TABLE VIEW */}
          {section === "invoices" && (
            <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Cari no invoice, klien..." className="pl-8 h-8 text-xs rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg">
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                    <tr>
                      <th className="py-2.5 px-4">No Invoice</th>
                      <th className="py-2.5 px-4">Klien & Properti</th>
                      <th className="py-2.5 px-4">Jenis Tagihan</th>
                      <th className="py-2.5 px-4">Nominal</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {MOCK_INVOICES.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-foreground">{inv.id}</td>
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-foreground">{inv.client}</p>
                          <p className="text-[11px] text-muted-foreground">{inv.property}</p>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground font-medium">{inv.type}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-foreground tabular-nums">
                          {formatIDR(inv.amount)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              inv.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : inv.status === "sent"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                : inv.status === "overdue"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : "bg-slate-500/10 text-slate-700 border-slate-500/20"
                            }`}
                          >
                            {inv.status === "paid" && "LUNAS"}
                            {inv.status === "sent" && "TERKIRIM"}
                            {inv.status === "overdue" && "JATUH TEMPO"}
                            {inv.status === "draft" && "DRAFT"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-emerald-600 font-bold">
                            Cetak
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROTOTYPE B — PUBLIC PROPERTY DISCOVERY
// ============================================================================

function PrototypeB_StorefrontDiscovery({ deviceView }: { deviceView: "desktop" | "mobile" }) {
  const [filterType, setFilterType] = useState("all");

  return (
    <div className="flex flex-col min-h-[820px] bg-background">
      {/* ─── 1. PUBLIC TOP CONSUMER NAVBAR ─── */}
      <header className="h-16 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0E2C24] border border-[#E2B23B]/40 flex items-center justify-center font-black text-sm text-[#E2B23B] shadow-xs">
              IP
            </div>
            <div className="leading-none">
              <span className="text-base sm:text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                Inland
              </span>{" "}
              <span className="text-base sm:text-lg font-black tracking-tight text-foreground">Property</span>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          {deviceView === "desktop" && (
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-muted-foreground">
              <a href="#" className="text-foreground hover:text-emerald-600 transition">
                Beranda
              </a>
              <a href="#" className="text-emerald-600 font-bold">
                Katalog Properti
              </a>
              <a href="#" className="hover:text-emerald-600 transition">
                Simulasi KPR
              </a>
              <a href="#" className="hover:text-emerald-600 transition">
                Survei Lokasi
              </a>
              <a href="#" className="hover:text-emerald-600 transition">
                Titip Properti
              </a>
            </nav>
          )}
        </div>

        {/* Action Header Items */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
          >
            Masuk Akun
          </Button>
        </div>
      </header>

      {/* ─── 2. PAGEHEADER DISCOVERY HERO ─── */}
      <div className="p-4 sm:p-6 pb-2">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0E2C24] to-slate-950 p-6 sm:p-10 text-white shadow-lg border border-[#E2B23B]/20">
          {/* Subtle gold brand accent hairline */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E2B23B] via-emerald-400 to-[#E2B23B]" />

          <div className="max-w-2xl space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#E2B23B]/20 text-[#E2B23B] border border-[#E2B23B]/30">
              <Sparkles className="w-3 h-3" /> Hunian & Aset Properti Terverifikasi
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Temukan Rumah Idaman di Lokasi Terbaik
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-lg">
              Listing resmi Inland Property dengan legalitas SHM terjamin, dukungan simulasi KPR transparan, dan pendampingan agen berlisensi.
            </p>
          </div>

          {/* Search Toolbar */}
          <div className="mt-6 p-2 rounded-2xl bg-background/95 backdrop-blur-md border border-border shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari lokasi, kawasan, kode IP..."
                className="pl-9 h-10 text-xs rounded-xl border-none bg-muted/30 text-foreground"
              />
            </div>
            <div className="flex items-center">
              <select className="w-full h-10 px-3 text-xs rounded-xl border-none bg-muted/30 text-foreground font-medium outline-none">
                <option>Semua Tipe Properti</option>
                <option>Rumah Tinggal</option>
                <option>Villa Mewah</option>
                <option>Apartemen</option>
                <option>Ruko Komersial</option>
              </select>
            </div>
            <Button className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
              Cari Properti
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 3. PROPERTY CATALOG GRID WITH CANONICAL CARDS ─── */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Rekomendasi Properti Terbaru</h2>
            <p className="text-xs text-muted-foreground">Menampilkan 4 dari 48 properti tersedia</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterType === "all" ? "bg-card text-emerald-600 shadow-2xs font-bold" : "text-muted-foreground"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("sale")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterType === "sale" ? "bg-card text-emerald-600 shadow-2xs font-bold" : "text-muted-foreground"
              }`}
            >
              Dijual
            </button>
            <button
              onClick={() => setFilterType("rent")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterType === "rent" ? "bg-card text-emerald-600 shadow-2xs font-bold" : "text-muted-foreground"
              }`}
            >
              Disewa
            </button>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {MOCK_PROPERTIES.map((prop) => (
            <Card
              key={prop.id}
              className="rounded-2xl border border-border/80 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-300 overflow-hidden bg-card group cursor-pointer flex flex-col"
            >
              {/* Media Header (16:9) with Watermark Overlay */}
              <div className="relative aspect-[16/9] w-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                <img
                  src={prop.image_url}
                  alt={prop.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Central Simulated Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="px-3 py-1 bg-black/40 backdrop-blur-xs rounded-full border border-white/20 text-white/80 font-black text-[9px] tracking-widest uppercase">
                    INLAND PROPERTY
                  </div>
                </div>

                {/* Top-Left Listing Type Pill */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white shadow-xs ${
                      prop.listing_type === "sale" ? "bg-emerald-600" : "bg-blue-600"
                    }`}
                  >
                    {prop.listing_type === "sale" ? "DIJUAL" : "DISEWA"}
                  </span>
                </div>

                {/* Bottom-Right Monospace Listing Code */}
                <div className="absolute bottom-2 right-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-900/80 backdrop-blur-sm text-slate-100 border border-white/10">
                    {prop.listing_code}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                  {/* Bold IDR Rupiah Price */}
                  <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatIDR(prop.price)}
                  </p>
                  {/* Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors mt-0.5">
                    {prop.title}
                  </h3>
                  {/* Location with MapPin */}
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>
                      {prop.address.district}, {prop.address.city}
                    </span>
                  </p>
                </div>

                {/* Unified Specs Row */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1 font-semibold text-[11px]">
                    <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{prop.specs.bedrooms} KT</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[11px]">
                    <Bath className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{prop.specs.bathrooms} KM</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{prop.specs.building_area}m²</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[11px]">
                    <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{prop.specs.land_area}m²</span>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── 4. CORPORATE INSTITUTIONAL FOOTER ─── */}
      <footer className="mt-auto bg-[#0E2C24] text-white border-t border-[#E2B23B]/30 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E2B23B] text-[#0E2C24] font-black text-base flex items-center justify-center shadow-md">
              IP
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight">
                <span className="text-[#E2B23B]">Inland</span> Property
              </p>
              <p className="text-[11px] text-slate-300">Property Listing & CRM Management System</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            © 2026 PT Inland Properti Utama. Hak cipta dilindungi undang-undang.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// PROTOTYPE C — PROPERTY DETAIL EXPERIENCE
// ============================================================================

function PrototypeC_PropertyDetail({ deviceView }: { deviceView: "desktop" | "mobile" }) {
  const prop = MOCK_PROPERTIES[0]; // Grand Wisata

  return (
    <div className="flex flex-col min-h-[820px] bg-background">
      {/* ─── BREADCRUMB & HEADER BAR ─── */}
      <div className="h-12 border-b border-border/80 px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground bg-card">
        <div className="flex items-center gap-2 truncate">
          <Link href="#" className="hover:text-emerald-600">
            Katalog
          </Link>
          <span>/</span>
          <span>Bekasi</span>
          <span>/</span>
          <span className="text-foreground font-bold truncate">{prop.title}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-muted text-muted-foreground shrink-0">
          {prop.listing_code}
        </span>
      </div>

      {/* ─── TWO-COLUMN DETAIL VIEW ─── */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* LEFT 2 COLUMNS: MEDIA & SPECS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary 16:9 Watermarked Gallery */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md bg-slate-900 border border-border">
              <img src={prop.image_url} alt={prop.title} className="w-full h-full object-cover" />
              {/* Central Watermark Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="px-4 py-1.5 bg-black/45 backdrop-blur-xs rounded-full border border-white/25 text-white/90 font-black text-xs tracking-widest uppercase shadow-lg">
                  INLAND PROPERTY
                </div>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-950/80 backdrop-blur-md text-white border border-white/10">
                  {prop.listing_code}
                </span>
              </div>
            </div>

            {/* Title & Valuation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white">
                  DIJUAL
                </span>
                <span className="text-xs font-semibold text-muted-foreground">SHM • Rumah Cluster</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
                {prop.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                Grand Wisata Boulevard, Tambun Selatan, Bekasi, Jawa Barat
              </p>
              <div className="pt-2">
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatIDR(prop.price)}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Estimasi cicilan KPR: <span className="font-bold text-foreground">Rp 12,4 Jt/bulan</span> (DP 20%, 15 Thn)
                </p>
              </div>
            </div>

            <Separator />

            {/* Specifications 4-Column Canonical Grid */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Spesifikasi Utama Properti</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Bed className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Kamar Tidur</p>
                    <p className="text-xs font-bold text-foreground">{prop.specs.bedrooms} Kamar</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Bath className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Kamar Mandi</p>
                    <p className="text-xs font-bold text-foreground">{prop.specs.bathrooms} Kamar</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Luas Bangunan</p>
                    <p className="text-xs font-bold text-foreground">{prop.specs.building_area} m²</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Luas Tanah</p>
                    <p className="text-xs font-bold text-foreground">{prop.specs.land_area} m²</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Block */}
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Deskripsi Properti</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Rumah siap huni dengan pencahayaan alami optimal di cluster premium Grand Wisata. Lokasi bebas banjir, 5 menit ke gerbang tol Jakarta-Cikampek, dekat sekolah internasional dan pusat kuliner. Keamanan 24 jam dengan sistem one-gate dan CCTV lingkungan.
              </p>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: STICKY AGENT & INQUIRY CARD */}
          <div className="space-y-4">
            <Card className="rounded-2xl border border-border/80 shadow-md p-4 sm:p-5 bg-card space-y-4 sticky top-20">
              {/* Agent Profile Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                  BS
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground truncate">Budi Santoso</h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Certified Inland Property Agent</p>
                  <p className="text-[10px] font-mono text-emerald-600 font-semibold">Lisensi: AREBI-2024-991</p>
                </div>
              </div>

              <Separator />

              {/* Primary Call-to-Actions */}
              <div className="space-y-2">
                <Button className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md gap-2">
                  <MessageCircle className="w-4 h-4" /> Hubungi via WhatsApp
                </Button>
                <Button variant="outline" className="w-full h-10 text-xs font-semibold rounded-xl gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Jadwalkan Survei Lokasi
                </Button>
              </div>

              {/* KPR Simulator Teaser Card */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600" /> Simulasi KPR Mandiri
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold cursor-pointer">Ubah</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Uang Muka (DP 20%)</span>
                  <span className="font-mono font-bold text-foreground">Rp 370.000.000</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Jangka Waktu</span>
                  <span className="font-bold text-foreground">15 Tahun (180 Bln)</span>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Cicilan per Bulan</span>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                    Rp 12.450.000
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
