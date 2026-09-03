# PHASE 9 — CONTENT STANDARDIZATION, BILINGUAL LANGUAGE SYSTEM & PRODUCT AUDIT

## 1. Executive Summary
Phase 9 ensures PLMS is ready for a diverse user base by implementing a custom, lightweight bilingual system (Indonesian/English) using Zustand. The default language is standard, simple Indonesian. Key typography was updated to `Plus Jakarta Sans` to inject a premium character into the design, replacing the standard SaaS feel. Property defaults were also hardened to prevent null values during creation.

## 2. Current Product State
The codebase was found to heavily rely on hardcoded Indonesian text throughout all public storefronts and ERP/CRM dashboard interfaces. The default typography was `Inter`, providing a functional but overly generic appearance. 

## 3. Indonesian Language Audit
Findings from the audit revealed several areas for simplification:
- **"Portofolio Saya"** -> Simplified to **"Properti Saya"**
- **"Filter Lanjutan"** -> Simplified to **"Filter"**
- Lengthy instructions and verbose labels were identified for trimming across CRM interfaces.

## 4. English Language Audit
Translations prioritize real-estate context over literal translations.
- "Properti Saya" -> "My Properties"
- "Ajukan KPR" -> "Apply for Mortgage"

## 5. Terminology Dictionary & 6. Unnecessary Words & 7. Foreign Terms
- **Kept in English:** "Leads", "CRM", "Dashboard" (these terms are highly standard in the industry and easily understood by the CRM staff).
- Replaced cumbersome words with simpler equivalents in Indonesian (e.g., "Lihat Detail Properti" -> "Lihat Detail").

## 8. Language Switcher Plan & 9. i18n Architecture Recommendation
- **Architecture:** Implemented a lightweight translation system using Zustand (`lib/store/i18n-store.ts`) for state and `localStorage` for persistence.
- **Hook:** A `useTranslation` hook (`hooks/use-translation.ts`) safely handles client-side hydration.
- **UI:** A `LanguageSwitcher` component was added to both the Public Navbar (`StorefrontNavbar.tsx`) and the ERP Header (`OperationalHeader.tsx`).

## 10. Property Default Audit
- Forms inside `CreatePropertyWizard.tsx` and `StepSpecification.tsx` were updated.
- `land_area`, `building_area`, `bedroom`, and `bathroom` now explicitly default to `0` in both the initial state and the input fallback value (using `?? 0`), avoiding the need for backend schema migrations.

## 11. Font Candidates & 12. Selected Font
- **Candidates:** Plus Jakarta Sans, DM Sans, Manrope.
- **Selected Font:** **Plus Jakarta Sans** (`next/font/google`). It was chosen for its excellent legibility on mobile, strict geometric proportions for numbers, and a distinctly modern, non-mainstream premium character.

## 13. UX Content Findings
- The UI language requires a gradual migration from hardcoded text to the new `t()` translation keys using the newly created dictionaries in `lib/i18n/id.ts` and `lib/i18n/en.ts`.

## 14. Product Audit
- **Public Storefront:** Navigation is smooth, but filtering UI can be further simplified.
- **CRM:** Follow-ups and Leads are functional but could benefit from a unified timeline view.
- **Architecture:** The Server Actions are frozen and secure; the UI layer is stable.

## 15. SEO Audit
- Currently using `app/layout.tsx` for global metadata.
- With the new i18n structure, if SEO requires localized crawling in the future, Next.js Middleware with App Router `[lang]` segments should be explored. For now, client-side toggling serves the immediate UX requirement.

## 16. Mobile Audit
- The new `Plus Jakarta Sans` font renders excellently on smaller viewports.
- The language switcher was optimized (`scale-90`) to fit seamlessly into the crowded mobile header areas.

## 17. P0–P3 Roadmap
- **P0 (Critical):** Complete the systematic replacement of all hardcoded strings with `t()` across the `app/` and `components/` directories.
- **P1 (High Value):** Server-side language detection (via cookies) to prevent initial hydration flashes.
- **P2 (Medium):** Localize API response messages and error toasts.
- **P3 (Later):** Full SEO URL localization (`/id/...` and `/en/...`).

## 18. Risks
- Hydration mismatches during the language store initialization (mitigated by the `mounted` check in `useTranslation`).
- Accidental translation of CRM programmatic filter values (e.g., URL parameters).

## 19. Items Requiring Decision
- Whether to fully transition to `[lang]` Next.js routing for strict SEO compliance in Phase 10.

## 20. Recommended Phase 10
Execute the full rollout of the i18n translation keys across all components and explore Next.js routing integration for SEO-optimized bilingual support.
