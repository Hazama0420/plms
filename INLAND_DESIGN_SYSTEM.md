# INLAND PROPERTY / PLMS — CANONICAL DESIGN SYSTEM & UI/UX ARCHITECTURE AUDIT

> **Document Type:** Canonical Design System & UI/UX Implementation Reality Audit  
> **Target Audience:** AI Coding Assistants, Design Systems Engineers, and Frontend Architects  
> **Repository Root:** `d:\Workspace\plms`  
> **Primary Rule:** Source code is the sole source of truth. This document records the **actual visual language implemented today**, distinguishing declared tokens from runtime reality.  
> **Confidence Notation:**
> - `[CONFIRMED]`: Directly observed and verified in source code, components, CSS rules, or assets.
> - `[INFERRED]`: Reasoned deduction from consistent component styling and layout patterns.
> - `[UNKNOWN]`: Explicitly unconfirmed or missing from repository files.

---

## A. BRAND IDENTITY

### A.1 Brand Assets & Filesystem Inventory `[CONFIRMED]`
* **Logo Asset (`public/logo-inland.png` & `public/logo.png`)**:
  * Primary Logo: `public/logo-inland.png` (95 KB, high-resolution brandmark combining house iconography and brand typography).
  * Compact Logo: `public/logo.png` (33 KB, square/icon variant used for favicon and compact headers).
  * Favicon: `app/favicon.ico` (25 KB).
* **Graphic Assets (`public/`)**:
  * `bg-header.webp` (147 KB): Hero background texture depicting modern architectural housing with a dark forest-green/emerald tint; used in `components/dashboard/PageHeader.tsx`.
  * `bg-login.webp` (298 KB): Fullscreen architectural hero background used behind glassmorphic auth cards on `/login`.
  * `watermark.png` (76 KB): Transparent white-on-dark watermark badge ("Inland Property") applied across listing media.
  * `pattern.svg` (307 B): Subtle geometric SVG background grid pattern.

### A.2 Brand Color Palette Architecture `[CONFIRMED]`
Inland Property maintains a dual-layer color system:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. LOCKED CORPORATE IDENTITY PALETTE (Permanent Brand Colors)          │
│    • Corporate Forest Green : #0E2C24 (Footer, Invoices, Legal Articles)│
│    • Corporate Warm Gold    : #E2B23B (Accents, Dividers, Badges)      │
│    * Note: Intentionally hardcoded to prevent user theme mutation.     │
├────────────────────────────────────────────────────────────────────────┤
│ 2. APPLICATION INTERFACE THEME (Dynamic UI Theme Tokens)               │
│    • Default Accent (Emerald) : Primary #059669 (Light) / #10b981 (Dark)│
│    • Secondary Accent (Blue)  : Primary #2563eb (Light) / #3b82f6 (Dark)│
│    • Tertiary Accent (Purple) : Primary #9333ea (Light) / #a855f7 (Dark)│
│    * Note: Switched via [data-accent] on the HTML root element.        │
└────────────────────────────────────────────────────────────────────────┘
```

* **Neutral Surface Foundation `[CONFIRMED]`:**
  * Light Mode: Pure White `#ffffff` background, Slate `#0f172a` text, Slate `#f1f5f9` muted backgrounds, Slate `#e2e8f0` borders.
  * Dark Mode: Slate `#0f172a` background, Slate `#1e293b` cards, Slate `#f1f5f9` text, Slate `#334155` borders.

### A.3 Wordmark & Brand Typography Rules `[CONFIRMED]`
* **Canonical Header Wordmark (`app/(dashboard)/layout.tsx:89-91`):**
  * `<span className="text-emerald-600 dark:text-emerald-400">Inland</span>`
  * `<span className="text-slate-900 dark:text-white">Property</span>`
  * Tracking: `tracking-tight`, Font Weight: `font-extrabold`.
* **Corporate Footer Wordmark (`components/layout/SiteFooter.tsx:77-78`):**
  * `<span className="text-[#E2B23B]">Inland</span>`
  * `<span className="text-white">Property</span>`

### A.4 Watermark & Imagery Treatment `[CONFIRMED]`
* **Client-Side Watermarking (`components/ui/WatermarkedImage.tsx`):**
  * Raw image is rendered from Supabase Storage without destructive editing.
  * Centered overlay renders `/watermark.png` with configurable opacity (default `0.6`, range `0.4 - 0.7`) and width (default `w-1/3`, max height `60%`).
  * Enforces `pointer-events-none` and `select-none` to protect listing photography.
  * Inline styles guarantee `object-fit: cover` or `contain` precedence over Tailwind cascade order.
* **Server-Side Watermarking (`lib/watermark.ts`):**
  * High-resolution compositing via Sharp `0.35.3` baked into uploaded buffers for external API syndication.

---

## B. GLOBAL DESIGN TOKENS

### B.1 Color Token Mapping `[CONFIRMED]`
Defined in `app/globals.css` using Tailwind CSS v4 `@theme inline`:

| Design Token | CSS Variable | Light Mode Hex | Dark Mode Hex | Definition Source | Typical Component Usage |
|---|---|:---:|:---:|---|---|
| `background` | `--background` | `#ffffff` | `#0f172a` | `globals.css:35,57` | Global page body, dialog backgrounds |
| `foreground` | `--foreground` | `#0f172a` | `#f1f5f9` | `globals.css:36,58` | Primary text headings, body content |
| `card` | `--card` | `#ffffff` | `#1e293b` | `globals.css:37,59` | Cards, panels, bottom nav background |
| `card-foreground` | `--card-foreground` | `#0f172a` | `#f1f5f9` | `globals.css:38,60` | Text inside cards |
| `popover` | `--popover` | `#ffffff` | `#1e293b` | `globals.css:39,61` | Dropdowns, tooltips, dialog popups |
| `popover-foreground` | `--popover-foreground` | `#0f172a` | `#f1f5f9` | `globals.css:40,62` | Text inside popovers |
| `primary` (Default) | `--primary` | `#059669` | `#10b981` | `globals.css:41,63` | Primary buttons, active tabs, CTA pills |
| `primary-foreground` | `--primary-foreground` | `#ffffff` | `#ffffff` | `globals.css:42,64` | Text inside primary buttons |
| `secondary` | `--secondary` | `#f1f5f9` | `#334155` | `globals.css:43,65` | Secondary badges, ghost buttons |
| `secondary-foreground` | `--secondary-foreground` | `#0f172a` | `#f1f5f9` | `globals.css:44,66` | Text inside secondary elements |
| `muted` | `--muted` | `#f1f5f9` | `#334155` | `globals.css:45,67` | Table header rows, code badges |
| `muted-foreground` | `--muted-foreground` | `#64748b` | `#94a3b8` | `globals.css:46,68` | Captions, subtitle text, placeholder text |
| `accent` | `--accent` | `#f1f5f9` | `#334155` | `globals.css:47,69` | Dropdown hover states, tab containers |
| `accent-foreground` | `--accent-foreground` | `#0f172a` | `#f1f5f9` | `globals.css:48,70` | Text on hover states |
| `destructive` | `--destructive` | `#ef4444` | `#f87171` | `globals.css:49,71` | Delete modals, error alerts |
| `destructive-foreground` | `--destructive-foreground` | `#ffffff` | `#ffffff` | `globals.css:50,72` | Text inside delete buttons |
| `border` | `--border` | `#e2e8f0` | `#334155` | `globals.css:51,73` | Card borders, dividers, table borders |
| `input` | `--input` | `#e2e8f0` | `#334155` | `globals.css:52,74` | Input outlines, checkbox borders |
| `ring` | `--ring` | `#059669` | `#10b981` | `globals.css:53,75` | Focus rings on inputs, buttons |

#### Hardcoded Color Values Outside the Token System `[CONFIRMED]`
* Corporate Green: `#0E2C24` (Used in `SiteFooter.tsx` and `LegalArticle.tsx`)
* Corporate Gold: `#E2B23B` (Used in `SiteFooter.tsx` and `LegalArticle.tsx`)
* Social Media Brand Colors: Instagram `#E1306C`, Facebook `#1877F2`, YouTube `#FF0000` (`SiteFooter.tsx`)
* Recharts Visualization Palette: `["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]` (`reports/page.tsx:52`)

### B.2 Typography & Type Hierarchy `[CONFIRMED]`
* **Primary Font Family:** `Inter` (loaded via `next/font/google` in `app/layout.tsx`).
* **Fallback Stack:** `sans-serif` (system native).
* **Font Scaling Engine (`globals.css:117-128`):**
  * `html[data-font-size="compact"]`: `font-size: 87.5%` (14px baseline root)
  * `html[data-font-size="normal"]`: `font-size: 100%` (16px baseline root — default)
  * `html[data-font-size="large"]`: `font-size: 112.5%` (18px baseline root)

#### Verified Type Scale Hierarchy `[CONFIRMED]`

| Level | Desktop Class & Weight | Mobile Class & Weight | Line Height | Usage Example |
|---|---|---|---|---|
| **Hero Page Title** | `text-3xl sm:text-4xl font-extrabold` | `text-2xl font-extrabold` | `leading-tight` | `PageHeader.tsx:34` |
| **Section Title** | `text-xl sm:text-2xl font-bold` | `text-lg font-bold` | `leading-snug` | `DashboardPropertySection.tsx`, `/crm` |
| **Card Title (Standard)** | `text-base font-medium / font-bold` | `text-sm font-bold` | `leading-normal` | `CardTitle.tsx:41`, `PropertyCard.tsx` |
| **Data Metric / KPI** | `text-2xl font-black` | `text-xl font-black` | `leading-none` | `AdminStatsGrid.tsx:89` |
| **Listing Price** | `text-3xl lg:text-4xl font-extrabold` | `text-2xl font-extrabold` | `leading-none` | `PropertyHeader.tsx:71` (tabular-nums) |
| **Body (Default)** | `text-sm font-normal` | `text-sm font-normal` | `leading-relaxed` | Paragraphs, descriptions, dialogs |
| **Form Label** | `text-xs font-bold / font-semibold` | `text-xs font-bold` | `leading-none` | Form field labels across all forms |
| **Data Table Text** | `text-xs / text-sm font-normal` | `text-xs font-normal` | `leading-tight` | `TableCell.tsx`, CRM lead rows |
| **Chip / Badge / Metadata** | `text-[10px] / text-[11px] font-bold` | `text-[9px] / text-[10px]` | `leading-none` | Listing codes, category pills, specs |

### B.3 Spacing & Layout Rhythm `[CONFIRMED]`
* **Page Padding:** `p-4 md:p-6` inside `<main>` (`app/(dashboard)/layout.tsx:159`).
* **Mobile Bottom Safety Margin:** `pb-28 sm:pb-24 md:pb-6` (reserves clearance for fixed `BottomNav`).
* **Section Gap Spacing:**
  * Major Page Sections: `space-y-6` or `space-y-10` (`ViewerDashboardView.tsx:39`).
  * Form Field Groups: `space-y-3.5` or `space-y-5` (`crm/leads/create/page.tsx:426`).
  * Card Internal Spacing: `--card-spacing: --spacing(4)` (16px) or `sm` size `--spacing(3)` (12px).
* **Grid Gaps:**
  * Property Catalog: `gap-4 sm:gap-6` (responsive 1 -> 2 -> 3 -> 4 columns).
  * KPI Stat Grids: `gap-4` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
  * Specs Grid: `gap-x-6 gap-y-4` (`PropertySpecsGrid.tsx:85`).

### B.4 Corner Radius Reality Audit `[CONFIRMED]`
The root token defines `--radius: 0.5rem` (8px), but actual components employ an intentional **tiered radius hierarchy**:

```text
Tier 1: Mini Chips & Badges    → rounded-[4px] to rounded-md (4px - 6px)
Tier 2: Base UI Primitives      → rounded-lg (8px)  [Button, Input, Select, Dropdown]
Tier 3: Content Cards & Modals → rounded-xl (12px) [Dialog, Sheet, AgentCard]
Tier 4: Feature Cards & Panels → rounded-2xl (16px) [PropertyCard, KPI Cards, Stepper Steps]
Tier 5: Hero Banners & Shells  → rounded-3xl / rounded-[1.5rem] (24px) [PageHeader, SidebarStepper]
Tier 6: Floating Pills         → rounded-full [Status badges, BottomNav active indicator, Avatars]
```

* **Base UI Primitive Radius:** `rounded-lg` (8px) in `button.tsx`, `input.tsx`, `select.tsx`, `dropdown-menu.tsx`.
* **Feature Cards Override:** `rounded-2xl` (16px) consistently across `PropertyCard.tsx`, `DashboardPropertyCard.tsx`, `AdminStatsGrid.tsx`, `KpiCard.tsx`.
* **Hero Elements Override:** `rounded-3xl` / `rounded-[1.5rem]` (24px) in `PageHeader.tsx`, `SidebarStepper.tsx`, `AIChatWidget.tsx`.

### B.5 Borders & Divider Patterns `[CONFIRMED]`
* **Standard Border:** `border border-border` (`#e2e8f0` Light / `#334155` Dark).
* **Subtle Card Borders:** `border border-border/60` or `border border-border/80` (creates lighter, less intrusive containment).
* **Dividers:** `Separator` primitive (`components/ui/separator.tsx`) with `bg-border h-px w-full`.
* **Section Separation:** `border-t border-border/40` or `border-b border-border/60`.

### B.6 Elevation & Shadow System `[CONFIRMED]`
Inland Property favors crisp borders over deep shadows, using elevation only for functional separation:
* `shadow-none`: Default flat cards in dark mode.
* `shadow-2xs` / `shadow-xs`: Default state for KPI cards and dashboard panels (`AdminStatsGrid.tsx:82`).
* `shadow-sm`: Form buttons and header badges (`DashboardHeader.tsx:85`).
* `shadow-md`: Page hero banners (`PageHeader.tsx:22`) and dropdown menus.
* `shadow-lg`: Hover elevation on property cards (`PropertyCard.tsx:45`) and bottom navigation bar.
* `shadow-2xl`: Slide-out navigation drawer (`app/(dashboard)/layout.tsx:60`) and floating chat widget (`AIChatWidget.tsx:98`).

---

## C. COMPONENT SYSTEM AUDIT

### C.1 Complete Primitive Catalog (`components/ui/`) `[CONFIRMED]`

| Component File | Primitive Engine | Default Height / Sizing | Default Radius | Key Visual Characteristics |
|---|---|---|---|---|
| `button.tsx` | `@base-ui/react/button` | `h-8` (32px), xs: `h-6`, sm: `h-7`, lg: `h-9` | `rounded-lg` (8px) | Compact 32px height; active translateY(1px); focus-visible ring-3 |
| `input.tsx` | `@base-ui/react/input` | `h-8` (32px) | `rounded-lg` (8px) | `px-2.5 py-1 text-base md:text-sm`; transparent bg with dark input/30 |
| `textarea.tsx` | Native HTML `<textarea>` | `min-h-16` (64px) | `rounded-lg` (8px) | Modern `field-sizing-content` auto-grow; `px-2.5 py-2 text-base md:text-sm` |
| `card.tsx` | Custom HTML `<div>` | Dynamic spacing (`--spacing(4)`) | `rounded-xl` (12px) | `ring-1 ring-foreground/10` borderless default; header/content/footer slots |
| `badge.tsx` | `@base-ui/react/use-render` | `h-5` (20px) | `rounded-4xl` (Pill) | `px-2 py-0.5 text-xs font-medium`; inline SVG forced to `size-3` |
| `dialog.tsx` | `@base-ui/react/dialog` | Max width `sm:max-w-sm` | `rounded-xl` (12px) | Overlay `bg-black/10 backdrop-blur-xs`; scale zoom animation 95->100% |
| `sheet.tsx` | `@base-ui/react/dialog` | Width `w-3/4 sm:max-w-sm` | Sharp edge on attachment | Slide animation from top/bottom/left/right; backdrop blur overlay |
| `select.tsx` | `@base-ui/react/select` | `h-8` (32px), sm: `h-7` | `rounded-lg` (8px) | Dropdown popup `rounded-lg shadow-md ring-1 ring-foreground/10` |
| `dropdown-menu.tsx`| `@base-ui/react/menu` | Auto height | `rounded-lg` (8px) | Popup `p-1 min-w-32 shadow-md ring-1`; sub-menus with chevrons |
| `table.tsx` | Custom HTML `<table>` | Head: `h-10 px-2`, Cell: `p-2` | Container `rounded-md` | Overflow auto container; compact mode reduces padding to `0.35rem` |
| `tabs.tsx` | Custom React Context | Trigger: `px-3 py-1.5` | List: `rounded-md`, Trigger: `rounded-sm` | Custom non-Radix context implementation; active tab has `shadow-xs` |
| `switch.tsx` | `@base-ui/react/switch` | Default: `18.4px x 32px`, sm: `14px x 24px`| `rounded-full` | Ultra-compact switch toggle; thumb `size-4` / `size-3` |
| `checkbox.tsx` | `@base-ui/react/checkbox`| `size-4` (16x16px) | `rounded-[4px]` | Checked state: `bg-primary border-primary text-primary-foreground` |
| `avatar.tsx` | `@base-ui/react/avatar` | Custom via classes | `rounded-full` | Fallback initials renderer; image fallback handling |
| `popover.tsx` | `@base-ui/react/popover`| Auto height | `rounded-lg` (8px) | Anchored floating positioning; `ring-1 ring-foreground/10` |
| `tooltip.tsx` | `@base-ui/react/tooltip`| `text-xs px-2.5 py-1` | `rounded-md` (6px) | Delayed hover preview popup; dark popover styling |
| `progress.tsx` | `@radix-ui/react-progress`| `h-2` (8px) | `rounded-full` | Linear progress bar; indicator with `bg-primary transition-all` |
| `separator.tsx` | `@base-ui/react/separator`| `h-px` (horizontal) / `w-px` | None | `bg-border` line divider |
| `skeleton.tsx` | Custom HTML `<div>` | Configurable | `rounded-md` (6px) | `animate-pulse bg-muted` skeleton placeholder |
| `sonner.tsx` | Sonner Toaster wrapper | Fixed toast stack | `rounded-lg` (`var(--radius)`) | Bound to CSS variables (`--normal-bg: var(--popover)`); custom Lucide icons |
| `WatermarkedImage.tsx`| Custom Next/HTML `<img>`| Responsive container | Inherited / custom | Double layer: clean image base + absolute centered watermark PNG |

---

## D. SHADCN & BASE UI IMPLEMENTATION REALITY

### D.1 Primitive Architecture Breakdown `[CONFIRMED]`
While `components.json` declares the standard shadcn `base-nova` style, the repository has been largely modernized to use **`@base-ui/react` (v1.6.0)** primitives:

1. **Base UI Primitives (16 Components) `[CONFIRMED]`:**
   * `button.tsx` (`@base-ui/react/button`)
   * `input.tsx` (`@base-ui/react/input`)
   * `checkbox.tsx` (`@base-ui/react/checkbox`)
   * `switch.tsx` (`@base-ui/react/switch`)
   * `dialog.tsx` (`@base-ui/react/dialog`)
   * `sheet.tsx` (`@base-ui/react/dialog`)
   * `dropdown-menu.tsx` (`@base-ui/react/menu`)
   * `select.tsx` (`@base-ui/react/select`)
   * `radio-group.tsx` (`@base-ui/react/radio` & `radio-group`)
   * `scroll-area.tsx` (`@base-ui/react/scroll-area`)
   * `separator.tsx` (`@base-ui/react/separator`)
   * `collapsible.tsx` (`@base-ui/react/collapsible`)
   * `tooltip.tsx` (`@base-ui/react/tooltip`)
   * `popover.tsx` (`@base-ui/react/popover`)
   * `avatar.tsx` (`@base-ui/react/avatar`)
   * `badge.tsx` (`@base-ui/react/merge-props`, `use-render`)

2. **Radix UI Primitives (1 Component) `[CONFIRMED]`:**
   * `progress.tsx` (`@radix-ui/react-progress`)

3. **Custom Pure React Implementations (9 Components) `[CONFIRMED]`:**
   * `tabs.tsx` (Custom `TabsContext` using React `useState`, bypassing Radix Tabs)
   * `card.tsx` (Custom atomic HTML container with `data-slot="card"`)
   * `table.tsx` (Custom HTML `<table>` wrapper with `compact-mode` CSS hooks)
   * `label.tsx` (Direct `<label>` element with `data-slot="label"`)
   * `textarea.tsx` (Native `<textarea>` with CSS `field-sizing-content`)
   * `skeleton.tsx` (`animate-pulse bg-muted`)
   * `sonner.tsx` (Sonner wrapper with token mapping)
   * `WatermarkedImage.tsx` (Dual-layer watermark overlay component)
   * `NumberedPagination.tsx` (URL-query preserving numbered pagination orchestrator)

---

## E. LAYOUT SYSTEM

### E.1 Shell Layout Structure (`app/(dashboard)/layout.tsx`) `[CONFIRMED]`

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (h-16 border-b px-4 md:px-6 z-20 bg-background shrink-0)                │
│  ├─ Left   : Hamburger (Menu) + Brand ("Inland" in emerald + "Property" in dark)│
│  ├─ Center : Quick Actions (KPR, Titip Properti [Soon], Jadwal Survey) [Desktop] │
│  └─ Right  : Date & Clock [sm:flex] + NotificationBell + ThemeToggle + Login    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ MAIN SCROLL CONTAINER (flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-6 fade-in) │
│  │                                                                              │
│  ├─ Page Content (Hero / Grids / Cards / Tables)                                │
│  │                                                                              │
│  └─ SiteFooter (Full-bleed span using negative horizontal margins)              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ BOTTOM NAVIGATION BAR (h-15 fixed bottom-0 left-0 right-0 z-50 md:hidden)       │
│  └─ 5 Dynamic Tab Items (Role-based: Guest, Viewer, Staff)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
│ SLIDE-OUT SHEET DRAWER (w-64 bg-card shadow-2xl z-50 - Triggered by Hamburger)  │
│  └─ AppSidebar (Full navigation tree, role sections, collapse groups)           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### E.2 Layout Behavior by Breakpoint `[CONFIRMED]`
* **Mobile (< 768px):**
  * Sidebar is hidden in a slide-out drawer (`Sheet side="left"`).
  * Header center quick access items (`KPR`, `Jadwal Survey`) are hidden.
  * Live clock in header is hidden (`hidden sm:flex`).
  * `BottomNav` is fixed to viewport bottom (`z-50`) with `pb-[env(safe-area-inset-bottom)]`.
  * Page content reserves `pb-28` to prevent bottom nav from covering actionable buttons.
* **Desktop (>= 768px):**
  * `BottomNav` is completely hidden (`md:hidden`).
  * Header displays full quick access pills and live date/time.
  * Content bottom padding collapses to `md:pb-6`.
  * Drawer sidebar is opened via hamburger or shortcut.

---

## F. PAGE COMPOSITION AUDIT

Representative audit of primary production routes:

### 1. `/dashboard` (Storefront & Operational Portal) `[CONFIRMED]`
* **Structure:** `PageHeader` hero banner with `/bg-header.webp` -> `DashboardPropertySearch` bar -> `DashboardPropertySection` featured property carousel -> KPR Simulator CTA card (`rounded-3xl bg-gradient-to-br from-emerald-600 to-slate-900`) -> Latest listings grid.
* **Role Adaptation:** Staff users see `DashboardHeader` with greeting badge and `AdminStatsGrid` / `AgentStatsGrid` KPI metrics.

### 2. `/properties` (Public Property Catalog) `[CONFIRMED]`
* **Structure:** Compact `PageHeader` -> Filter toolbar (Listing type, category, price range, multi-district popover) -> Results counter ("Menampilkan X dari Y properti") -> Catalog grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6`) -> `NumberedPagination` bar.
* **Empty State:** Illustrated card with "Properti Tidak Ditemukan" and a "Reset Semua Filter" button.

### 3. `/properties/[id]` (Property Detail View) `[CONFIRMED]`
* **Structure:** Two-column desktop layout (`lg:grid-cols-3 gap-8`):
  * Left Column (`lg:col-span-2 space-y-8`): `PropertyHeader` -> `PropertyGallery` with Lightbox -> `PropertySpecsGrid` -> `PropertyDescription` -> `PropertyLocationMap` -> Related properties.
  * Right Sticky Column (`lg:col-span-1 space-y-6 sticky top-6`): `PropertyActionMenu` (if staff) -> `PropertyAgentCard` (WhatsApp CTA + Schedule Survey) -> `PropertyKprSection` (Interactive calculator).

### 4. `/properties/create` & `/properties/[id]/edit` (Property Wizard) `[CONFIRMED]`
* **Structure:** Split-column layout (`lg:grid-cols-4 gap-6`):
  * Left Column (`lg:col-span-1`): `SidebarStepper` (vertical step navigation) + `PropertyScoreCard` (0-100% completeness gauge).
  * Right Column (`lg:col-span-3`): Step form container with `AnimatePresence` transition -> Floating action bar (Back, Save Draft, Next/Publish).

### 5. `/crm` & `/crm/leads` (CRM Pipeline & Lead Ledger) `[CONFIRMED]`
* **`/crm`:** Stage indicator pills -> Search & filter bar (Mode Agen lock indicator) -> 7 Kanban columns (`md:w-[250px] shrink-0`). On mobile, automatically collapses to a single active stage view selectable via horizontal pills.
* **`/crm/leads`:** TanStack data table with lead contacts, budget, status dropdown, agent assignment, and pagination.

### 6. `/invoices` & `/invoices/create` (Billing Ledger) `[CONFIRMED]`
* **Structure:** Metric summary row -> Search & status filter pills -> Invoices table with color-coded status badges -> Action dropdown (View, Print Thermal, Print A4, Delete).

### 7. `/surveys` (Property Survey Schedule) `[CONFIRMED]`
* **Structure:** Tabbed view (`Tabs` with "Permohonan Masuk" and "Jadwal Survey") -> Survey request card list with accept/reject buttons -> Modal appointment scheduler.

### 8. `/projects` (Construction Tracking) `[CONFIRMED]`
* **Structure:** `KpiCard` metric grid -> Status filter bar -> Project grid cards with linear progress bars (`Progress`) and milestone checklists.

### 9. `/reports` (Business Intelligence & Analytics) `[CONFIRMED]`
* **Structure:** Filter toolbar with year selector -> KPI metric cards -> Recharts ComposedChart (Monthly revenue & deals) -> PieChart (Property category distribution).

### 10. `/settings` (Preferences & Identity) `[CONFIRMED]`
* **Structure:** Horizontal tab bar (`ProfileTab`, `BrandingTab`, `AppearanceTab`, `SystemTab`, `NotificationsTab`) -> Form cards with responsive save buttons.

### 11. `/login` (Authentication Portal) `[CONFIRMED]`
* **Structure:** Fullscreen backdrop (`bg-login.webp`) -> Centered glassmorphic card (`bg-slate-950/80 backdrop-blur-xl border-white/20 rounded-3xl`) -> Brand logo -> Email/Password inputs (`h-10 rounded-xl`) -> Google OAuth button -> Inline legal links.

---

## G. PROPERTY DOMAIN UI PATTERNS

### G.1 Property Card Specification `[CONFIRMED]`
Two implementations exist in the repository (see Section W for Duplication Audit):

#### Standard Catalog Card (`components/properties/PropertyCard.tsx`):
* **Card Container:** `Card p-0 group bg-white dark:bg-card hover:shadow-lg transition-all duration-300 border border-border/60 rounded-2xl overflow-hidden cursor-pointer`
* **Thumbnail Ratio:** `aspect-[16/9]` with `WatermarkedImage` (`watermarkSize="w-1/3"`, `opacity: 0.6`).
* **Hover Micro-interaction:** Image scales slightly: `group-hover:scale-105 duration-700`.
* **Top Badges (Absolute top-2.5 left-2.5):**
  * Listing Type: `Badge rounded-md text-[9px] font-bold uppercase` (Sewa: `bg-blue-600`, Jual: `bg-emerald-600`).
  * Property Category: `text-[9px] font-semibold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-white border border-white/20`.
* **Bottom Badge (Absolute bottom-2 right-2):**
  * Listing Code: `font-mono text-[9px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded border border-border/80`.
* **Price Typography:** `text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums`.
* **Title:** `text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-emerald-600`.
* **Location:** `text-[11px] text-muted-foreground flex items-center gap-1 truncate` with `MapPin (w-3 h-3 text-emerald-600)`.
* **Specs Chips Footer:** Small chips with icons (`KT`, `KM`, `LB`, `LT`).

---

## H. CRM UI SPECIFICATION

### H.1 Pipeline Stages & Color Palette `[CONFIRMED]`
Directly from `components/crm/CrmKanbanBoard.tsx:42-50`:

| Stage Key | Label | Border / Card Tint Class | Status Dot Class | Business Meaning |
|---|---|---|---|---|
| `new` | New Lead | `border-blue-500/30` | `bg-blue-500` | Fresh web inquiry or manual lead |
| `contacted` | Contacted | `border-amber-500/30` | `bg-amber-500` | Initial message/call initiated |
| `qualified` | Qualified | `border-cyan-500/30` | `bg-cyan-500` | Verified budget & property intent |
| `proposal` | Proposal | `border-purple-500/30` | `bg-purple-500` | Property listing proposal sent |
| `negotiation` | Negotiation | `border-orange-500/30` | `bg-orange-500` | Pricing & terms under discussion |
| `won` | Won (Deal) | `border-emerald-500/30` | `bg-emerald-500` | Verified deal closed (requires Admin approval) |
| `lost` | Lost | `border-rose-500/30` | `bg-rose-500` | Inactive/lost opportunity with mandatory reason |

### H.2 Kanban Board Implementation Reality `[CONFIRMED]`
* **Desktop Kanban (`md:flex`):**
  * Columns: `md:w-[250px] md:shrink-0 md:rounded-xl md:border md:p-2 md:bg-card/60 md:min-h-[440px]`.
  * Column Header: Status dot + Stage name + Lead count chip + Total stage budget (e.g. `1,2 M`).
  * Drag-and-Drop: HTML5 native drag events (`onDragStart`, `onDragOver`, `onDrop`).
  * Drop Target Indicator: `md:bg-emerald-500/10 md:border-emerald-500 md:border-dashed`.
* **Mobile Kanban (`< md`):**
  * Displays a single stage column at a time (`stage.id !== activeStage && "hidden md:flex"`).
  * Stage selection via top horizontal pill tabs with count chips.
  * Drag-and-drop disabled on touch; stage transitions executed via card action dropdowns to prevent mobile scrolling gesture conflicts.
* **Phone Masking UX Rule:** Non-admin roles see phone numbers masked as `"08xx-xxxx-xxxx"` with an amber "Mode Agen (Kontak Disensor)" indicator badge.

---

## I. DASHBOARD & KPI UI SPECIFICATION

### I.1 KPI Metric Cards (`AdminStatsGrid.tsx` & `KpiCard.tsx`) `[CONFIRMED]`
* **Card Container:** `Card rounded-2xl border border-border/80 shadow-xs hover:border-emerald-500/40 transition-all overflow-hidden bg-card`.
* **Padding:** `p-4 sm:p-5 flex items-center justify-between gap-3`.
* **Title:** `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate`.
* **Metric Value:** `text-xl sm:text-2xl font-black text-foreground tracking-tight tabular-nums`.
* **Sub-value:** `text-[11px] text-muted-foreground font-medium truncate`.
* **Icon Box:** `p-3 rounded-2xl border shrink-0` with tone-matched background and border (e.g., `bg-emerald-500/10 text-emerald-600 border-emerald-500/20`).

---

## J. FORM SYSTEM SPECIFICATION

### J.1 Canonical Form Pattern `[CONFIRMED]`
* **Form Container:** `Card border shadow-md bg-card overflow-hidden`.
* **Section Header:** `CardHeader bg-muted/40 border-b pb-4` with icon + title + description.
* **Field Wrapper:** `<div className="space-y-1.5">` or `<div className="space-y-2">`.
* **Label Typography:** `Label className="text-xs font-bold text-foreground"`.
* **Required Indicator:** `<span className="text-rose-500">*</span>` placed adjacent to label text.
* **Input Sizing:** `h-9` or `h-10` with `rounded-xl text-xs` in forms (overriding base `h-8 rounded-lg`).
* **Combobox / Select Triggers:** `h-10 rounded-xl text-xs bg-background border border-input`.
* **Action Footer:** `flex items-center gap-2 pt-4 border-t` with Submit (`bg-emerald-600 text-white h-9 px-5 rounded-xl font-bold`) and Cancel (`variant="outline" h-9 rounded-xl`).

---

## K. TABLES & DATA-DENSE UI

### K.1 Table Styling & Row Hierarchy `[CONFIRMED]`
* **Table Wrapper:** `<div className="relative w-full overflow-x-auto">` (`Table.tsx:9`).
* **Header Row:** `TableHeader [&_tr]:border-b bg-muted/30`.
* **Header Cells:** `TableHead h-10 px-2 text-left font-medium text-foreground whitespace-nowrap text-xs`.
* **Body Cells:** `TableCell p-2 align-middle whitespace-nowrap text-xs`.
* **Hover State:** `hover:bg-muted/50 transition-colors`.
* **Selected State:** `data-[state=selected]:bg-muted`.

### K.2 Compact Mode Overrides (`app/globals.css:150-168`) `[CONFIRMED]`
When `html.compact-mode` is activated via Appearance settings:
```css
html.compact-mode table th,
html.compact-mode table td {
  padding-top: 0.35rem !important;
  padding-bottom: 0.35rem !important;
  font-size: 0.75rem !important;
}
html.compact-mode .card,
html.compact-mode [data-slot="card"] {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
}
```

---

## L. STATUS & SEMANTIC COLORS

Canonical inventory of status colors used across modules:

### L.1 Property Listing Statuses `[CONFIRMED]`
Defined in `app/(dashboard)/properties/[id]/PropertyDetailClient.tsx:32-39`:
* `draft`: Draf Internal -> `text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20`
* `review`: Peninjauan -> `text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20`
* `published`: Dipublikasikan -> `text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20`
* `sold`: Terjual -> `text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20`
* `rented`: Tersewa -> `text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20`
* `archived`: Diarsip -> `text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20`

### L.2 Invoices Statuses `[CONFIRMED]`
Defined in `app/(dashboard)/invoices/page.tsx:82-88`:
* `draft`: Draft -> `text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200`
* `sent`: Terkirim -> `text-blue-600 bg-blue-100 dark:bg-blue-950/60 border-blue-200`
* `paid`: Lunas -> `text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200`
* `overdue`: Jatuh Tempo -> `text-rose-600 bg-rose-100 dark:bg-rose-950/60 border-rose-200`
* `cancelled`: Batal -> `text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200`

### L.3 Survey Appointment Statuses `[CONFIRMED]`
Defined in `app/(dashboard)/surveys/page.tsx:59-83`:
* `scheduled`: Terjadwal -> `text-blue-600 bg-blue-100 dark:bg-blue-950/60 border-blue-200`
* `completed`: Selesai -> `text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200`
* `cancelled`: Dibatalkan -> `text-rose-600 bg-rose-100 dark:bg-rose-950/60 border-rose-200`
* `no_show`: Tidak Hadir -> `text-amber-600 bg-amber-100 dark:bg-amber-950/60 border-amber-200`

---

## M. ICONOGRAPHY SPECIFICATION

* **Icon Library:** Lucide React `1.24.0`.
* **Standard Sizing Rules `[CONFIRMED]`:**
  * Form Fields / Inline Chips: `w-3.5 h-3.5` or `w-4 h-4` (14px - 16px).
  * Standalone Icon Buttons: `size-8` or `size-9` (32px - 36px).
  * Metric / Stat Box Icons: `w-5 h-5` (20px).
  * Floating Chat / Big CTAs: `h-5 w-5` to `h-6 w-6` (20px - 24px).
* **Stroke Widths `[CONFIRMED]`:**
  * Default: Standard Lucide stroke (`stroke-[2]`).
  * Inactive Bottom Nav: `stroke-[1.75]`.
  * Active Bottom Nav / Checkmarks: `stroke-[2.5]`.
* **Icon-Only Buttons:** Must always include an accessible `title="..."` or `aria-label="..."` attribute (e.g. `PageHeader`, `ThemeToggle`, `RefreshCw`).

---

## N. MOTION & INTERACTION SPECIFICATION

### N.1 CSS Keyframes (`app/globals.css:186-205`) `[CONFIRMED]`
* **Animation Name:** `fadeInUp`
  * From: `opacity: 0; transform: translateY(20px) scale(0.985);`
  * To: `opacity: 1; transform: translateY(0) scale(1);`
  * Timing Curve: `cubic-bezier(0.22, 1, 0.36, 1)` (smooth deceleration).
* **Stagger Utility Classes:**
  * `.fade-in-up`: duration `0.55s`, delay `0s`
  * `.fade-in-up-1`: duration `0.55s`, delay `0.06s`
  * `.fade-in-up-2`: duration `0.60s`, delay `0.12s`
  * `.fade-in-up-3`: duration `0.60s`, delay `0.18s`
  * `.fade-in-up-4`: duration `0.65s`, delay `0.24s`
  * `.fade-in-up-5`: duration `0.65s`, delay `0.30s`
* **Reduced Motion Compliance:** `@media (prefers-reduced-motion: reduce)` removes translateY/scale transforms and applies pure opacity fades.

### N.2 Framer Motion Interactions `[CONFIRMED]`
* **Property Creation Wizard (`CreatePropertyWizard.tsx`):** Employs `<AnimatePresence mode="wait">` with `<motion.div>` for lateral slide transitions (`x: 20 -> 0 -> -20`, `transition: { duration: 0.2 }`).
* **Hover Micro-interactions:**
  * Cards: `hover:scale-[1.01]` or `hover:shadow-lg` (`PropertyCard.tsx`).
  * Floating AI Button: `hover:scale-105` (`AIChatWidget.tsx`).
  * Social Icons: `hover:scale-110` (`SiteFooter.tsx`).

---

## O. RESPONSIVE DESIGN SPECIFICATION

* **Breakpoint Grid:** Tailwind defaults (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`).
* **Mobile Patterns (< 768px):**
  * `BottomNav` fixed at bottom; `pb-28` clearance on scroll container.
  * Single-column form stacks; multi-step stepper displayed as horizontal progress bar.
  * Kanban collapses to single active stage tab view.
  * Input font-size set to `text-base` to prevent iOS WebKit auto-zooming.
* **Tablet Patterns (768px - 1024px):**
  * Two-column grids for property catalogs and form fields.
  * Horizontal Kanban board scrolling with touch scrollbars.
* **Desktop Patterns (>= 1024px):**
  * Three- and four-column grids for properties (`lg:grid-cols-3 xl:grid-cols-4`).
  * Sticky right-rail columns on property detail views (`sticky top-6`).
  * Full multi-swimlane Kanban boards with drag-and-drop.

---

## P. ACCESSIBILITY REALITY AUDIT

### P.1 Implemented Strengths `[CONFIRMED]`
* **Focus Indicators:** Base UI components define explicit `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.
* **Screen Reader Hooks:** Sheet drawers include `<SheetTitle className="sr-only">Navigasi Sidebar</SheetTitle>` to satisfy Radix/Base UI dialog accessibility requirements.
* **Touch Targets:** Buttons and navigation links maintain 40px - 44px touch targets on mobile viewports (`min-h-9` on legal links, `h-10` on form triggers).
* **Tabular Numbers:** Financial figures and listing prices consistently use `tabular-nums` to prevent layout shift during calculation animations.

### P.2 Areas of Weakness / Inconsistency `[POTENTIAL ISSUE]`
* **Raw Icon Buttons:** Several utility buttons (e.g. table actions in invoices) lack explicit `aria-label`, relying only on visual icons.
* **Client-Side Form Bypasses:** `LeadCaptureModal.tsx` renders native `<input>` and `<textarea>` elements without associated `id` and `htmlFor` pairings on labels.

---

## Q. DARK MODE IMPLEMENTATION

* **Theme Provider:** `next-themes` with `attribute="class"` (`<html className="dark">`).
* **Surface Inversion:**
  * Light: `#ffffff` surface, `#0f172a` text, `#e2e8f0` border.
  * Dark: `#0f172a` body background, `#1e293b` card surface, `#f1f5f9` text, `#334155` border.
* **Input Treatment in Dark Mode:** Base UI inputs inject `dark:bg-input/30 dark:disabled:bg-input/80`, creating translucent dark surfaces over dark card containers.
* **Locked Palette Exemption:** `SiteFooter.tsx` (`bg-[#0E2C24]`) and legal header rules intentionally remain dark forest green across both light and dark modes to preserve brand identity.

---

## R. DESIGN INCONSISTENCIES AUDIT

The following table documents verified visual discrepancies between base design primitives and feature-level implementations:

| Inconsistency Area | Location A (Base Primitive) | Location B (Feature Implementation) | Likely Canonical Pattern | Confidence |
|---|---|---|---|:---:|
| **Button Heights** | `components/ui/button.tsx`: Default `h-8` (32px), `lg` `h-9` (36px) | `DashboardHeader`, `login/page.tsx`, `crm/leads/create`: `h-10` (40px) or `h-11` (44px) | `h-8` for dense tables/toolbars; `h-10` for primary page/modal CTAs | `[CONFIRMED]` |
| **Card Corner Radius** | `components/ui/card.tsx`: `rounded-xl` (12px) | `PropertyCard.tsx`, `AdminStatsGrid.tsx`, `KpiCard.tsx`: `rounded-2xl` (16px) | `rounded-2xl` for domain feature cards; `rounded-xl` for inner cards | `[CONFIRMED]` |
| **Card Border Treatment** | `components/ui/card.tsx`: borderless `ring-1 ring-foreground/10` | Feature Cards: `border border-border/60` or `border border-border/80` | `border border-border/80` is overwhelmingly preferred in feature pages | `[CONFIRMED]` |
| **Property Card Ratio** | `components/properties/PropertyCard.tsx`: `aspect-[16/9]` | `components/dashboard/DashboardPropertyCard.tsx`: `aspect-[16/10]` | `aspect-[16/9]` is canonical for listing photography; `16/10` is legacy | `[CONFIRMED]` |
| **Form Input Primitives** | Most forms use `@/components/ui/input` | `LeadCaptureModal.tsx`: Uses native `<input className="h-10 px-3 rounded-xl border border-border">` | All forms should use `@/components/ui/input` | `[CONFIRMED]` |
| **Status Badge Radii** | `components/ui/badge.tsx`: `rounded-4xl` (full pill) | Feature pages: Often pass `rounded-lg` or `rounded-md` manually | Pill `rounded-full` for status badges; `rounded-md` for technical chips | `[CONFIRMED]` |
| **Combobox Trigger Radius** | `crm/leads/create/page.tsx:449`: `rounded-md` | Form inputs in same form: `rounded-xl` | `rounded-xl` should be used uniformly in modern forms | `[CONFIRMED]` |

---

## S. CANONICAL INLAND PATTERNS

Patterns confirmed as the canonical design standard of Inland Property:

1. **Page Headers (`PageHeader.tsx`):**
   * Use `PageHeader` with `/bg-header.webp`, `rounded-[1.5rem]`, white title text, and an emerald subtitle for all hero banners and storefront catalogs.
2. **Feature Cards (`Card` with overrides):**
   * Use `rounded-2xl`, `border border-border/80`, and `shadow-xs`. On hover, apply `hover:border-emerald-500/40 hover:shadow-md transition-all duration-300`.
3. **Primary Action Buttons:**
   * Use `bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm` for all primary commitments (Publish, Save, Submit Deal, WhatsApp CTA).
4. **Property Pricing Typography:**
   * Always format via `formatKprCurrency(price)` with `tabular-nums font-black text-emerald-600 dark:text-emerald-400`. Never render raw unformatted numbers.
5. **Listing Code Display:**
   * Always display listing codes in a monospace font pill: `font-mono text-[9px] sm:text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md`.
6. **Mobile Navigation:**
   * Always preserve the fixed 5-item `BottomNav` with dynamic role detection, top active accent indicator (`w-8 h-1 bg-emerald-600 rounded-b-full`), and safe-area padding.

---

## T. DO NOT INTRODUCE (ANTI-PATTERNS)

Based on actual repository inspection, future AI assistants must **NOT** introduce:

1. **Arbitrary Gradients on Content Cards:** Content cards must use clean solid backgrounds (`bg-card`). Do not introduce multicolored mesh gradients or purple/pink neon SaaS backgrounds on standard cards.
2. **Excessive Elevation / Deep Floating Shadows:** Do not use `shadow-2xl` on ordinary cards. Inland Property uses crisp borders (`border-border/80`) with `shadow-xs` or `shadow-sm`.
3. **Generic 40px/48px Button Heights Everywhere:** Do not blindly replace compact toolbars with large buttons. Tables, filters, and toolbars in Inland Property intentionally use compact `h-8` (32px) heights to preserve high information density.
4. **Unwatermarked Property Photography:** Never display property photos on public pages without routing through `WatermarkedImage` or applying the overlay watermark badge.
5. **Overriding Corporate Brand Colors:** Never replace `#0E2C24` (Forest Green) or `#E2B23B` (Gold) in `SiteFooter.tsx`, invoice headers, or legal articles with generic Tailwind primary tokens.
6. **Destructive Direct In-Place Editing of CRM Server Actions:** Never modify Server Actions in `actions/` to change UI formatting; UI logic belongs in components.

---

## U. RULES FOR FUTURE AI UI CHANGES

1. **Inspect Before Creating:** Check `components/ui/` and `components/` before creating a new component. If modifying pagination, use `NumberedPagination.tsx`. If displaying property photos, use `WatermarkedImage.tsx`.
2. **Follow the Tiered Radius Hierarchy:** Use `rounded-lg` (8px) for buttons/inputs, `rounded-xl` (12px) for dialogs/inner panels, and `rounded-2xl` (16px) for cards.
3. **Respect Compact Mode:** When designing tables, grids, or data cards, ensure styles support `html.compact-mode` and do not break when row heights contract.
4. **Maintain Mobile Clearance:** When building full-page views, always verify that the bottom content is padded with `pb-28 sm:pb-24 md:pb-6` so it is not obscured by the mobile `BottomNav`.
5. **Honor Role-Based Visibility:** Respect permissions (`usePermissions()`) and status masking (e.g. non-admins seeing `"08xx-xxxx-xxxx"` in CRM views).
6. **Use Existing Currency Formatters:** Format Rupiah amounts using `formatKprCurrency()` or `formatCompactRupiah()` from `lib/kpr.ts`.
7. **Preserve Next.js 16 Gatekeeper Rules:** Never add redirects or middleware in `middleware.ts`. All interceptor logic resides in `proxy.ts`.

---

## V. COMPONENT DISCOVERY MAP

```text
UI Primitive (components/ui/)       Feature Component (components/)             Page Consumer (app/)
─────────────────────────────────   ──────────────────────────────────────      ─────────────────────────────────
button.tsx                          PropertyActionMenu.tsx                   →  app/(dashboard)/properties/[id]
                                    DashboardHeader.tsx                      →  app/(dashboard)/dashboard
                                    PrintInvoiceButton.tsx                   →  app/(dashboard)/invoices

input.tsx / textarea.tsx            LeadCaptureModal.tsx                     →  app/(dashboard)/properties/[id]
                                    CreatePropertyWizard.tsx (Steps 1-7)     →  app/(dashboard)/properties/create
                                    BrandingTab.tsx / ProfileTab.tsx         →  app/(dashboard)/settings

card.tsx                            PropertyCard.tsx                         →  app/(dashboard)/properties
                                    DashboardPropertyCard.tsx                →  app/(dashboard)/dashboard
                                    AdminStatsGrid.tsx / AgentStatsGrid.tsx  →  app/(dashboard)/dashboard
                                    SidebarStepper.tsx                       →  app/(dashboard)/properties/create

dialog.tsx / sheet.tsx              AppSidebar.tsx (via Sheet)               →  app/(dashboard)/layout
                                    PropertyGallery.tsx (Lightbox)           →  app/(dashboard)/properties/[id]
                                    LeadCaptureModal.tsx                     →  Global lead capture hooks

table.tsx                           CrmKanbanBoard.tsx / Lead Table          →  app/(dashboard)/crm/leads
                                    InvoicesTable                            →  app/(dashboard)/invoices
                                    SurveyTable                              →  app/(dashboard)/surveys

pagination.tsx                      NumberedPagination.tsx                   →  app/(dashboard)/properties
```

---

## W. DUPLICATION AUDIT

| Component A | Component B | Architectural & Visual Difference | Likely Canonical | Risk & Recommendations |
|---|---|---|---|---|
| `components/properties/PropertyCard.tsx` | `components/dashboard/DashboardPropertyCard.tsx` | `PropertyCard` uses `16/9` aspect ratio, admin 3-dots action menu, and standard badge; `DashboardPropertyCard` uses `16/10` aspect ratio, agent avatar footer, and distinct specs chips. | `PropertyCard.tsx` is the canonical catalog card; `DashboardPropertyCard.tsx` is a specialized dashboard variant. | Modifying one card does not update the other. Future work should unify them with a `variant="catalog" \| "dashboard"` prop. |
| `components/ui/pagination.tsx` | `components/properties/NumberedPagination.tsx` | `ui/pagination.tsx` is a raw shadcn/Base UI primitive; `NumberedPagination.tsx` is a domain component with URL-search-param synchronization, Indonesian labels ("Sebelumnya"/"Berikutnya"), and ellipsis algorithms. | `NumberedPagination.tsx` is canonical for all pages requiring query-string pagination. | Do not use `ui/pagination.tsx` directly on pages without URL param wrapping. |
| `components/crm/lead-contact-card.tsx` | Inline contact renderers in `crm/leads/[id]` | `lead-contact-card.tsx` fetches contact asynchronously via API route; `crm/leads/[id]` renders pre-joined contact data directly from SSR query. | Inline server-joined data is canonical for SSR; `lead-contact-card.tsx` is suitable for lazy client dialogs. | Low risk; ensure phone masking logic remains consistent across both. |

---

## X. FILE REFERENCE MAP

* **Global Design Tokens & CSS Variables:** [`app/globals.css`](file:///d:/Workspace/plms/app/globals.css)
* **Root HTML Layout & Font Injection:** [`app/layout.tsx`](file:///d:/Workspace/plms/app/layout.tsx)
* **Application Shell Layout (Header, Main, Footer, BottomNav):** [`app/(dashboard)/layout.tsx`](file:///d:/Workspace/plms/app/%28dashboard%29/layout.tsx)
* **Site Identity & Corporate Footer:** [`components/layout/SiteFooter.tsx`](file:///d:/Workspace/plms/components/layout/SiteFooter.tsx), [`lib/site-config.ts`](file:///d:/Workspace/plms/lib/site-config.ts)
* **Mobile Bottom Navigation:** [`components/layout/BottomNav.tsx`](file:///d:/Workspace/plms/components/layout/BottomNav.tsx)
* **Slide-out Sidebar Navigation:** [`components/dashboard/app-sidebar.tsx`](file:///d:/Workspace/plms/components/dashboard/app-sidebar.tsx)
* **Hero Banner System:** [`components/dashboard/PageHeader.tsx`](file:///d:/Workspace/plms/components/dashboard/PageHeader.tsx)
* **Property Catalog Card:** [`components/properties/PropertyCard.tsx`](file:///d:/Workspace/plms/components/properties/PropertyCard.tsx)
* **Watermarked Image Component:** [`components/ui/WatermarkedImage.tsx`](file:///d:/Workspace/plms/components/ui/WatermarkedImage.tsx)
* **CRM Kanban Board:** [`components/crm/CrmKanbanBoard.tsx`](file:///d:/Workspace/plms/components/crm/CrmKanbanBoard.tsx)
* **Property Creation Wizard:** [`components/create-property/CreatePropertyWizard.tsx`](file:///d:/Workspace/plms/components/create-property/CreatePropertyWizard.tsx)
* **Mortgage Calculation Engine:** [`lib/kpr.ts`](file:///d:/Workspace/plms/lib/kpr.ts)
* **Floating Agnes AI Chat Widget:** [`components/AIChatWidget.tsx`](file:///d:/Workspace/plms/components/AIChatWidget.tsx)

---

## Y. FINAL DESIGN SNAPSHOT

```text
INLAND PROPERTY VISUAL IDENTITY

Overall aesthetic:
Clean, modern Indonesian real estate enterprise portal combining high-density professional data tables with rich, high-trust storefront listing photography.

Density:
High-density operational shell. Standard toolbar buttons and inputs are compact (32px h-8), expanding to comfortable 40px touch targets on mobile and hero CTAs.

Typography:
Inter (Google Fonts) with strict tabular numbers on currency metrics, paired with an active 3-tier font scaling engine (compact: 14px, normal: 16px, large: 18px).

Primary colors:
- UI Theme Accent: Emerald #059669 (Light) / #10b981 (Dark), with Blue and Purple user options.
- Corporate Identity: Locked Forest Green #0E2C24 and Warm Gold #E2B23B.

Surface treatment:
Crisp neutral containers (White / Dark Slate #1e293b) with 10% foreground rings or border/80 subtle borders. Selective frosted glassmorphism (backdrop-blur-md) on hero badges, image chips, and floating navigation.

Border treatment:
Delicate, subtle borders (border-border/60 or border-border/80) defining structural separation without visual clutter.

Radius:
Strict tiered hierarchy: 8px (Primitives) -> 12px (Dialogs/Inner panels) -> 16px (Cards/Thumbnails) -> 24px (Hero banners/Steppers) -> Full (Badges/Pills).

Shadow:
Intentionally minimal. Standard cards use shadow-xs or flat borders, reserving shadow-lg for card hover states and shadow-2xl for floating overlays (Sheet, Agnes AI).

Motion:
Signature fadeInUp keyframe (0.55s cubic-bezier(0.22, 1, 0.36, 1)) across page navigation, lateral slide transitions in property wizard steps, and 105% scale transforms on card image hover.

Desktop:
Three-zone top header (Logo, Quick Actions, Clock & User tools) with slide-out sheet drawer and multi-column responsive grids.

Mobile:
Fixed 5-tab Bottom Navigation bar, single-stage Kanban column switcher, 44px minimum touch targets, and safe-area inset buffers.

Property experience:
Aspect 16/9 watermarked photography, bold emerald Rupiah pricing, modular specs grids, interactive embedded KPR calculator, and verified agent cards with direct WhatsApp integration.

CRM experience:
Color-coded 7-stage pipeline (New -> Contacted -> Qualified -> Proposal -> Negotiation -> Won -> Lost) with role-based phone number masking, activity timelines, and deal verification controls.

Dashboard experience:
Role-tailored dashboards (Guest storefront, Agent operational desk, Admin command center) powered by 4-column KPI stat cards, AI executive summaries, and interactive business charts.

Most important visual rules:
1. Always route property photography through WatermarkedImage.
2. Maintain the tiered radius hierarchy (Cards = rounded-2xl; Primitives = rounded-lg).
3. Format all listing prices using formatKprCurrency with tabular-nums.
4. Preserve the fixed mobile BottomNav with bottom safe-area clearance (pb-28).
5. Never override the locked corporate footer/invoice palette (#0E2C24 and #E2B23B).
```
