# INLAND PROPERTY / PLMS — DESIGN SYSTEM V2 SPECIFICATION
## The Canonical Design Contract & Implementation Blueprint

> **Status:** Ratified Design Architecture Contract  
> **Release Version:** 2.0.0-draft  
> **Date:** September 2026  
> **Target Audience:** Frontend Architects, Product Designers, and AI Coding Assistants  
> **Foundational Precedents:** [`INLAND_PROJECT_CONTEXT.md`](file:///d:/Workspace/plms/INLAND_PROJECT_CONTEXT.md), [`INLAND_DESIGN_SYSTEM.md`](file:///d:/Workspace/plms/INLAND_DESIGN_SYSTEM.md), and Strategic Grilling Rounds 1–3  
> **Core Architectural Axiom:**  
> *"One coherent Inland Property design language with intentional contextual expressions, never forced uniformity."*

---

## 1. DESIGN PHILOSOPHY & DUAL-PERSONALITY ARCHITECTURE

### 1.1 The Core Identity
Inland Property is a hybrid platform: an institutional Indonesian real-estate catalog coupled with an operational brokerage enterprise management system. It rejects the dichotomy between "flashy consumer portal" and "sterile back-office spreadsheet." Instead, it executes a **Dual-Personality Architecture** bound by a shared brand DNA.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                INLAND PROPERTY ECOSYSTEM                                │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ 1. THE PUBLIC STOREFRONT                  │ 2. THE OPERATIONAL ERP                     │
│    (Buyer, Client, Guest, Investor)       │    (Agent, Marketing, Admin, Executive)    │
│ • Context : Discovery, Evaluation, Trust  │ • Context : Execution, Velocity, Control   │
│ • Density : Spacious, Editorial, Breathing│ • Density : High-Density, Data-Dense       │
│ • Sizing  : Tier 1 Universal (h-10 / 40px)│ • Sizing  : Tier 2 Compact (h-8 / 32px)    │
│ • Nav     : Consumer Header + Quick Links │ • Nav     : Persistent Collapsible Sidebar │
│ • Header  : PageHeader (Architectural Hero│ • Header  : OperationalHeader (Breadcrumbs │
│             Texture & Search Popover)     │             & Live Action Toolbars)        │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│ 3. SHARED BRAND DNA (The Invariant Anchor)                                             │
│ • Corporate Prestige : Forest Green #0E2C24 + Warm Gold #E2B23B                        │
│ • Action Layer       : High-contrast Emerald #059669 (Light) / #10b981 (Dark)          │
│ • Typography Stack   : Inter with Tabular Figures on all Financial / Property Metrics   │
│ • Surface Treatment  : Subtle Hairline Borders (border-border/80) & Minimal Elevation  │
│ • Property Integrity : 16:9 Photography with Center Watermark Protection               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Invariant Constants vs. Contextual Variants

| Dimension | Invariant Constants (Global Contract) | Contextual UI Variants (Allowed Discretion) |
|---|---|---|
| **Brand Colors** | Corporate Green (`#0E2C24`), Warm Gold (`#E2B23B`), UI Emerald (`#059669`). | Opacity levels (`bg-emerald-500/10` vs `bg-emerald-600`); subtle tints. |
| **Typography** | `Inter` font family, font weight distribution, tabular numbers (`tabular-nums`) on currency. | Root scale: `100%` (Storefront) vs `87.5%` (`compact-mode` in ERP tables). |
| **Radius Scale** | 5-tier mathematical curve: 6px (`md`), 8px (`lg`), 12px (`xl`), 16px (`2xl`), 24px (`3xl`). | Specific tier assignment based on container role (Chips = 6px; Cards = 16px). |
| **Property Aspect** | `16:9` strictly enforced for primary listing photography. | Thumbnail footprint size (`w-full` card vs `w-20` compact horizontal row). |
| **Touch Safety** | 44px minimum touch target on mobile viewports. | Desktop density contracting to 32px (`h-8`) in tables/Kanban. |

### 1.3 Strict Prohibitions (Anti-Rules)
* **Never** render arbitrary multi-accent UI colors (Sapphire Blue and Royal Purple theme switches are formally retired).
* **Never** display property photography without routing through `WatermarkedImage`.
* **Never** use full photo hero banners on operational pages (`/crm`, `/invoices`, `/admin/*`).
* **Never** force high-density ERP controls (`h-8`) onto public inquiry forms or auth modals.
* **Never** display unformatted numbers for listing prices or currency values.

---

## 2. BRAND ARCHITECTURE & COLOR HIERARCHY

Inland Property enforces a disciplined, three-tier color architecture that separates institutional prestige from interactive affordance and semantic telemetry.

```text
TIER 1: THE INSTITUTIONAL LAYER (Prestigious Brand Anchor)
  • Corporate Forest Green : #0E2C24 (Locked footer, invoice letterheads, legal docs)
  • Corporate Warm Gold    : #E2B23B (Gold dividers, brand wordmark accent, certified badges)
  * Usage: Strictly framing elements. NEVER used as a generic button background.

TIER 2: THE INTERACTIVE ACTION LAYER (Affordance & Energy)
  • Primary Emerald (Light): #059669 (Buttons, active tabs, focus rings, primary CTAs)
  • Primary Emerald (Dark) : #10b981 (High-contrast action color in dark mode)
  • Emerald Surface Tint   : bg-emerald-500/10 border-emerald-500/20 (Selected chips, active pills)
  * Usage: Direct interactive commitments (Submit, Buy, Contact, Schedule, Save).

TIER 3: THE SEMANTIC TELEMETRY LAYER (Pure System State)
  • Success / Closed / Verified : Emerald (#10b981)   → Deal Won, Lunas, Completed
  • Notice / Review / Contacted : Amber   (#f59e0b)   → Contacted, Peninjauan, Pending
  • In-Progress / Scheduled     : Blue    (#3b82f6)   → Terjadwal, Sewa, New Lead
  • Negotiation / Action Needed : Orange  (#f97316)   → Negosiasi, Proposal
  • Danger / Lost / Canceled    : Rose    (#f43f5e)   → Lost Lead, Dibatalkan, Overdue
  • Inactive / Draft / Closed   : Slate   (#64748b)   → Draf Internal, Arsip, Batal
  * Usage: Badges, status dots, metric indicators. NEVER repurposed as decorative branding.
```

### 2.1 Color Matrix & Allowed Boundaries

| Color Token | Hex Code (Light / Dark) | Allowed Placement | Prohibited Placement |
|---|---|---|---|
| **Corporate Green** | `#0E2C24` / `#0A1E18` | `SiteFooter`, legal document headers, official invoice PDF/print headers, luxury dark cards. | Interactive form buttons, table text, generic icons. |
| **Corporate Gold** | `#E2B23B` / `#F3C558` | Brand wordmark ("Inland"), hairline divider accents, verified agency badges. | Body text, background fills of large cards. |
| **Action Emerald** | `#059669` / `#10b981` | Primary buttons, active tab indicators, link hover states, price values, active radio/checkbox fills. | Error states, static table headers, permanent footers. |
| **Semantic Blue** | `#2563eb` / `#3b82f6` | "SEWA" badges, survey appointment tags, new lead indicators. | Primary UI buttons (retire blue theme). |
| **Semantic Amber** | `#d97706` / `#f59e0b` | "Peninjauan" badges, contact mode warnings, agent lock indicators. | Standard submit buttons, decorative borders. |
| **Semantic Rose** | `#e11d48` / `#f43f5e` | "Lost" deal tags, delete confirmation buttons, form validation error texts. | Standard secondary buttons, neutral tags. |

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Type Engine & Root Scale
* **Font Family:** `Inter` (`next/font/google`), loaded with Latin subsets.
* **Fallback Stack:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
* **Tabular Figure Mandate:** All financial prices, KPR monthly installments, dates, listing codes, and table metrics **MUST** use `tabular-nums` (`font-variant-numeric: tabular-nums;`).

### 3.2 Typography Scale & Hierarchical Roles

| Role | Class (Desktop) | Class (Mobile) | Weight | Line Height | Tracking | Context / Placement |
|---|---|---|:---:|:---:|:---:|---|
| **Hero Title** | `text-3xl lg:text-4xl` | `text-2xl` | 800 (Extrabold) | `leading-tight` | `-0.025em` | `PageHeader` storefront discovery banner. |
| **Operational Title** | `text-xl lg:text-2xl` | `text-lg` | 700 (Bold) | `leading-snug` | `-0.02em` | `OperationalHeader` in CRM, Invoices, Admin. |
| **Section Title** | `text-lg lg:text-xl` | `text-base` | 700 (Bold) | `leading-normal` | `-0.015em` | Featured property carousels, wizard steps. |
| **Card Title (Standard)**| `text-sm lg:text-base` | `text-sm` | 600 (Semibold) | `leading-snug` | `normal` | `PropertyCard` listing title, modal titles. |
| **Listing Price** | `text-2xl lg:text-3xl` | `text-xl` | 900 (Black) | `leading-none` | `-0.02em` | Main property price (`text-emerald-600`). |
| **Card Price** | `text-base lg:text-lg` | `text-base` | 800 (Extrabold) | `leading-tight` | `-0.015em` | Property card price chip in catalog/dashboard. |
| **KPI Metric Value** | `text-2xl lg:text-3xl` | `text-xl` | 900 (Black) | `leading-none` | `-0.025em` | Dashboard & Admin stats grid metrics. |
| **Body (Default)** | `text-sm` | `text-sm` | 400 (Regular) | `leading-relaxed`| `normal` | Descriptions, modal bodies, legal articles. |
| **Form Label** | `text-xs` | `text-xs` | 700 (Bold) | `leading-none` | `normal` | Form input labels (`text-foreground`). |
| **Dense Table Cell** | `text-xs` | `text-xs` | 400 / 500 | `leading-tight` | `normal` | Invoices table, CRM lead table rows. |
| **Specification Chip**| `text-xs` | `text-[11px]` | 600 (Semibold) | `leading-none` | `normal` | Specs summary (`3 KT`, `2 KM`, `LB 120m²`). |
| **Listing Code Pill** | `text-[10px]` | `text-[9px]` | 500 (Medium) | `leading-none` | `0.05em` | Monospace code badge (`IP-00012401`). |

---

## 4. SPACING & DENSITY ARCHITECTURE

Inland Property resolves spacing tension by codifying a **Density Tiering System**. Components do not pick spacing arbitrarily; they inherit their density tier from the page context.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DENSITY TIERING SCALE                              │
├─────────┬──────────────┬──────────────┬─────────────┬───────────────────────────┤
│ Tier    │ Control Ht   │ Padding X/Y  │ Gap Space   │ Context / Surface         │
├─────────┼──────────────┼──────────────┼─────────────┼───────────────────────────┤
│ Tier 1  │ h-10 (40px)  │ px-3.5 py-2  │ gap-4       │ Storefront CTAs, All Form │
│ Standard│              │              │ space-y-4   │ Inputs, Modals, Auth.     │
├─────────┼──────────────┼──────────────┼─────────────┼───────────────────────────┤
│ Tier 2  │ h-8 (32px)   │ px-2.5 py-1  │ gap-2       │ ERP Tables, Kanban Bars,  │
│ Compact │              │              │ space-y-2   │ Filter Strips, Dense ERP. │
├─────────┼──────────────┼──────────────┼─────────────┼───────────────────────────┤
│ Tier 3  │ h-6 (24px)   │ px-2 py-0.5  │ gap-1.5     │ Micro-badges, Table Mini  │
│ Micro   │              │              │             │ Actions, Tag Filters.     │
├─────────┼──────────────┼──────────────┼─────────────┼───────────────────────────┤
│ Mobile  │ min-h-[44px] │ px-4 py-2.5  │ gap-3       │ Touch Targets on Mobile   │
│ Touch   │              │              │             │ (< 768px Viewports).      │
└─────────┴──────────────┴──────────────┴─────────────┴───────────────────────────┘
```

### 4.1 Surface Rationale Matrix
* **Why Tier 1 (40px) for Forms?** Forms require cognitive comfort and touch target precision. When users fill in property specifications, client budgets, or legal addresses, 32px inputs cause misclicks and feel claustrophobic.
* **Why Tier 2 (32px) for ERP Tables & Kanban?** In back-office deal tracking, maximizing vertical data density is paramount. Agents must scan 15–20 leads or properties simultaneously without excessive page scrolling.

---

## 5. RADIUS & SURFACE GRAMMAR

Inland Property avoids arbitrary corner rounding by binding every component to a **5-Tier Geometric Scale**:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            5-TIER RADIUS SYSTEM                                 │
├───────────────┬───────────────┬──────────────────────┬──────────────────────────┤
│ Radius Token  │ Tailwind Class│ Absolute Value       │ Assigned Components      │
├───────────────┼───────────────┼──────────────────────┼──────────────────────────┤
│ Micro         │ rounded-md    │ 6px                  │ Metadata Chips, Tooltips,│
│               │               │                      │ Checkboxes, Table Cells. │
├───────────────┼───────────────┼──────────────────────┼──────────────────────────┤
│ Base Compact  │ rounded-lg    │ 8px                  │ Tier 2 Dense Buttons,    │
│               │               │                      │ Dropdowns, Table Search. │
├───────────────┼───────────────┼──────────────────────┼──────────────────────────┤
│ Standard UI   │ rounded-xl    │ 12px                 │ Tier 1 Form Inputs,      │
│               │               │                      │ Dialogs, Popover Menus.  │
├───────────────┼───────────────┼──────────────────────┼──────────────────────────┤
│ Feature Card  │ rounded-2xl   │ 16px                 │ PropertyCard, KPI Cards, │
│               │               │                      │ Stepper Items, Invoices. │
├───────────────┼───────────────┼──────────────────────┼──────────────────────────┤
│ Hero Shell    │ rounded-3xl   │ 24px (1.5rem)        │ PageHeader Hero Banner,  │
│               │               │                      │ Auth Glass Cards.        │
├───────────────┼───────────────┼──────────────────────┼──────────────────────────┤
│ Pill Element  │ rounded-full  │ 9999px               │ Status Badges, Avatars,  │
│               │               │                      │ Active Nav Indicators.   │
└───────────────┴───────────────┴──────────────────────┴──────────────────────────┘
```

### 5.1 Elevation & Surface Layers
Inland Property is an architectural, border-first design system. Surfaces achieve depth through **tonal borders and contrast**, reserving heavy shadows exclusively for floating viewports.

1. **Layer 0 (Canvas Base):** `bg-background` (`#ffffff` Light / `#0f172a` Dark).
2. **Layer 1 (Card & Content Panel):** `bg-card` with `border border-border/80` and `shadow-xs`. On hover: `hover:border-emerald-500/40 hover:shadow-md transition-all duration-300`.
3. **Layer 2 (Elevated Popovers & Modals):** `bg-popover` with `border border-border` and `shadow-lg`.
4. **Layer 3 (Floating Overlays):** `BottomNav` (`z-50 shadow-lg backdrop-blur-lg`), `Sheet` navigation drawer (`shadow-2xl`), `AIChatWidget` (`shadow-2xl backdrop-blur-xl`).

---

## 6. PROPERTY ENTITY DESIGN LANGUAGE (CANONICAL)

The property entity is the core currency of Inland Property. A client or agent must immediately recognize the property entity across every transition of its journey:

```text
Storefront Catalog ──► Property Detail ──► Lead Inquiry ──► CRM Deal ──► Invoice Receipt
      (16:9)                 (Hero)             (Modal)         (Token)         (Row)
```

### 6.1 Invariant Property Visual Elements
Regardless of where a property is rendered, the following **7 Invariants** never change:
1. **Visual Media Aspect Ratio:** `16:9` ratio on primary card media with center-overlaid watermark.
2. **Listing Code Anchor:** Monospace listing code formatted as `IP-XXXXXXYY` rendered in a subtle muted chip.
3. **Price Typography:** Formatted via `formatKprCurrency()` with `tabular-nums` in bold Emerald.
4. **Listing Type Pill:** Top-left badge: `SEWA` (`bg-blue-600 text-white`) or `DIJUAL` (`bg-emerald-600 text-white`).
5. **Specification Icons:** Unified canonical icons (`Bed`, `Bath`, `Building2`, `Maximize2`).
6. **Location Anchor:** `MapPin` icon paired with `District, City` string.
7. **Title Handling:** Strict line clamp (1 line on cards, 2 lines in summaries) with hover color shift to Emerald.

### 6.2 The Polymorphic Property Component Architecture

```text
PropertyCard (Polymorphic Master Primitive)
├── variant="catalog"    (Public Property Catalog on /properties)
├── variant="dashboard"  (Curated Featured / Latest Carousels on /dashboard)
├── variant="manage"     (Staff Inventory Management on /properties with Admin Actions)
└── variant="compact"    (Horizontal Row for Tables, CRM Deal Cards, and Invoice Selectors)
```

#### Detailed Variant Specification Matrix

| Variant Name | Target Surface | Aspect Ratio | Visible Slots & Information | Interaction & Action Model |
|---|---|:---:|---|---|
| **`catalog`** | `/properties` (Storefront Search) | `16:9` | Photo + Badges -> Bold Price -> Title + Location -> Specs Row (`KT`, `KM`, `LB`, `LT`). | Entire card is a clean click target to `/properties/[id]`. No distracting inline buttons. |
| **`dashboard`** | `/dashboard` (Featured Carousel) | `16:9` | Photo + Badges -> Bold Price -> Title + Location -> Specs Row + **Assigned Agent Avatar Footer**. | Card navigates to detail. Shows agent photo & verified check to build customer trust. |
| **`manage`** | `/properties` (Agent/Admin Mode) | `16:9` | Photo + Badges -> Bold Price -> Title + Location -> Specs Row + **Status Badge + 3-Dots Action Menu**. | Action menu exposes Edit, Duplicate, Change Status, and Delete dialogs. |
| **`compact`** | `/crm`, `/invoices`, Search Modals | Horizontal `16:9` thumbnail (`w-24`) | Thumbnail left -> Title, Listing Code, Location middle -> Status Badge & Price right. | Compact row click selects property or links to internal listing preview. |

---

## 7. ICONOGRAPHY SYSTEM

### 7.1 Specifications Icon Normalization `[CONFIRMED]`
Inland Property strictly normalizes all property structural attributes to single, canonical Lucide icons:

```text
Canonical Specification Mappings:
  • Bedrooms (Kamar Tidur)     → Bed         (KT)  [Retires BedDouble]
  • Bathrooms (Kamar Mandi)    → Bath        (KM)
  • Building Area (Luas Bgn)   → Building2   (LB)
  • Land Area (Luas Tanah)     → Maximize2   (LT)  [Retires Maximize, BoxSelect]
  • Electricity (Daya Listrik) → Zap         (VA)
  • Certificate (Legalitas)    → FileCheck   (SHM/HGB)
  • Carport / Garage           → Car         (Mobil)
  • Floors (Jumlah Lantai)     → Layers      (Lantai)
  • Facing (Arah Hadap)        → Compass     (Utara/Selatan)
  • Furnishing (Kondisi)       → Armchair    (Furnished)
```

### 7.2 Functional Icon Rules
* **Standard Stroke Widths:**
  * Inactive / Default Navigation: `stroke-[1.75]`
  * Standard Functional Icons: `stroke-[2]`
  * Active Bottom Nav & Completed Checks: `stroke-[2.5]`
* **Icon Box Containers:** Standalone KPI or feature icons live inside a `p-2.5` to `p-3` container with `rounded-xl` or `rounded-2xl` matching the theme tint.

---

## 8. COMPONENT GRAMMAR SPECIFICATIONS

### 8.1 Button Visual Contract (`components/ui/button.tsx`)
* **Base Classes:** `inline-flex items-center justify-center font-semibold transition-all select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 active:translate-y-px`.
* **Variants:**
  * `default`: `bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`.
  * `outline`: `border border-border bg-background hover:bg-muted text-foreground`.
  * `secondary`: `bg-secondary text-secondary-foreground hover:bg-secondary/80`.
  * `ghost`: `hover:bg-muted text-foreground`.
  * `destructive`: `bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20`.
* **Sizes:**
  * `default`: `h-10 px-4 rounded-xl text-xs sm:text-sm` (Universal Tier 1).
  * `sm`: `h-8 px-3 rounded-lg text-xs` (Compact Tier 2).
  * `xs`: `h-6 px-2 rounded-md text-[11px]` (Micro Tier 3).
  * `icon`: `size-10 rounded-xl` (Tier 1 icon button); `icon-sm`: `size-8 rounded-lg` (Tier 2).

### 8.2 Input & Textarea Contract (`components/ui/input.tsx`, `textarea.tsx`)
* **Default Input:** `h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base md:text-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground`.
* **Compact Input:** `size="sm"` -> `h-8 rounded-lg px-2.5 text-xs`.
* **Textarea:** `min-h-20 w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed field-sizing-content`.

### 8.3 Badge Visual Contract (`components/ui/badge.tsx`)
* **Status Pill (Lifecycle):** `rounded-full px-2.5 py-0.5 text-xs font-semibold border flex items-center gap-1.5` with translucent background (e.g. `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`).
* **Metadata Chip (Technical):** `rounded-md px-2 py-0.5 text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border/80`.

---

## 9. PAGE GRAMMAR & LAYOUT PATTERNS

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PUBLIC DISCOVERY PAGES (/dashboard, /properties, /kpr-calculator)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • Navigation : Top Consumer Navbar with Quick Access Pills                      │
│ • Header     : PageHeader with /bg-header.webp & Search Popovers                │
│ • Container  : max-w-7xl mx-auto px-4 sm:px-6 lg:px-8                          │
│ • Footer     : Full-bleed SiteFooter in Locked Forest Green #0E2C24             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ INTERNAL OPERATIONAL ERP PAGES (/crm, /invoices, /projects, /admin/*)          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • Navigation : Persistent Collapsible Left Sidebar (Expanded w-64, Icon w-16)   │
│ • Header     : OperationalHeader with Breadcrumbs, Live Title, and Action Buttons│
│ • Container  : Fluid Full-Width Container (w-full px-4 md:px-6)                 │
│ • Spacing    : High-Density Tier 2 Spacing; Optimized for 1080p Desktop Scans  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. NAVIGATION ARCHITECTURE

### 10.1 Role-Aware Desktop Navigation Matrix

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Unauthenticated Guest / Registered Viewer:                                      │
│ [Top Navbar: Brand | Properti | KPR | Survei | Kontak | ─────────► [Login] ]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Authenticated Staff (Agent, Marketing, Admin, Super Admin):                     │
│ [Collapsed/Expanded Sidebar]  │ [Top Bar: Breadcrumbs | Live Clock | User Bell] │
│  ├── Beranda                  │                                                 │
│  ├── Direktori Properti       │ [Operational Content Canvas]                    │
│  ├── CRM Pipeline (Kanban)    │                                                 │
│  ├── Prospek (Leads Table)    │                                                 │
│  ├── Jadwal Follow-up         │                                                 │
│  ├── Invoice & Keuangan       │                                                 │
│  ├── Proyek Konstruksi        │                                                 │
│  ├── Laporan & Analytics      │                                                 │
│  └── Pengaturan & Akun        │                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Mobile Navigation Standard
* **Fixed Bottom Bar:** `BottomNav` stays pinned to bottom viewport (`h-15 z-50 bg-card/90 backdrop-blur-lg border-t pb-[env(safe-area-inset-bottom)]`).
* **Clearance Mandate:** All page content containers must preserve `pb-28 sm:pb-24 md:pb-6` to guarantee bottom CTAs are never occluded.

---

## 11. DASHBOARD ARCHITECTURE RESOLUTION

To eliminate the current ambiguity where `/dashboard` mixes public hero banners with admin stats:
1. **Guest & Viewer Session:** `/dashboard` renders `ViewerDashboardView`: Hero `PageHeader` search banner -> Featured properties carousel -> Interactive KPR Simulator card -> Latest properties -> Public footer.
2. **Staff Session (Agent & Admin):** `/dashboard` renders `OperationalDashboardView`: `OperationalHeader` with personalized greeting badge -> 4-Column KPI Stats Grid (`AdminStatsGrid` / `AgentStatsGrid`) -> AI Executive Brief button -> Overdue follow-up alert card -> Active pipeline quick links -> Recent CRM Leads table.

---

## 12. CRM & ERP DENSITY SPECIFICATIONS

* **Kanban Columns:** Desktop columns enforce `md:w-[260px] shrink-0 rounded-xl border p-2.5 bg-card/60`.
* **Mobile Kanban:** Single active column with horizontal edge-swiping gestures between stage tabs.
* **Phone Masking Protocol:** Non-admin agents see `"08xx-xxxx-xxxx"` in list views, with an explicit "Mode Agen (Kontak Disensor)" indicator. Unmasked phone numbers only appear inside the verified lead detail drawer.

---

## 13. RESPONSIVE DESIGN SPECIFICATIONS

* **Mobile (< 768px):** Single-column stacks, full-width inputs, sticky bottom submit bars, swipeable Kanban stages, 44px minimum touch targets.
* **Tablet (768px – 1024px):** Two-column property grids, touch-scrolling Kanban swimlanes.
* **Desktop (>= 1024px):** 3- and 4-column property grids, sticky right-rail on detail views (`sticky top-6`), persistent collapsible ERP sidebar.

---

## 14. DARK MODE SPECIFICATIONS

* **Tonal Hierarchy:**
  * Background: `#0f172a` (Slate-900)
  * Elevated Card Surface: `#1e293b` (Slate-800) with `border-border/80` (`#334155`)
  * Text Contrast: Primary `#f1f5f9`, Muted `#94a3b8`
* **Jewel-Box Luxury Dark Mode (Corporate):**
  * `SiteFooter` and official cards maintain deep `#0E2C24` anchored with luminous `#E2B23B` gold typography and borders, projecting institutional credibility without looking washed out.

---

## 15. RESTRAINED MOTION LANGUAGE

* **Page Transition:** `.fade-in-up` (`animation: fadeInUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;`).
* **Card Hover:** `hover:scale-[1.01] hover:shadow-md transition-all duration-300`.
* **Wizard Slide:** Lateral horizontal slide (`x: 20 -> 0 -> -20`, `duration: 0.2s`).
* **Reduced Motion:** When `@media (prefers-reduced-motion: reduce)` is active, all translation and scale transforms collapse to instantaneous opacity transitions.

---

## 16. ACCESSIBILITY COMPLIANCE (WCAG 2.1 AA)

1. **Touch Targets:** All interactive buttons and touch links enforce minimum 44px on mobile viewports.
2. **Accessible Names:** All icon-only buttons (`RefreshCw`, `Menu`, `ThemeToggle`) must declare explicit `aria-label` and `title` attributes.
3. **Form Association:** Every input in `LeadCaptureModal` and other modals must pair with `<Label htmlFor="...">` using unique DOM IDs.
4. **Focus Rings:** High-visibility focus indicators: `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring`.

---

## 17. STRICT ANTI-PATTERNS (PROHIBITED)

1. **No Ad-Hoc Component Styling:** Never style a card or button inline with random padding or arbitrary hex codes.
2. **No Unwatermarked Public Media:** Never show property photography without `WatermarkedImage`.
3. **No Retaining Blue/Purple Themes:** Deprecate `[data-accent="blue"]` and `[data-accent="purple"]`.
4. **No Shrinking Desktop Tables for Mobile:** Tables that cannot fit mobile viewports must transform into stacked touch cards.
5. **No Bypassing UI Primitives:** Never write raw `<input>` or `<textarea>` tags with custom classes; always use `@/components/ui/input` and `@/components/ui/textarea`.

---

## 18. COMPONENT ARCHITECTURE RECOMMENDATION

```text
┌─────────────────────────────┬───────────────────────────┬────────────────────────────────────────┐
│ Current Component           │ Proposed V2 Status        │ Architectural Action                   │
├─────────────────────────────┼───────────────────────────┼────────────────────────────────────────┤
│ PropertyCard.tsx            │ Evolve to Master Primitive│ Absorbs all card logic with variants.  │
│ DashboardPropertyCard.tsx   │ Deprecate                 │ Replaced by PropertyCard variant="dash"│
│ ui/pagination.tsx           │ Unify with NumberedPag    │ NumberedPagination becomes canonical.  │
│ PageHeader.tsx              │ Keep (Public Discovery)   │ Reserved for Storefront Discovery.     │
│ OperationalHeader.tsx       │ New Component             │ Built for CRM, Invoices, Admin ERP.    │
│ LeadCaptureModal.tsx        │ Refactor Internals        │ Replace native HTML tags with UI prims.│
└─────────────────────────────┴───────────────────────────┴────────────────────────────────────────┘
```

---

## 19. MIGRATION STRATEGY & RISK ROADMAP

```text
Step 1: Design Tokens & CSS Architecture (Low Risk)
  • Remove blue/purple themes in globals.css; codify Tier 1 (h-10) and Tier 2 (h-8) tokens.

Step 2: Base UI Primitives Standardization (Medium Risk)
  • Standardize button.tsx, input.tsx, badge.tsx (2-tier pill vs chip).

Step 3: Polymorphic PropertyCard Implementation (Medium Risk)
  • Build unified PropertyCard; swap into /properties and /dashboard carousels.

Step 4: OperationalHeader & Navigation Restructuring (High Risk - Requires Prototype)
  • Implement persistent collapsible sidebar for staff and clean top navbar for guests.

Step 5: Surface Density Audit & Final Polish (Low Risk)
  • Validate mobile touch targets and compact mode table padding.
```

---

## 20. STRATEGIC DECISION LOG

| Decision | Final Direction | Rationale | Confidence |
|---|---|---|:---:|
| **Product Personality** | Dual-Personality Architecture | Public needs high-trust editorial warmth; Staff needs high-density transactional ERP. | `[CONFIRMED]` |
| **Property Entity Card** | Single Polymorphic `PropertyCard` | Eliminates visual drift while honoring contextual scanning goals. | `[CONFIRMED]` |
| **Navigation Model** | Role-Driven Dual Navigation | Staff requires persistent left-rail speed; Guests require clean top-nav browsing. | `[CONFIRMED]` |
| **Color Discipline** | Two-Tier (Emerald + Forest/Gold) | Retires blue/purple SaaS dilution; cements unmistakable brand recall. | `[CONFIRMED]` |
| **Button & Input Sizing**| Strict 2-Tier (`h-10` Form / `h-8` Dense) | Resolves the constant `h-8` primitive vs `h-10` page override struggle. | `[CONFIRMED]` |
| **Badge Grammar** | 2-Tier: Rounded-full (Status) vs Rounded-md (Specs)| Distinguishes dynamic business lifecycles from static technical dimensions. | `[CONFIRMED]` |
| **Mobile CRM** | Segmented Header + Swipeable Stage Cards | Prevents vertical scroll bloat while enabling intuitive single-thumb navigation. | `[CONFIRMED]` |
| **Dark Mode Aesthetic** | Jewel-Box Luxury (`#0E2C24` + Gold `#E2B23B`)| Projects institutional executive credibility against modern dark slate. | `[CONFIRMED]` |
