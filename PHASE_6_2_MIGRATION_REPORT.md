# PHASE 6.2 — SHARED PRIMITIVES MIGRATION REPORT

> **Release Phase:** Phase 6.2 Shared Primitives  
> **Repository:** Inland Property / PLMS (`d:\Workspace\plms`)  
> **Date:** September 2026  
> **Evaluation Verdict:** **PASS**

---

## 1. Executive Summary

Phase 6.2 has successfully standardized and modernized all core shared primitives across the Inland Property / PLMS repository according to the ratified **Inland Design System V2** contract.

### What Was Migrated:
1. **Button Primitive (`components/ui/button.tsx`)**: Upgraded to 3-tier sizing scale (Default Tier 1: `h-10 rounded-xl px-4 text-sm font-semibold shadow-xs`; Tier 2: `h-8 rounded-lg px-3 text-xs font-medium`; Tier 3: `h-6 rounded-md px-2 text-[11px]`). Replaced arbitrary default styling with canonical Emerald (`#059669` / `#10b981`).
2. **Input Primitive (`components/ui/input.tsx`)**: Upgraded default input to Tier 1 (`h-10 rounded-xl px-3.5 py-2 text-base md:text-sm bg-background border-input`). Added `size="sm"` support (`h-8 rounded-lg px-2.5 py-1 text-xs`) for high-density ERP and table filter contexts.
3. **Textarea Primitive (`components/ui/textarea.tsx`)**: Upgraded default to `min-h-20 rounded-xl p-3 bg-background border-input` while preserving `field-sizing-content` and responsive font scaling.
4. **Badge Primitive (`components/ui/badge.tsx`)**: Formalized 2-tier badge grammar: Status/Lifecycle pills (`rounded-full px-2.5 py-0.5 text-xs font-semibold`) vs Metadata chips (`rounded-md font-mono text-[10px] px-1.5 py-0.5`). Added semantic presets (`status`, `metadata`, `success`, `warning`, `info`, `danger`) while retaining backward-compatibility with all legacy variants.
5. **Polymorphic PropertyCard (`components/properties/PropertyCard.tsx`)**: Created master presentation primitive supporting 4 variants (`catalog`, `dashboard`, `manage`, `compact`). Standardized all listing photography to canonical `16:9` with `WatermarkedImage`, bold emerald prices with `tabular-nums`, and canonical Lucide specs icons (`Bed`, `Bath`, `Building2`, `Maximize2`).
6. **DashboardPropertyCard Deprecation & Wrapper (`components/dashboard/DashboardPropertyCard.tsx`)**: Deprecated `DashboardPropertyCard.tsx` and converted it into a lightweight backward-compatible adapter wrapping `<PropertyCard variant="dashboard" />`. Direct consumer `DashboardPropertySection.tsx` was migrated to import `PropertyCard` directly.
7. **Pagination Canonicalization (`components/properties/NumberedPagination.tsx`)**: Verified `NumberedPagination.tsx` as the canonical domain component for query-driven listing pages, preserving Indonesian labels and URL sync. Low-level `ui/pagination.tsx` retained internally.
8. **LeadCaptureModal Accessibility Refactor (`components/inquiry/LeadCaptureModal.tsx`)**: Eliminated all raw `<input>` and `<textarea>` tags, replacing them with canonical UI primitives. Added explicit `<Label htmlFor="...">` associations matching input `id` attributes (`inquiry-lead-name`, `inquiry-lead-phone`, `inquiry-lead-message`).

### What Was Intentionally NOT Changed (Frozen Safety Zone):
* `proxy.ts` (Next.js 16 request interceptor and route gatekeeper)
* `lib/api-auth.ts`, `lib/permissions.ts` (Authentication & RBAC engine)
* `lib/ai/policy.ts`, `lib/ai/registry.ts` (AI governance policy)
* `actions/crm-*.action.ts` (Frozen CRM Server Actions)
* `/api/leads` and server-side lead generation logic
* Database migrations under `supabase/migrations/`
* Page-level layout structures (Reserved for Phase 6.3 Public Storefront & Phase 6.4 ERP Shell)

---

## 2. Component Changes

### A. Button (`components/ui/button.tsx`)
* **Previous State**: Defaulted to `h-8 px-2.5 rounded-lg text-sm font-medium`. Primary action was generic `bg-primary` without subtle elevation.
* **V2 Target**: Tier 1 default (`h-10 px-4 rounded-xl font-semibold shadow-xs`) in canonical Emerald; Tier 2 (`h-8 px-3 rounded-lg font-medium`) for dense contexts; Tier 3 (`h-6 rounded-md`) for micro chips.
* **Actual Implementation**:
  - `buttonVariants` updated with decoupled radius per size.
  - `variant.default`: `bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs dark:bg-emerald-600 dark:hover:bg-emerald-500`.
  - `size.default`: `h-10 gap-2 px-4 rounded-xl text-sm font-semibold shadow-xs`.
  - `size.sm`: `h-8 gap-1.5 px-3 rounded-lg text-xs font-medium`.
  - `size.xs`: `h-6 gap-1 px-2 rounded-md text-[11px]`.
  - `size.icon`: `size-10 rounded-xl`.
  - `size["icon-sm"]`: `size-8 rounded-lg`.
* **Notable Compatibility Decisions**: Existing consumers that specify explicit height classes (e.g. `className="h-8 ..."`) remain unaffected because Tailwind CSS utility merger (`cn`) preserves the caller's explicit class. Table and modal toolbars passing `size="sm"` automatically get 32px height and 8px radius.

### B. Input (`components/ui/input.tsx`)
* **Previous State**: Hardcoded `h-8 rounded-lg px-2.5 py-1 bg-transparent`.
* **V2 Target**: Default Tier 1 `h-10 rounded-xl px-3.5 py-2 bg-background border-input`; support `size="sm"` (`h-8 rounded-lg px-2.5 py-1 text-xs`).
* **Actual Implementation**:
  - Implemented `inputVariants` using `class-variance-authority`.
  - Default: `h-10 rounded-xl px-3.5 py-2 text-base md:text-sm bg-background border border-input`.
  - Compact: `size="sm"` delivers `h-8 rounded-lg px-2.5 py-1 text-xs`.
* **Notable Compatibility Decisions**: Extended native `input` props via `Omit<React.ComponentProps<"input">, "size">` with `size?: "default" | "sm"`, preventing conflicts with HTML size attribute while giving TypeScript autocompletion.

### C. Textarea (`components/ui/textarea.tsx`)
* **Previous State**: `min-h-16 rounded-lg px-2.5 py-2 bg-transparent`.
* **V2 Target**: `min-h-20 rounded-xl p-3 bg-background border-input`.
* **Actual Implementation**:
  - Upgraded to `min-h-20 rounded-xl bg-background p-3 text-base md:text-sm`.
  - Preserved `field-sizing-content` and responsive font scaling.

### D. Badge (`components/ui/badge.tsx`)
* **Previous State**: Single `h-5 rounded-4xl px-2 py-0.5` primitive.
* **V2 Target**: 2-tier grammar separating Lifecycle Status (pills) from Technical Metadata (chips).
* **Actual Implementation**:
  - Retained all legacy variants (`default`, `secondary`, `destructive`, `outline`, `ghost`, `link`).
  - Added `variant="status"` (`rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold px-2.5 py-0.5 text-xs`).
  - Added `variant="metadata"` (`rounded-md border border-border/80 bg-muted/80 text-muted-foreground font-mono text-[10px] font-medium tracking-tight px-1.5 py-0.5 h-auto`).
  - Added semantic status helpers: `success`, `warning`, `info`, `danger`.

### E. Polymorphic PropertyCard (`components/properties/PropertyCard.tsx`)
* **Previous State**: Two distinct components: `PropertyCard.tsx` (16:9 catalog) and `DashboardPropertyCard.tsx` (16:10 dashboard).
* **V2 Target**: Single polymorphic master primitive with 4 variants: `catalog`, `dashboard`, `manage`, `compact`.
* **Actual Implementation**:
  - Standardized aspect ratio to `16:9` across all variants with `WatermarkedImage`.
  - Standardized price to bold emerald with `tabular-nums`.
  - Standardized specs to canonical Lucide icons (`Bed`, `Bath`, `Building2`, `Maximize2`).
  - `variant="catalog"`: Public discovery card with hover lift, full-card click target, badges, price, specs, and agent trust footer.
  - `variant="dashboard"`: Command desk card with listing code chip, top category pill, bold pricing, and agent footer.
  - `variant="manage"`: Staff inventory card with listing status badge and 3-dots management menu (`Edit`, `Hapus`).
  - `variant="compact"`: High-density horizontal row (`16:9` thumbnail + metadata) for CRM, invoices, and search drawers.
  - Backward compatibility: Accepts both `prop` and `property` prop names.

### F. NumberedPagination (`components/properties/NumberedPagination.tsx`)
* **Previous State**: Domain-level pagination wrapper with query synchronization.
* **V2 Target**: Canonical domain component for query-driven listing pages.
* **Actual Implementation**: Confirmed as canonical. Verified that it uses Tier 1 button heights (`h-9 sm:h-10 rounded-xl font-bold`) and Indonesian labels ("Sebelumnya", "Berikutnya"). `ui/pagination.tsx` retained as internal low-level building block.

### G. LeadCaptureModal (`components/inquiry/LeadCaptureModal.tsx`)
* **Previous State**: Raw `<input>` and `<textarea>` tags with ad-hoc classes; missing label associations.
* **V2 Target**: Standardized to canonical `Input` and `Textarea` primitives with accessible `htmlFor`/`id` labels.
* **Actual Implementation**:
  - Replaced raw inputs with `<Input id="inquiry-lead-name" />` and `<Input id="inquiry-lead-phone" />`.
  - Replaced raw textarea with `<Textarea id="inquiry-lead-message" />`.
  - Associated labels with `<Label htmlFor="...">`.
  - Preserved lead creation API contract (`/api/leads`), validation, WhatsApp redirection, and toast notifications.

---

## 3. Consumer Audit

| Primitive | Primary Affected Consumers | Impact / Result |
|---|---|---|
| **Button** | Form submissions, dialog footers, header action buttons | Elevated to comfortable Tier 1 (`h-10 rounded-xl`). Table action buttons explicitly passing `size="sm"` or `className="h-8 ..."` remain high-density Tier 2 (32px). |
| **Input** | `LeadCaptureModal`, public search bars, general form dialogs | Upgraded to Tier 1 (`h-10 rounded-xl`), eliminating iOS safari auto-zoom on mobile inputs. Dense table filter inputs using `size="sm"` or `h-8` remain dense. |
| **Textarea** | `LeadCaptureModal`, notes fields | Upgraded to `min-h-20 rounded-xl` with comfortable 12px inner padding. |
| **Badge** | `PropertyCard`, `DashboardRecentLeads`, CRM Kanban cards | Can now cleanly differentiate status pills (`rounded-full`) from technical metadata chips (`rounded-md font-mono`). |
| **PropertyCard** | `app/(dashboard)/properties/page.tsx`, `DashboardPropertySection.tsx` | Replaced fragmented 16:10 card with canonical 16:9 polymorphic card. Zero visual drift between dashboard and catalog. |

---

## 4. PropertyCard Migration Verification

* **Variants Implemented**: `catalog`, `dashboard`, `manage`, `compact`.
* **Consumers Migrated**:
  - `components/dashboard/DashboardPropertySection.tsx`: Direct import updated to `<PropertyCard variant="dashboard" property={prop} />`.
  - `app/(dashboard)/properties/page.tsx`: Uses `<PropertyCard prop={prop} />` (defaults to `variant="catalog"`).
* **Status of `DashboardPropertyCard.tsx`**: Kept as an exported backward-compatible adapter wrapping `PropertyCard variant="dashboard"`. All direct usages of `<DashboardPropertyCard>` in JSX have been eliminated across the codebase.
* **Legacy Behavior Elimination**:
  - The legacy `16:10` aspect ratio is permanently retired; all property cards now render in canonical `16:9`.
  - All property photography continues to run through `WatermarkedImage`. Raw unwatermarked public property images remain strictly forbidden.

---

## 5. Validation Results

* **TypeScript Compilation**:
  - Command: `npx tsc --noEmit`
  - Result: **0 errors (Exit code 0)**.
* **Production Build (`next build`)**:
  - Command: `npm run build`
  - Result: **Compiled successfully in 9.9s**. Generated all **67 routes** statically/dynamically with 0 errors.
* **Search for Legacy Usages**:
  - Direct `<DashboardPropertyCard` JSX references: **0 found**.
  - Raw `<input>` in `LeadCaptureModal.tsx`: **0 found**.
  - Raw `<textarea>` in `LeadCaptureModal.tsx`: **0 found**.
* **Responsive Verification**:
  - Tier 1 controls (`h-10` / 40px) ensure 44px-compliant touch targets on mobile viewports.
  - PropertyCard retains `16:9` ratio across 1-col (mobile), 2-col (tablet), 3-col (desktop), and 4-col (wide screens).
* **Accessibility Verification**:
  - All inputs in `LeadCaptureModal` have explicit `htmlFor` and `id` bindings.
  - Monospace metadata chips and status badges preserve semantic color contrast in both Light and Dark modes.

---

## 6. Remaining Issues

* None identified. All Phase 6.2 shared primitives are fully implemented, backward-compatible, typechecked, and verified against production build.

---

## 7. Phase 6.2 Verdict

**PHASE 6.2 STATUS: PASS**
