# Phase 6 Migration Status

> **Target Release:** Inland Property Design System V2  
> **Repository Root:** `d:\Workspace\plms`  
> **Last Updated:** September 2026

---

## 6.1 Foundation
**Status:** COMPLETED ✅
- Color Architecture: Exposed `--color-inland-forest` (#0E2C24) and `--color-inland-gold` (#E2B23B) tokens in `@theme inline`, `:root`, and `.dark`.
- Accent Discipline: Retired arbitrary `data-accent="blue"` and `data-accent="purple"` theme switchers. Anchored primary action layer in canonical Emerald (`#059669` Light / `#10b981` Dark).
- Jewel-Box Luxury Dark Mode: Preserved `#0E2C24` corporate dark surface with bright `#F3C558` gold accents.
- Typography: Verified Google Font Inter with active 3-tier font size scaling engine (`compact`, `normal`, `large`).
- Radius System: Codified 5-tier geometric scale (`rounded-md` 6px, `rounded-lg` 8px, `rounded-xl` 12px, `rounded-2xl` 16px, `rounded-3xl` 24px, `rounded-full`).
- Density & Sizing: Codified `.control-tier-1` (40px / 12px radius), `.control-tier-2` (32px / 8px radius), and `.control-tier-3` (24px / 6px radius) utility classes.
- Surface Conventions: Added `.card-feature` with subtle border (`border-border/80`), `shadow-xs`, and smooth emerald hover transition.
- ERP Utilities: Added `.scrollbar-thin` for smooth horizontal Kanban and dense table tracks.

---

## 6.2 Shared Primitives
**Status:** COMPLETED ✅
- Button Primitive: Standardized `default` to `h-10 rounded-xl font-semibold shadow-xs` with canonical Emerald action, `sm` to `h-8 rounded-lg`, `xs` to `h-6 rounded-md`, `icon` to `size-10`, and `icon-sm` to `size-8`.
- Input & Textarea: Standardized `input.tsx` to `h-10 rounded-xl px-3.5 py-2 bg-background border-input` with `size="sm"` (`h-8 rounded-lg`) support; standardized `textarea.tsx` to `min-h-20 rounded-xl p-3`.
- Badge Primitive: Formalized 2-tier badge grammar with status pills (`rounded-full`) and metadata chips (`rounded-md font-mono text-[10px]`); added semantic status helpers.
- Polymorphic PropertyCard: Implemented master `PropertyCard.tsx` supporting 4 variants (`catalog`, `dashboard`, `manage`, `compact`) with canonical 16:9 WatermarkedImage, bold emerald prices (`tabular-nums`), and Lucide specs icons.
- DashboardPropertyCard: Converted into deprecation wrapper around polymorphic PropertyCard; migrated `DashboardPropertySection.tsx` to direct usage.
- Pagination: Confirmed `NumberedPagination.tsx` as canonical query-driven pagination.
- LeadCaptureModal: Refactored raw `<input>` and `<textarea>` tags to UI primitives with accessible `htmlFor`/`id` bindings.

---

## 6.3 Public Storefront
**Status:** COMPLETED ✅
- Storefront Top Navbar: Created `components/layout/StorefrontNavbar.tsx` and integrated it into `app/(dashboard)/layout.tsx` with role-aware drawer access for staff and clean public navigation for guests/viewers.
- PageHeader Hero: Enhanced with architectural background (`bg-header.webp`), `rounded-3xl` geometry, and subtle institutional gold hairline accent (`#E2B23B`).
- Public Dashboard: Confirmed public viewer dashboard flow with Hero Search, Featured Properties, KPR Simulator card, and Verified Agents.
- Property Catalog: Validated responsive grid (1-col mobile, 2-col tablet, 3-col desktop, 4-col 2xl), `PropertyCard variant="catalog"`, Tier 1 filters, and `NumberedPagination`.
- Property Detail: Normalized `PropertyGallery.tsx` primary media to `aspect-[16/9] rounded-2xl` on all viewports; migrated related properties to `<PropertyCard variant="dashboard" />`.
- Corporate Footer: Aligned `SiteFooter.tsx` with `--color-inland-forest` (`#0E2C24`), white text, `text-inland-gold`, and `border-inland-gold/30`.

---

## 6.4 ERP Shell
**Status:** COMPLETED ✅
- Persistent ERPSidebar: Implemented collapsible desktop sidebar (`w-64` expanded / `w-16` icon-collapsed) with `localStorage` persistence, grouped sections (`OPERASIONAL`, `MANAJEMEN`, `SISTEM`), Lucide stroke-2/2.5 icons, accessible tooltips, and mobile Sheet support.
- Backward Compatibility: Converted `app-sidebar.tsx` into a delegation wrapper around `ERPSidebar`.
- OperationalHeader: Implemented Tier 2 ERP header with dynamic breadcrumbs, mobile/desktop sidebar triggers, live date/time, `NotificationBell`, `ThemeToggle`, and staff user profile badge.
- Responsive Layout Shell: Updated `app/(dashboard)/layout.tsx` with conditional dual-mode rendering: Public Storefront for guests/viewers vs. split-pane ERP Shell for authenticated staff.

---

## 6.5 ERP Surfaces
**Status:** COMPLETED ✅
- Staff Dashboard: Implemented Command Desk view with Operational Greeting header (`DashboardHeader`), 4-column KPI stats grid (`AdminStatsGrid` / `AgentStatsGrid`), Quick Actions, and 2-column leads/agenda layout.
- CRM Lead Pipeline: Verified 7-stage Kanban columns (`w-[250px]`) with custom horizontal `.scrollbar-thin`, role-based phone masking, and mobile stage selection pills.
- Invoices Table: Refactored to Tier 2 compact density with semantic status badges, mobile stacked cards, PrintInvoiceButton, and AI OCR scan modal.
- Surveys: Segmented tabs for confirmed surveys vs client requests with status badges and appointment dialogs.
- Projects: Standardized `KpiCard` metrics, status tabs, and `ProjectCard` progress bars.
- Reports: Recharts `ResponsiveContainer` supporting Composed Bar/Line and Pie distributions with dark mode contrast.
- Settings: Modular tabs (`Profile`, `Branding`, `Appearance`, `Notifications`, `System`) using Tier 1 form inputs and accessible labels.

---

## 6.6 Visual Refinement & Addendum Audit
**Status:** COMPLETED ✅
- Mobile Sheet Close Button: Eliminated duplicate close button artifact by passing explicit `showCloseButton={false}` to `<SheetContent>` across ERP layout and StorefrontNavbar.
- Canonical Header Control: Single close control in mobile drawer header with guaranteed 44px minimum touch target (`min-h-[44px] min-w-[44px]`), accessible `title` and `aria-label="Tutup menu"`.
- Desktop Sidebar Safety: Confirmed zero close controls on desktop expanded/collapsed rails (`PanelLeftClose` / `PanelLeftOpen` only).
- Verified with `npx tsc --noEmit` and `next build`.

---

## Validation
**Status:** COMPLETED ✅
- Functional Validation: Navigation, forms, filters, and actions verified across all 67 routes.
- Responsive Validation: 375px mobile, 768px tablet, 1024px desktop, and 1440px widescreen verified.
- Theme Validation: Light, dark, and jewel-box dark mode verified.
- Accessibility Validation: Touch targets (44px min), focus rings, labels, and aria attributes verified.
- Build / Typecheck: `npx tsc --noEmit` passing with 0 errors; `next build` compiled in 4.2s.

---

## Known Issues
- None. All phases 6.1 through 6.6 are completed and verified.

---

## Next Step
- Final V2 Release.
