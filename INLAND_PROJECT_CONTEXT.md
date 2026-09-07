# INLAND PROPERTY / PLMS — CANONICAL PROJECT CONTEXT & ARCHITECTURAL KNOWLEDGE BASE

> **Document Type:** Canonical Technical & Product Knowledge Document  
> **Target Audience:** AI Coding Assistants, Lead Engineers, and System Architects  
> **Repository Root:** `d:\Workspace\plms`  
> **Source-of-Truth Hierarchy:** Verified Live Code & Database > `CURRENT_STATE.md` > Domain Documentation (`docs/`) > Design Memos  
> **Confidence Notation:**
> - `[CONFIRMED]`: Directly observed and verified in repository code, configuration, or database migrations.
> - `[INFERRED]`: Reasoned deduction based on implementation patterns and architectural evidence.
> - `[UNKNOWN]`: Explicitly unconfirmed or missing from repository files.

---

## 1. PROJECT IDENTITY

### 1.1 Core Metadata
* **Project Name `[CONFIRMED]`:** PLMS (Property & Lead Management System)
* **Brand Name `[CONFIRMED]`:** Inland Property
* **Tagline `[CONFIRMED]`:** "Property Listing & CRM Management System" (`lib/site-config.ts:11`)
* **Legal / Contact Identity `[CONFIRMED]`:**
  * Operating Entity: Inland Property (`lib/site-config.ts:9`)
  * Official Address: Jl. Hartono Raya, Ruko Blok R No. 36, Modernland, Kota Tangerang (`lib/site-config.ts:12`)
  * Official Hotline: 0851 9969 5550 (`lib/site-config.ts:37`)
  * Official Email: `consultaninlandproperty@gmail.com` (`lib/site-config.ts:13`)
  * Social Links: Instagram (`@inlandproperty.id`), TikTok (`@inlandproperty.id`), Facebook (`inlandproperty.id`), YouTube (`@inlandproperty`)
* **Canonical Site URL `[CONFIRMED]`:** Configured via `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`, production domain `https://inlandproperty.site` or `https://www.inlandproperty.site`)

### 1.2 Purpose & Product Description `[CONFIRMED]`
Inland Property / PLMS is a specialized Indonesian real estate platform unifying public property discovery with an internal brokerage Enterprise Management System. It bridges external customer acquisition (property catalog, advanced filtering, multi-location search, KPR financial simulation, public AI chat, and lead capture) with end-to-end back-office real estate operations (pipeline Kanban CRM, agent activity logging, WhatsApp automation via Fonnte, web push notifications via OneSignal, property lifecycle wizards, construction project tracking, survey appointment scheduling, invoice generation, and AI quota governance).

### 1.3 Target Users & Persona Profiles `[CONFIRMED]`
1. **Public Visitor / Guest (`anon`)**: Unauthenticated end-user searching properties, simulating mortgage payments via KPR calculator, chatting with Agnes AI, or submitting inquiries on listings.
2. **Client / Buyer (`viewer`)**: Registered client account. Can browse catalog, save preferences, submit property survey requests (`/surveys`), view own survey schedule, and chat with administration.
3. **Agent (`agent`)**: Real estate broker. Creates and manages assigned properties, handles assigned CRM leads, schedules follow-ups, receives WhatsApp lead alerts, and drafts invoices. Limited to daily AI quotas (5 per feature/day).
4. **Marketing (`marketing`)**: Lead generation specialist. Read-only access to property listings, creates and manages own CRM leads, views reports. Cannot edit or delete property listings.
5. **Admin (`admin`)**: Operational manager. Full access to all property listings, CRM pipeline, invoice approvals, survey coordination, user approvals, and system logs. Unlimited AI usage, but restricted from AI registry configuration.
6. **Super Admin (`super_admin`)**: System executive. Full system privileges including user deletion, role mutations, immutable audit log review, and exclusive access to the Central AI Management Center (`/admin/ai`).
7. **Commissioner (`commissioner`) `[CONFIRMED]`**: Executive stakeholder. Read-only access to CRM data, reports, and property catalogs (`types/user.types.ts:40-44`).

### 1.4 Core Business Workflows `[CONFIRMED]`
```text
1. PROPERTY ONBOARDING & LISTING
   Agent -> 7-Step Create Property Wizard -> Draft in LocalStorage ->
   Form Submission (POST /api/properties) -> Mandatory Agent Assignment Check ->
   Status "published" (Storefront) or "draft" (Internal)

2. LEAD ACQUISITION (STOREFRONT CTA)
   Visitor -> Property Detail / Catalog -> WhatsApp Form / LeadCaptureModal ->
   POST /api/leads (public rate-limited) ->
   DB: crm_contacts + crm_leads (status: "new") + crm_interests ->
   Notification: WhatsApp Alert to Agent via Fonnte + In-App Bell + Push via OneSignal

3. LEAD NURTURING & CRM PIPELINE
   Agent -> CRM Kanban (/crm or /crm/leads) -> Stage Transition:
   [new] -> [contacted] -> [qualified] -> [proposal] -> [negotiation] ->
   AI Follow-up Prompt Generator -> WhatsApp Outreach -> Follow-up Schedule

4. DEAL VERIFICATION & CLOSING
   Lead in [negotiation] -> Agent clicks "Ajukan Deal" (submitCRMDealAction) ->
   deal_state: "pending_verification" ->
   Admin/Super Admin Reviews & Verifies (verifyCRMDealAction) ->
   Lead moves to [won] -> Audit Log Recorded

5. SURVEY & INVOICE WORKFLOWS
   Client/Viewer submits Survey Request -> Agent contacts & schedules Survey ->
   Automated reminder cron (/api/surveys/reminders) ->
   Deal closed -> Agent/Admin drafts Invoice -> Generates printable receipt
```

### 1.5 Current Project Status `[CONFIRMED]`
* **Project Phase:** **PHASE 5 COMPLETE** — Property System Audit, Mobile UX Hardening, Catalog Pagination, and Design Refinement.
* **Build Status:** Production-ready. TypeScript strict check passing (0 errors), Next.js build clean.
* **Security Status:** Frozen Security Zone enforced for all CRM Server Actions, API route auth guards, and RLS policies.

---

## 2. TECHNOLOGY STACK

### 2.1 Frontend `[CONFIRMED]`
* **Framework:** Next.js `16.2.10` (App Router)
* **React Version:** React `19.2.4` & React DOM `19.2.4`
* **Language:** TypeScript `5.x` (`strict: true`, target `ES2017`)
* **Styling Solution:** Tailwind CSS `v4` (`@import "tailwindcss"`, `@theme inline` in `app/globals.css`)
* **Component Architecture:**
  * shadcn/ui (`style: "base-nova"`, `baseColor: "neutral"`)
  * Radix UI primitives (`@radix-ui/react-avatar`, `collapsible`, `progress`, `scroll-area`, `slot`, `tooltip`)
  * Base UI primitives (`@base-ui/react` `1.6.0`)
* **Animation & Interactions:** Framer Motion `12.43.0`, `tailwindcss-animate` `1.0.7`, `tw-animate-css` `1.4.0`
* **Icons:** Lucide React `1.24.0`
* **State Management:**
  * Global Server State: TanStack React Query `v5.101.2` (`@tanstack/react-query`)
  * Client Store: Zustand `5.0.14`
* **Forms & Validation:**
  * React Hook Form `7.81.0`
  * `@hookform/resolvers` `5.4.0`
  * Zod `4.4.3` (Next-gen Zod using `z.email()`, `z.uuid()`, `{ error: "..." }`)
* **UI Utilities & Helpers:**
  * `clsx` `2.1.1` & `tailwind-merge` `3.6.0` (via `cn()` helper in `lib/utils.ts`)
  * `class-variance-authority` `0.7.1`
  * `date-fns` `4.4.0` & `dayjs` `1.11.21`
  * `cmdk` `1.1.1`
  * `react-dropzone` `17.0.0`
  * `embla-carousel-react` `8.6.0`
  * `@dnd-kit/core` `6.3.1`, `@dnd-kit/sortable` `10.0.0` (Kanban drag-and-drop)
  * `recharts` `3.9.2` (Dashboard & Report charts)
  * `sonner` `2.0.7` (Toast notification system)
  * `react-markdown` `10.1.0` & `remark-gfm` `4.0.1`

### 2.2 Backend `[CONFIRMED]`
* **Runtime:** Node.js `>=18.17.0`
* **Framework:** Next.js 16 App Router Route Handlers (`app/api/**/route.ts`)
* **Server Actions:** Next.js Server Actions (`actions/crm-*.action.ts`) marked with `'use server'`
* **Request Interception / Gatekeeper:** `proxy.ts` (Next.js 16 replacement for `middleware.ts`)
* **API Guards:** `lib/api-auth.ts` (`requireAuth`, `requireRole`, `requirePermission`, `getAuthContext`)
* **Service Layer:** Domain service singletons (`services/property.service.ts`, `services/crm.service.ts`, `services/ai.service.ts`, `services/user.service.ts`, `services/project.service.ts`, `services/notification.service.ts`, `services/report.service.ts`, `services/dashboard.service.ts`)
* **Image Processing:** Sharp `0.35.3` (Server-side image compositing, watermarking, metadata inspection)

### 2.3 Database `[CONFIRMED]`
* **Database Engine:** PostgreSQL (Supabase managed instance)
* **Client & ORM:** PostgREST via `@supabase/supabase-js` `2.110.4` and `@supabase/ssr` `0.12.3`
* **Access Modes:**
  * Anonymous / Client Session: `lib/supabase/client.ts` (Browser) and `lib/supabase/server.ts` (Server Component / Route Handler with user cookie)
  * Public Anon Server: `lib/supabase/public.ts` (Read-only public queries bypassing cookies)
  * Elevated Administrative: `lib/supabase/admin.ts` (`createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`)
* **Security & Row Level Security:** Row Level Security (RLS) active across all tables. 29 verified RLS migration files in `supabase/migrations/`.
* **Seed System `[UNKNOWN]`:** No static `seed.sql` found in repository; schema baseline and lookup tables populated via migrations and administrative scripts.

### 2.4 Infrastructure & Integrations `[CONFIRMED]`
* **Hosting & Deployment:** Vercel (Production configuration present in `.vercel/`, scheduled cron jobs configured)
* **Storage:** Supabase Storage (`property-media` for listing photography; `ktp` for agent identity verification)
* **CDN:** Supabase Storage CDN (`https://adctolhwiltvaorlmmka.supabase.co/storage/v1/object/public/**`) allowed in `next.config.ts`
* **Authentication Provider:** Supabase Auth (Email + Password, Google OAuth 2.0 via `app/auth/callback/page.tsx`)
* **AI Providers (Cascading Fallback Chain):**
  1. Agnes AI (`AGNES_API_KEY`, `AGNES_API_URL` — model `agnes-2.0-flash`)
  2. Groq SDK `1.3.0` (`GROQ_API_KEY` — model `llama-3.3-70b-versatile`)
  3. Google GenAI SDK `2.11.0` / `@google/generative-ai` `0.24.1` (`GEMINI_API_KEY` — fallback models `gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.0-flash` + Vision OCR)
* **Notification Providers:**
  * Web Push: OneSignal REST API + `react-onesignal` `3.5.6` (`OneSignalSDKWorker.js`)
  * WhatsApp: Fonnte WhatsApp Gateway API (`FONNTE_TOKEN`)
* **Maps & Geo:** Coordinates stored (`latitude`, `longitude`); map links rendered to Google Maps and Waze (`components/property-detail/PropertyLocationMap.tsx`). No third-party map tiles API key required.
* **Analytics `[UNKNOWN]`:** No Google Analytics, PostHog, or Mixpanel SDK detected in codebase.

---

## 3. REPOSITORY STRUCTURE

```text
plms/
├── actions/                         # FROZEN SECURITY ZONE: Server Actions for mutations
│   ├── crm-contacts.action.ts       # Contact creation, update, deletion
│   ├── crm-followups.action.ts      # Follow-up scheduling, status transitions
│   ├── crm-interests.action.ts      # Property interest binding and sync
│   └── crm-leads.action.ts          # Pipeline transitions, deal verification, bulk actions
├── app/                             # Next.js 16 App Router
│   ├── (dashboard)/                 # Route Group: Internal shell (URL segment omitted)
│   │   ├── admin/                   # Administrative modules (users, logs, AI, support)
│   │   ├── crm/                     # CRM: Pipeline Kanban, Leads table, Follow-ups
│   │   ├── dashboard/               # Personalized Dashboard (Admin, Agent, Viewer)
│   │   ├── invoices/                # Invoice drafting, viewing, and thermal/A4 print
│   │   ├── kpr-calculator/          # Interactive mortgage simulation engine
│   │   ├── legal/                   # Terms, Privacy, Disclaimer, Copyright pages
│   │   ├── notifications/           # User notification center
│   │   ├── projects/                # Construction project tracking
│   │   ├── properties/              # Property catalog, create wizard, detail, edit
│   │   ├── reports/                 # Business performance metrics & charts
│   │   ├── settings/                # Profile, Branding, Notifications, Appearance
│   │   ├── surveys/                 # Survey request handling and field appointments
│   │   ├── layout.tsx               # App shell layout (Sidebar, Header, BottomNav, Footer)
│   │   └── page.tsx                 # Root redirect ("/" -> "/dashboard")
│   ├── api/                         # REST Route Handlers
│   │   ├── admin/                   # Admin endpoints (AI settings, audit log, users)
│   │   ├── agents/                  # Public agent directory
│   │   ├── ai/                      # AI generation endpoints (followup, text, scan-invoice)
│   │   ├── auth/                    # Agent registration and verification endpoints
│   │   ├── chat/                    # Public AI customer service chat (Agnes)
│   │   ├── dashboard/               # Executive summary generator
│   │   ├── followups/               # Followup processing and overdue cron handler
│   │   ├── invoices/                # Invoice printing endpoints
│   │   ├── leads/                   # Lead ingestion and assignment
│   │   ├── locations/               # Region lookup search (Supabase regions)
│   │   ├── media/                   # Authenticated media upload & watermarking
│   │   ├── notifications/           # Push and WhatsApp dispatchers
│   │   ├── parse-listing/           # AI raw listing text parser
│   │   ├── properties/              # Property CRUD, status update, agent assign
│   │   ├── support/                 # Internal support ticket messaging
│   │   └── surveys/                 # Survey requests, scheduling, reminders cron
│   ├── auth/callback/               # OAuth Google redirect handler page
│   ├── forgot-password/             # Password reset request page
│   ├── login/                       # Authentication portal (Email/Password, Google OAuth)
│   ├── pending-approval/            # Landing page for pending agent accounts
│   ├── register/                    # Client / viewer registration
│   │   └── agent/                   # Multi-step agent application with KTP upload
│   ├── globals.css                  # Tailwind CSS 4 theme tokens, color accents, animations
│   ├── layout.tsx                   # Root HTML layout, ThemeProvider, Sonner Toaster, Agnes Widget
│   ├── robots.ts                    # Dynamic robots.txt metadata route
│   └── sitemap.ts                   # Dynamic sitemap.xml with hourly ISR cache
├── components/                      # UI Component System
│   ├── admin/                       # Audit trail, user admin components
│   ├── create-property/             # 7-Step Property Creation Wizard and steps
│   ├── crm/                         # Kanban board, activity monitor, contact cards
│   ├── dashboard/                   # Role-based dashboard views (Admin, Agent, Viewer)
│   ├── inquiry/                     # LeadCaptureModal inquiry dialog
│   ├── invoices/                    # Printable invoice layout and buttons
│   ├── layout/                      # SiteFooter, BottomNav
│   ├── legal/                       # Legal article components
│   ├── projects/                    # Construction project cards
│   ├── properties/                  # PropertyCard, NumberedPagination
│   ├── property-detail/             # Modular property detail blocks (gallery, KPR, specs)
│   ├── providers/                   # OneSignal push notification provider
│   ├── settings/                    # Profile, Branding, System, Notification tabs
│   └── ui/                          # shadcn/ui atomic design primitives
├── docs/                            # Architectural & CRM domain documentation
│   └── crm/                         # Comprehensive CRM governance and schema baseline
├── hooks/                           # Reusable React hooks (permissions, user, lead-capture)
├── lib/                             # Shared business logic and infrastructure utilities
│   ├── ai/                          # AI Central Feature Registry & Authorization Policy
│   ├── supabase/                    # Supabase client instances (client, server, admin, public)
│   ├── api-auth.ts                  # Route Handler guard functions (requireAuth, requireRole)
│   ├── audit-log.ts                 # Immutable admin audit trail writer
│   ├── crm-pipeline.ts              # Pipeline stages, valid transitions, lost reasons
│   ├── fonnte.ts                    # WhatsApp message dispatcher via Fonnte API
│   ├── kpr.ts                       # Mathematical KPR calculation and amortization engine
│   ├── onesignal.ts                 # Web push dispatcher via OneSignal REST API
│   ├── permissions.ts               # Role definitions, hierarchy levels, route accessibility
│   ├── property-address.ts          # Indonesian regions parser and address builder
│   ├── property-publish.ts          # Agent requirement publishing rule enforcer
│   ├── rate-limit.ts                # In-memory token bucket rate limiter
│   ├── site-config.ts               # Canonical site metadata, social links, legal links
│   ├── validations.ts               # Zod 4 request validation schemas
│   └── watermark.ts                 # Sharp-based image watermarking utility
├── proxy.ts                         # Next.js 16 request interceptor (optimistic auth & apex redirect)
├── public/                          # Static assets (watermark.png, logos, OneSignal SDK worker)
├── scripts/                         # Operational & verification scripts (verify-rls.mjs)
├── services/                        # Service layer singletons for database & business logic
├── supabase/migrations/             # 29 SQL migration files establishing live database schema
├── test-scenarios/                  # Manual test plans and scenario definitions
└── types/                           # TypeScript ambient interfaces and union types
```

---

## 4. APPLICATION ARCHITECTURE

### 4.1 System Topology Diagram `[CONFIRMED]`

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CLIENT / BROWSER                                                                 │
│  ├─ Next.js 16 Pages & Client Components (React 19)                              │
│  ├─ Form State: React Hook Form + Zod v4 (Client-side validation)               │
│  ├─ Global State: TanStack Query v5 + Zustand                                    │
│  ├─ Push Client: OneSignal SDK v3.5.6 (ServiceWorker in /OneSignalSDKWorker.js)   │
│  └─ Chat Widget: AIChatWidget (Floating Agnes AI assistant)                      │
└───────────────────────────────┬───────────────────────────────┬─────────────────┘
                                │                               │
                   Read Operations (RLS)              Mutations / AI / System
                                │                               │
                                ▼                               ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────────┐
│ POSTGREST / SUPABASE API                      │ │ NEXT.JS 16 SERVER CORE        │
│  ├─ Client Supabase Client (@supabase/ssr)    │ │  ├─ Gatekeeper: proxy.ts      │
│  ├─ Authenticated by user JWT cookie          │ │  ├─ Server Actions (actions/) │
│  └─ Database RLS Policies enforce isolation   │ │  ├─ Route Handlers (app/api/) │
│                                               │ │  ├─ AI Policy: authorizeAI()  │
│                                               │ │  └─ Audit: recordAudit()      │
└───────────────────────┬───────────────────────┘ └──────────────┬────────────────┘
                        │                                        │
                        │                                        │ Service Role Client
                        │                                        │ (bypasses RLS)
                        ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL DATABASE                                                    │
│  ├─ Tables: properties, crm_*, surveys, invoices, projects, users, ai_*        │
│  ├─ Triggers & Sequences: next_listing_number, user timestamps                  │
│  └─ Database Level Constraints & Check Policies                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                        ▲
                        │ Webhooks / REST Calls
┌───────────────────────┴─────────────────────────────────────────────────────────┐
│ EXTERNAL CLOUD SERVICES                                                         │
│  ├─ OneSignal REST API (Targeted push to specific user external IDs)            │
│  ├─ Fonnte WhatsApp Gateway (Lead alerts & daily follow-up digests)             │
│  ├─ Multi-Provider AI Fallback: Agnes AI -> Groq LLaMA 3.3 -> Google Gemini     │
│  └─ Supabase Storage S3 Buckets (property-media, ktp)                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Core Architectural Principles `[CONFIRMED]`

#### 1. Dual-Path Read/Write Separation
* **Direct Read Path:** Browser client calls Supabase PostgREST directly using the browser client (`lib/supabase/client.ts`). Database-level Row Level Security (RLS) guarantees that Agents only see their allowed records and Guests only see `published` properties.
* **Controlled Mutation Path:** Sensitive mutations (CRM lead status updates, deal verification, agent assignment) MUST run through Server Actions (`actions/crm-*.action.ts`) or Route Handlers with Service Role credentials (`lib/supabase/admin.ts`). This guarantees audit logging (`admin_audit_log`) and ownership verification that cannot be circumvented in the browser.

#### 2. Three-Tiered Security Guardrails
* **Tier 1 (Perimeter):** `proxy.ts` (Next.js 16 interceptor) checks incoming URLs against user session cookies. Suspended accounts are immediately evicted; pending agent accounts are redirected to `/pending-approval`; unauthenticated visitors are barred from `/crm`, `/admin`, `/invoices`, etc.
* **Tier 2 (Handler Layer):** Route Handlers invoke `requireAuth()` or `requireRole()` from `lib/api-auth.ts`, calling `supabase.auth.getUser()` against Supabase Auth servers (never relying on forged cookies).
* **Tier 3 (Data Layer):** PostgreSQL Row Level Security (RLS) rejects unauthorized operations at the SQL engine level.

#### 3. Centralized AI Governance & Fail-Closed Architecture
* All AI requests (`/api/ai/*`, `/api/parse-listing`, `/api/chat`, `/api/dashboard/summary`) must pass through `authorizeAI()` in `lib/ai/policy.ts`.
* **8-Step Verification:** (1) Authentication check, (2) Master switch check, (3) Feature registry validation, (4) Temporal window verification, (5) Quota mode resolution, (6) User rental/override check, (7) Burst rate limiting, (8) Atomic quota consumption.
* **Fail-Closed Policy:** If the configuration table or quota database is unreachable, AI requests fail closed with HTTP 503 rather than failing open.

---

## 5. ALL ROUTES & PAGES

### 5.1 Public & Storefront Routes

| Route | Purpose | Target Users | Components & Source | Data Sources & API | Auth / Authz | Loading / Empty / Error States |
|---|---|---|---|---|---|---|
| `/` | Root entry | All | `app/(dashboard)/page.tsx` | None | None (Public) | Immediately redirects (`307`) to `/dashboard` |
| `/login` | User sign-in | Guests | `app/login/page.tsx` | Supabase Auth (`signInWithPassword`, `signInWithOAuth`) | Public (Redirects to `/dashboard` if logged in) | Spinner on button during submit; error alerts for bad credentials |
| `/register` | Buyer / Client registration | Guests | `app/register/page.tsx` | Supabase Auth (`signUp`), creates `role: viewer` | Public | Inline error toasts for validation / existing email |
| `/register/agent` | Broker job application | Potential Agents | `app/register/agent/page.tsx` | `POST /api/auth/register-agent`, Supabase Storage (`ktp`) | Public | Form progress steps; file upload indicator; toast notifications |
| `/forgot-password` | Password recovery | All | `app/forgot-password/page.tsx` | Supabase Auth (`resetPasswordForEmail`) | Public | Success card state confirming recovery email sent |
| `/pending-approval` | Agent onboarding holding area | Pending Agents | `app/pending-approval/page.tsx` | `users` table via client | Authenticated (`status: pending`) | Card UI explaining verification in progress with hotline link |
| `/auth/callback` | OAuth Google redirect handler | OAuth Users | `app/auth/callback/page.tsx` | Supabase Auth session exchange | Public | Centered spinner while exchanging authorization code |
| `/dashboard` | Main storefront & operational portal | All (Guests & Authenticated) | `app/(dashboard)/dashboard/page.tsx`, `ViewerDashboardView`, `AgentDashboardView`, `AdminDashboardView` | `propertyService.getList()`, `crmService`, Supabase direct | Dynamic: Public mode for Guests/Viewers; Operational mode for Staff | Skeleton cards during fetch; EmptyState illustrated widget; error boundaries |
| `/properties` | Public property catalog & search | All | `app/(dashboard)/properties/page.tsx`, `DashboardPropertySearch`, `PropertyCard`, `NumberedPagination` | `propertyService.getList()`, PostgREST | Public (Guests see `published`; Agents see own/assigned) | Grid skeleton loaders; "Properti Tidak Ditemukan" empty state with filter reset |
| `/properties/[id]` | Comprehensive property detail view | All | `app/(dashboard)/properties/[id]/page.tsx`, `PropertyDetailClient`, `PropertyGallery`, `PropertyKprSection` | `propertyService.getById()`, JSON-LD in `layout.tsx` | Public (Only `published` visible to public) | Full page skeleton; 404 handler if property does not exist |
| `/kpr-calculator` | Interactive mortgage calculator | All | `app/(dashboard)/kpr-calculator/page.tsx`, `lib/kpr.ts` | Pure client math engine | Public | Real-time recalculation; zero division guards |
| `/legal/syarat-ketentuan` | Terms of Service | All | `app/(dashboard)/legal/syarat-ketentuan/page.tsx` | Static LegalArticle | Public | Static SSR |
| `/legal/kebijakan-privasi` | Privacy Policy | All | `app/(dashboard)/legal/kebijakan-privasi/page.tsx` | Static LegalArticle | Public | Static SSR |
| `/legal/pengecualian-tanggung-jawab` | Legal Disclaimer | All | `app/(dashboard)/legal/pengecualian-tanggung-jawab/page.tsx` | Static LegalArticle | Public | Static SSR |
| `/legal/pemberitahuan-hak-cipta` | Copyright Notice | All | `app/(dashboard)/legal/pemberitahuan-hak-cipta/page.tsx` | Static LegalArticle | Public | Static SSR |

### 5.2 Protected Application Routes

| Route | Purpose | Target Users | Components & Source | Data Sources & API | Auth & Authz | Loading / Empty / Error States |
|---|---|---|---|---|---|---|
| `/properties/create` | 7-Step property creation wizard | Agent, Admin, Super Admin | `app/(dashboard)/properties/create/page.tsx`, `CreatePropertyWizard` | `POST /api/properties`, Supabase Storage | `manage_own_properties` or `manage_all_properties` | Wizard step animations; draft auto-recovery banner from LocalStorage |
| `/properties/[id]/edit` | Property modification portal | Owner Agent, Admin, Super Admin | `app/(dashboard)/properties/[id]/edit/page.tsx`, `CreatePropertyWizard` | `PUT /api/properties/[id]`, PostgREST | Ownership or Admin role | Pre-filled form loader; alert banner on unsaved changes |
| `/crm` | CRM Kanban pipeline overview | Agent, Marketing, Admin, Super Admin | `app/(dashboard)/crm/page.tsx`, `CrmKanbanBoard` | `crmService.getLeads()`, `crmService.getStats()` | `manage_own_crm` or `manage_all_crm` | Column loading spinners; draggable ghost cards; empty column placeholders |
| `/crm/leads` | Tabular lead management | Agent, Marketing, Admin, Super Admin | `app/(dashboard)/crm/leads/page.tsx` | PostgREST `crm_leads` with contact joins | CRM permissions | TanStack Table skeleton; empty search result state |
| `/crm/leads/create` | Manual lead entry form | Agent, Marketing, Admin, Super Admin | `app/(dashboard)/crm/leads/create/page.tsx` | `actions/crm-leads.action.ts` (`createCRMLeadAction`) | CRM permissions | Button spinner; toast error feedback |
| `/crm/leads/[id]` | Lead details, activities, follow-ups | Assigned Agent, Admin, Super Admin | `app/(dashboard)/crm/leads/[id]/page.tsx` | `crm_leads`, `crm_activities`, `crm_followups` | Ownership or Staff | Activity timeline skeleton; modal dialogs |
| `/crm/leads/[id]/edit` | Lead profile editor | Assigned Agent, Admin, Super Admin | `app/(dashboard)/crm/leads/[id]/edit/page.tsx` | `actions/crm-leads.action.ts` (`updateCRMLeadAction`) | Ownership or Staff | Form skeleton |
| `/crm/followups` | Follow-up calendar & overdue monitor | Agent, Marketing, Admin, Super Admin | `app/(dashboard)/crm/followups/page.tsx` | `crmService.getFollowups()` | CRM permissions | Agenda card loader; overdue alert badges |
| `/crm/followups/create` | Follow-up creation form | Agent, Admin, Super Admin | `app/(dashboard)/crm/followups/create/page.tsx` | `actions/crm-followups.action.ts` | CRM permissions | Submit spinner |
| `/crm/followups/[id]` | Follow-up item detail | Assigned Agent, Admin, Super Admin | `app/(dashboard)/crm/followups/[id]/page.tsx` | `crm_followups` join `crm_leads` | CRM permissions | Card loader |
| `/crm/followups/[id]/edit` | Follow-up reschedule / edit | Assigned Agent, Admin, Super Admin | `app/(dashboard)/crm/followups/[id]/edit/page.tsx` | `actions/crm-followups.action.ts` | CRM permissions | Form loader |
| `/invoices` | Invoice ledger & status overview | Agent, Admin, Super Admin | `app/(dashboard)/invoices/page.tsx` | `invoices` table join `properties` | `manage_all_properties` | Ledger skeleton; empty invoice illustration |
| `/invoices/create` | Invoice generator with AI OCR scanner | Admin, Super Admin | `app/(dashboard)/invoices/create/page.tsx` | `invoices` table, `POST /api/ai/scan-invoice` | Admin, Super Admin | OCR scanning progress loader; calculated sum preview |
| `/invoices/[id]` | Invoice detail & print preview | Creator, Admin, Super Admin | `app/(dashboard)/invoices/[id]/page.tsx` | `invoices` join `properties` | Internal staff | Thermal / Standard print preview iframe |
| `/projects` | Construction project dashboard | Internal Staff | `app/(dashboard)/projects/page.tsx`, `ProjectCard` | `services/project.service.ts` | Internal staff | Progress bar loaders; project grid skeleton |
| `/projects/create` | Construction project creation | Admin, Super Admin | `app/(dashboard)/projects/create/page.tsx` | `services/project.service.ts` | Admin, Super Admin | Form submission loader |
| `/projects/[id]` | Construction milestones & tracking | Internal Staff | `app/(dashboard)/projects/[id]/page.tsx` | `projects` join `project_milestones` | Internal staff | Milestone checklist skeleton |
| `/surveys` | Survey requests & appointment calendar | Viewer (client), Agent, Admin | `app/(dashboard)/surveys/page.tsx` | `GET /api/surveys`, `GET /api/surveys/requests` | All logged-in | Request tabs; badge counts; appointment modal |
| `/reports` | Business intelligence & conversion analytics | Internal Staff | `app/(dashboard)/reports/page.tsx` | `services/report.service.ts` | `view_reports` | Recharts loading skeleton; date range selector |
| `/notifications` | Unified user notification feed | All logged-in users | `app/(dashboard)/notifications/page.tsx` | PostgREST `notifications` | Authenticated | Unread filter; mark all read button; empty bell state |
| `/settings` | Profile, branding, alerts, appearance | All logged-in users | `app/(dashboard)/settings/page.tsx`, `ProfileTab`, `BrandingTab`, `SystemTab` | Supabase Auth, `users` table, `system_settings` | Authenticated (SystemTab restricted to Super Admin) | Tab navigation; photo upload spinner; sonner toast |
| `/admin/users` | User & agent account approval ledger | Admin, Super Admin | `app/(dashboard)/admin/users/page.tsx` | `GET /api/admin/users`, `PATCH /api/admin/users` | Admin, Super Admin | User table skeleton; approve/reject dialog |
| `/admin/logs` | Security activity & system audit logs | Admin, Super Admin | `app/(dashboard)/admin/logs/page.tsx`, `AdminAuditTrail` | `GET /api/admin/audit`, `admin_audit_log` | Admin, Super Admin | Filterable audit event table; JSON payload modal |
| `/admin/support` | Internal customer support inbox | Admin, Super Admin | `app/(dashboard)/admin/support/page.tsx` | `GET /api/support` | Admin, Super Admin | Thread list loader; reply input box |
| `/admin/ai` | Central AI Control Center & Quota Manager | Super Admin exclusively | `app/(dashboard)/admin/ai/page.tsx` | `GET/POST /api/admin/ai/settings` | `super_admin` only | Real-time feature toggle switches; quota inputs |

---

## 6. USER ROLES & PERMISSION MATRIX

### 6.1 Role Definitions `[CONFIRMED]`
Based on `types/user.types.ts` and `lib/permissions.ts`:

1. **`super_admin` (Level 100)**: Unrestricted master administrator. Exclusive manager of Central AI policies, account deletions, system settings, and user role modifications.
2. **`admin` (Level 80)**: Operational director. Manages all properties, CRM leads, surveys, construction projects, invoices, and approves incoming agent applications. Cannot delete users, modify roles, or access AI settings.
3. **`agent` (Level 50)**: Licensed property advisor. Creates and edits own listings; manages assigned CRM leads, contacts, and follow-ups. Quota-limited AI access (5 actions/day per feature).
4. **`commissioner` (Level 40)**: Executive stakeholder. Read-only oversight of CRM pipeline, property listings, and business reports. No mutation privileges.
5. **`marketing` (Level 30)**: Lead generation officer. Browses property catalog; creates and manages assigned CRM leads; views reports. Cannot edit/delete properties.
6. **`viewer` (Level 10)**: Authenticated end-client. Browses properties; submits property survey requests; views own scheduled appointments; receives notifications.

### 6.2 Permission Matrix `[CONFIRMED]`

| Permission String | Description | `super_admin` | `admin` | `agent` | `marketing` | `commissioner` | `viewer` |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `manage_users` | Create, approve, suspend users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_roles` | Alter user role assignments / delete users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `manage_all_properties` | Edit / delete any property in database | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_own_properties` | Create listings, edit / delete own listings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `view_all_properties` | View internal listings, drafts, reviews | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `view_own_properties` | View own listings | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `manage_all_crm` | Reassign leads, verify deals, bulk updates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_own_crm` | Update assigned leads, log activities | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `view_all_crm` | Read all leads, contacts, and follow-ups | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `view_own_crm` | Read assigned leads and follow-ups | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `manage_media` | Upload, delete, watermark property photos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `export_data` | Export customer records and CSV tables | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `view_reports` | Access BI dashboards and conversion rates | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 7. AUTHENTICATION & AUTHORIZATION

### 7.1 Registration Architecture `[CONFIRMED]`
* **Client / Buyer Registration:** Handled via `app/register/page.tsx` using `supabase.auth.signUp()`. Account defaults to `role: "viewer"`, `status: "active"`.
* **Agent Application Flow:**
  1. Candidate submits application at `app/register/agent/page.tsx` (uploads KTP to Supabase Storage `ktp` bucket).
  2. Submits payload to `POST /api/auth/register-agent` (`lib/validations.ts:259` `registerAgentSchema`).
  3. API utilizes Service Role client to create Auth user (`email_confirm: true`, `status: "pending"`, `role: "agent"`) and upserts profile into `public.users` with `is_approved: false`.
  4. System dispatches notification (`account.registered`) to all Admin users.
  5. Agent attempts to log in -> intercepted by `proxy.ts` -> redirected to `/pending-approval`.
  6. Admin visits `/admin/users`, reviews KTP and profile, and approves candidate (updating `status: "active"`, `is_approved: true`).

### 7.2 Login, Sessions & Cookies `[CONFIRMED]`
* **Authentication Method:** Email & Password (`supabase.auth.signInWithPassword()`) or Google OAuth 2.0 (`signInWithOAuth()`).
* **Session Persistence:** `@supabase/ssr` creates HTTP-only, secure, partitioned session cookies.
* **OAuth Callback (`app/auth/callback/page.tsx`):** Exchanged via client session exchange. Immediately checks `users.status`. If `pending` or `suspended`, session is revoked via `supabase.auth.signOut()` and user is redirected to login with error toast.
* **Token Verification Standard:** Code standard strictly enforces `supabase.auth.getUser()` (validating the JWT against Supabase Auth servers) rather than `getSession()` (which only reads raw local cookie values).

### 7.3 Gatekeeping & Authorization Layer `[CONFIRMED]`

```text
Incoming Request -> proxy.ts
 ├─ 1. Canonical Apex Redirect (apex hostname -> www canonical origin)
 ├─ 2. Auth Cookie Check (supabase.auth.getUser())
 │      ├─ If Guest & Protected Section -> Redirect to /login?redirectTo=...
 │      └─ If Guest & /dashboard, /properties, /kpr-calculator -> ALLOW PASS-THROUGH
 ├─ 3. Account Status Validation (users table)
 │      ├─ If status == 'pending' -> Redirect /pending-approval
 │      ├─ If status == 'suspended' -> Redirect /login?reason=suspended
 │      └─ If status == 'active' & on auth page -> Redirect /dashboard
 └─ 4. Role Route Matcher (canAccessRoute(role, path))
        ├─ If authorized -> ALLOW PASS-THROUGH
        └─ If unauthorized -> Redirect /dashboard
```

* **Server-Side Guard Utilities (`lib/api-auth.ts`):**
  * `requireAuth()`: Enforces valid authenticated user with active account status.
  * `requireRole(allowedRoles)`: Enforces specific role level (e.g. `['super_admin']`).
  * `requirePermission(permission)`: Enforces granular permission key.
  * `normalizeRole(raw)`: Normalizes casing differences (`superadmin` vs `super_admin`) and falls back to `viewer` for unknown strings.

---

## 8. DATABASE & DATA MODEL

### 8.1 Entity Relationship Diagram `[CONFIRMED]`

```text
users (id: UUID)
 ├── properties (created_by, assigned_to)
 │    ├── property_owners (owner_id)
 │    ├── property_address (property_id)
 │    ├── property_price (property_id)
 │    ├── property_specifications (property_id)
 │    ├── property_land (property_id)
 │    ├── property_building (property_id)
 │    ├── property_media (property_id, uploaded_by)
 │    ├── survey_requests (property_id)
 │    ├── surveys (property_id)
 │    ├── invoices (property_id)
 │    └── crm_interests (property_id)
 ├── crm_contacts (id: UUID)
 │    └── crm_leads (contact_id)
 │         ├── crm_interests (lead_id)
 │         ├── crm_followups (lead_id, assigned_to)
 │         └── crm_activities (lead_id, user_id)
 ├── projects (manager_id, created_by)
 │    └── project_milestones (project_id)
 ├── notifications (user_id, sender_id)
 ├── admin_audit_log (actor_id, target_id)
 ├── ai_usage (user_id)
 └── ai_user_overrides (user_identifier)
```

### 8.2 Database Tables & Models `[CONFIRMED]`

#### 1. `users` (Core Identity & Profiles)
* **Purpose:** Application user profiles linked 1-to-1 with Supabase `auth.users`.
* **Fields:** `id` (UUID, PK), `email` (TEXT), `full_name` (TEXT), `phone` (TEXT), `avatar_url` (TEXT), `role` (TEXT, default `'viewer'`), `status` (TEXT, default `'active'`, check: `'active'`, `'pending'`, `'suspended'`), `is_approved` (BOOLEAN), `address` (TEXT), `ktp_url` (TEXT), `social_media` (TEXT[]), `experience` (TEXT), `vehicle` (TEXT), `join_reason` (TEXT), `preferences` (JSONB), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
* **Constraints & Rules:** Role mutations restricted to Super Admin via migration `010_super_admin_role_lock.sql`. Anon users cannot read phone, email, or whatsapp columns (`007_rls_properties_users_billing.sql`).

#### 2. `properties` (Listing Master Entity)
* **Purpose:** Core property listing record.
* **Fields:** `id` (UUID, PK), `listing_code` (TEXT, UNIQUE, formatted as `IP-XXXXXXYY`), `title` (TEXT, NOT NULL), `slug` (TEXT, UNIQUE), `property_type` (TEXT, check: `'rumah'`, `'apartemen'`, `'tanah'`, `'villa'`, `'ruko'`, `'kantor'`, `'pabrik'`, `'gudang'`, `'hotel'`, `'ruang_usaha'`), `listing_type` (TEXT, check: `'jual'`, `'sewa'`), `property_category` (TEXT), `status` (TEXT, check: `'draft'`, `'review'`, `'published'`, `'sold'`, `'rented'`, `'archived'`), `description` (TEXT), `selling_point` (TEXT), `rental_period` (TEXT), `owner_id` (UUID, FK -> `property_owners.id`), `created_by` (UUID, FK -> `auth.users.id`), `assigned_to` (UUID, FK -> `users.id`), `published_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 3. `property_owners` (Property Ownership Record)
* **Purpose:** Private contact and identity data of property owners/sellers.
* **Fields:** `id` (UUID, PK), `owner_code` (TEXT), `full_name` (TEXT, NOT NULL), `phone` (TEXT), `whatsapp` (TEXT), `email` (TEXT), `identity_type` (TEXT), `identity_number` (TEXT), `address` (TEXT), `notes` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
* **Security:** Anonymous users have ZERO access (blocked via RLS 007).

#### 4. `property_address` (Geographic & Regional Data)
* **Purpose:** Normalized address referencing the flat `regions` lookup table.
* **Fields:** `id` (UUID, PK), `property_id` (UUID, FK -> `properties.id` ON DELETE CASCADE), `region_id` (BIGINT/INT, FK -> `regions.id`), `province_name` (TEXT), `city_name` (TEXT), `district_name` (TEXT), `village_name` (TEXT), `postal_code` (TEXT), `address` (TEXT — street address), `latitude` (NUMERIC), `longitude` (NUMERIC), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 5. `property_price` (Financial & Valuation Data)
* **Purpose:** Pricing structures and service charges.
* **Fields:** `id` (UUID, PK), `property_id` (UUID, FK -> `properties.id` ON DELETE CASCADE), `selling_price` (NUMERIC), `rental_price` (NUMERIC), `service_charge` (NUMERIC), `maintenance_fee` (NUMERIC), `negotiable` (BOOLEAN, default false), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 6. `property_specifications` (Structural Specs)
* **Purpose:** Architectural and interior features.
* **Fields:** `id` (UUID, PK), `property_id` (UUID, FK -> `properties.id` ON DELETE CASCADE), `bedroom` (INT), `bathroom` (INT), `garage` (INT), `carport` (INT), `floor` (INT), `electricity` (INT), `water_source` (TEXT), `certificate` (TEXT), `facing` (TEXT), `condition` (TEXT), `furnishing` (TEXT), `year_built` (INT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 7. `property_land` & `property_building` (Dimensional Specs)
* **`property_land` Fields:** `id` (UUID), `property_id` (UUID), `land_area` (NUMERIC), `land_unit` (TEXT), `land_width` (NUMERIC), `land_length` (NUMERIC).
* **`property_building` Fields:** `id` (UUID), `property_id` (UUID), `building_area` (NUMERIC), `building_width` (NUMERIC), `building_length` (NUMERIC).

#### 8. `property_media` (Photography & Media Attachments)
* **Fields:** `id` (UUID, PK), `property_id` (UUID, FK -> `properties.id` ON DELETE CASCADE), `media_type` (TEXT, default `'image'`), `file_name` (TEXT), `original_name` (TEXT), `storage_path` (TEXT), `public_url` (TEXT), `mime_type` (TEXT), `file_size` (INT), `is_primary` (BOOLEAN, default false), `sort_order` (INT, default 0), `uploaded_by` (UUID), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 9. `crm_contacts` (Lead Identity Registry)
* **Fields:** `id` (UUID, PK), `contact_code` (TEXT), `full_name` (TEXT, NOT NULL), `phone` (TEXT), `whatsapp` (TEXT), `email` (TEXT), `occupation` (TEXT), `city` (TEXT), `notes` (TEXT), `source` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 10. `crm_leads` (Sales Pipeline Opportunities)
* **Fields:** `id` (UUID, PK), `contact_id` (UUID, NOT NULL, FK -> `crm_contacts.id`), `assigned_to` (UUID, FK -> `users.id`), `created_by` (UUID, FK -> `users.id`), `status` (TEXT, check: `'new'`, `'contacted'`, `'qualified'`, `'proposal'`, `'negotiation'`, `'won'`, `'lost'`), `interest_type` (TEXT), `budget` (NUMERIC), `notes` (TEXT), `property_id` (UUID, FK -> `properties.id`), `lost_reason` (TEXT, check: `'customer_not_responding'`, `'budget_mismatch'`, `'not_interested'`, `'chose_another_property'`, `'purchase_postponed'`, `'property_unsuitable'`, `'duplicate'`, `'other'`), `lost_explanation` (TEXT), `deal_state` (TEXT, check: `'none'`, `'submitted'`, `'pending_verification'`, `'verified'`, `'rejected'`), `deal_submitted_at` (TIMESTAMPTZ), `deal_verified_at` (TIMESTAMPTZ), `deal_rejection_reason` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 11. `crm_followups` (Interaction Schedules)
* **Fields:** `id` (UUID, PK), `lead_id` (UUID, NOT NULL, FK -> `crm_leads.id` ON DELETE CASCADE), `assigned_to` (UUID, NOT NULL, FK -> `users.id`), `created_by` (UUID, FK -> `users.id`), `followup_date` (TIMESTAMPTZ, NOT NULL), `notes` (TEXT), `status` (TEXT, check: `'pending'`, `'completed'`, `'cancelled'`, `'overdue'`), `completed_at` (TIMESTAMPTZ), `completed_by` (UUID), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 12. `crm_interests` (Property Multi-Interest Mapping)
* **Fields:** `id` (UUID, PK), `lead_id` (UUID, NOT NULL, FK -> `crm_leads.id` ON DELETE CASCADE), `property_id` (UUID, NOT NULL, FK -> `properties.id` ON DELETE CASCADE), `interest_level` (TEXT), `notes` (TEXT), `priority` (INT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

#### 13. `crm_activities` (Immutable Customer Touchpoint History)
* **Fields:** `id` (UUID, PK), `lead_id` (UUID, NOT NULL, FK -> `crm_leads.id` ON DELETE CASCADE), `user_id` (UUID, NOT NULL, FK -> `users.id`), `activity_type` (TEXT, NOT NULL), `notes` (TEXT), `created_at` (TIMESTAMPTZ, default now()). Note: Has no `updated_at` column by design (append-only log).

#### 14. `survey_requests` & `surveys` (Site Visits)
* **`survey_requests` Fields:** `id`, `property_id`, `requester_id`, `requester_name`, `requester_phone`, `preferred_date`, `preferred_time`, `message`, `status` (`pending`, `contacted`, `scheduled`, `rejected`, `cancelled`), `agent_id`, `handled_by`, `handled_at`, `reject_reason`, `survey_id`, `created_at`, `updated_at`.
* **`surveys` Fields:** `id`, `property_id`, `request_id`, `client_id`, `client_name`, `client_phone`, `agent_id`, `scheduled_at`, `duration_min`, `type` (`lapangan`, `virtual`), `status` (`scheduled`, `completed`, `cancelled`, `no_show`), `location_note`, `meeting_url`, `notes`, `reminder_sent_at`, `created_by`, `created_at`, `updated_at`.

#### 15. `projects` & `project_milestones` (Construction Management)
* **`projects` Fields:** `id`, `code` (`PRJ-YYYY-XXX`), `title`, `description`, `location`, `status` (`planning`, `active`, `paused`, `completed`, `cancelled`), `progress` (0-100), `start_date`, `end_date`, `budget`, `spent`, `manager_id` (FK -> `auth.users`), `team_count`, `created_by`, `created_at`, `updated_at`.
* **`project_milestones` Fields:** `id`, `project_id`, `title`, `status` (`pending`, `in_progress`, `done`, `blocked`), `due_date`, `sort_order`, `completed_at`, `created_at`, `updated_at`.

#### 16. `invoices` (Billing & Receipts)
* **Fields:** `id`, `invoice_number`, `client_name`, `client_email`, `client_phone`, `property_id`, `total_amount` (canonical amount), `amount` (legacy fallback), `status` (`draft`, `sent`, `paid`, `overdue`, `cancelled`), `due_date`, `issue_date`, `paid_date`, `notes`, `created_at`.

#### 17. Governance, Quotas & Audit
* **`admin_audit_log`:** `id`, `actor_id`, `actor_email`, `actor_role`, `action`, `target_id`, `target_email`, `target_role`, `detail` (JSONB), `created_at`.
* **`ai_user_overrides`:** `id`, `user_identifier`, `feature`, `rental_active`, `rental_expires_at`, `custom_quota`, `created_at`, `updated_at`.
* **`system_settings`:** Key-value store (`ai_master_switch`, `ai_feature_*_enabled`, `ai_feature_*_quota_*`).
* **`ai_usage`:** Token and execution counter tracking daily quotas per actor and feature.

---

## 9. PROPERTY DOMAIN & LIFECYCLE

### 9.1 Property Lifecycle State Machine `[CONFIRMED]`

```text
[DRAFT] ───(Tugaskan Agen & Publish)───► [PUBLISHED] ───(Deal Terjual)───► [SOLD]
   ▲                                         │                                │
   │                                         ▼                                ▼
[REVIEW] ◄────────(Lepas Agen)───────── [DRAFT]                          [ARCHIVED]
                                             │
                                             ▼
                                         [RENTED]
```

* **Draft (`draft`):** Internal preparation state. Visible only to listing creator, assigned agent, and Admin/Super Admin.
* **Review (`review`):** Submitted for managerial inspection.
* **Published (`published`):** Public storefront state.
  * **MANDATORY PUBLISHING RULE (`lib/property-publish.ts`):** A property CANNOT be published without an assigned agent (`assigned_to IS NOT NULL`). If a user attempts to publish a listing without an agent, `resolvePublishStatus()` automatically downgrades the status to `draft` with the warning: *"Listing belum punya agen penanggung jawab, jadi disimpan sebagai draf. Tugaskan agen lalu publikasikan kembali."*
* **Sold (`sold`) / Rented (`rented`):** Closed transactions. Maintained for historical reporting; removed from active search results.
* **Archived (`archived`):** De-listed property.

### 9.2 Listing Code Sequence Engine `[CONFIRMED]`
* Every property listing receives a unique business code formatted as:  
  `IP-{SEQUENCE:6_DIGITS}{AGENT_RANK:2_DIGITS}` (e.g., `IP-00012401`).
* **Implementation (`services/property.service.ts:430` & migration `024`):**
  * `next_listing_number()`: Atomic database RPC sequence yielding sequential integers padded to 6 digits.
  * `agentCode`: Calculated based on the seniority rank of the assigned agent in `users` (`lte("created_at", agent.created_at)`), padded to 2 digits.

### 9.3 Duplication Engine `[CONFIRMED]`
* Deep duplication (`propertyService.duplicate(id)`) clones the parent property record along with all related child records:
  * Creates new unique slug: `${original.slug}-copy-${timestamp}`
  * Clones `property_address`, `property_price`, `property_specifications`, `property_land`, `property_building`, and `property_media` arrays with new foreign keys.
  * Status resets to `'draft'`.

---

## 10. PROPERTY SEARCH & DISCOVERY

### 10.1 Dual-Query Search Architecture `[CONFIRMED]`
PostgREST prevents combining parent table columns and child table columns within a single top-level `.or()` filter. To deliver a seamless unified search ("Title OR Code OR Description OR Address"), `services/property.service.ts` employs a high-performance two-step resolution:

```text
User enters search term "Gunung Sindur"
   ↓
Step 1: Address Pre-Query (property_address)
   supabase.from("property_address")
     .select("property_id")
     .or("province_name.ilike.%...,city_name.ilike.%...,district_name.ilike.%...,address.ilike.%...")
     .limit(200) -> Extract matching property UUIDs: [uuid1, uuid2, ...]
   ↓
Step 2: Unified Top-Level Query (properties)
   supabase.from("properties")
     .select(selectClause, { count: "exact" })
     .or("title.ilike.%term%,listing_code.ilike.%term%,description.ilike.%term%,id.in.(uuid1,uuid2)")
```

### 10.2 Dynamic Inner Join Filter Injection `[CONFIRMED]`
When child table filters (e.g., price bounds, bedroom count, land area) are active, PostgREST requires an `!inner` join hint on child relations (`address:property_address!inner(*)`, `price:property_price!inner(*)`). If no filters are active on that relation, the inner join is omitted so listings with null prices or specs are not mistakenly purged from the catalog.

### 10.3 Search Filters & Normalization `[CONFIRMED]`
* **Property Type Normalization:** Maps UI aliases (`perkantoran` -> `kantor`, `ruang usaha` -> `ruang_usaha`, `apartment` -> `apartemen`, `house` -> `rumah`).
* **Listing Type Normalization:** Maps `dijual`/`sale`/`jual` -> `jual`; `disewa`/`rent`/`sewa` -> `sewa`.
* **Multi-District Selection:** Multiple sub-districts can be selected simultaneously and queried via `district_names: string[]`, applying OR logic across district names.
* **Specification Logic:** Bedrooms and bathrooms are evaluated with `>=` (minimum thresholds), matching user expectation for "3+ Kamar".
* **Price Ordering:** Sorts directly against `price.selling_price` via `{ referencedTable: "price", ascending }`.

---

## 11. PROPERTY DETAIL EXPERIENCE

### 11.1 Modular Layout Architecture `[CONFIRMED]`
The property detail page (`/properties/[id]`) is composed of dedicated modular components in `components/property-detail/`:
1. **`PropertyHeader`:** Displays property title, formatted price (Rupiah currency), listing code, status badges, and action buttons (Share, Favorite).
2. **`PropertyGallery`:** Mobile-optimized primary image carousel and desktop grid with a fullscreen modal Lightbox.
3. **`PropertySpecsGrid`:** Visual specification chips (Bedrooms, Bathrooms, Building Area, Land Area, Certificate, Electricity, Water, Floor count).
4. **`PropertyDescription`:** Formatted rich text description with "Baca Selengkapnya" expand/collapse toggle.
5. **`PropertyLocationMap`:** Street address breakdown with direct launch buttons for Google Maps and Waze directions.
6. **`PropertyAgentCard`:** Assigned agent card with photo avatar, agent name, agency branding, phone number, and direct WhatsApp contact link.
7. **`PropertyKprSection`:** Interactive mortgage simulator pre-populated with the listing's selling price, allowing users to adjust DP%, loan tenure, and view estimated monthly installments.
8. **`PropertyActionMenu`:** Administrative action menu for authorized agents and admins (Edit listing, Duplicate listing, Change status, Assign agent, Delete).
9. **`LeadCaptureModal`:** Modal inquiry form triggered when visitors click contact or request information.

---

## 12. PROPERTY FORM & CREATION WIZARD

### 12.1 7-Step Wizard Structure `[CONFIRMED]`
Managed by `components/create-property/CreatePropertyWizard.tsx`:
* **Step 1: Kategori & Foto (`StepCategory`):** Property type, listing type, YouTube URL, photo upload, primary photo selection, and AI Raw Listing Text Auto-Fill parser.
* **Step 2: Spesifikasi (`StepSpecification`):** Room counts, land/building dimensions, electricity, certificates (SHM, HGB, etc.), condition, furnishing.
* **Step 3: Lokasi (`StepLocation`):** Region auto-complete linked to Supabase `regions` table, street address, postal code, latitude/longitude.
* **Step 4: Fasilitas (`StepFacilities`):** Tag-based facility selection (AC, Swimming Pool, Security 24h, Garden, Carport, etc.).
* **Step 5: Harga & Deskripsi (`StepPriceDescription`):** Selling/rental price, maintenance fees, negotiable flag, title generation, AI description generator.
* **Step 6: Kontak (`StepContact`):** Property owner/vendor identity details (name, phone, whatsapp, KTP, address).
* **Step 7: Review & Publish (`StepReview`):** Summary validation, Listing Completeness Score Card (0-100%), Agent assignment, and final publication.

### 12.2 Draft System & Offline Resilience `[CONFIRMED]`
* Wizard state is automatically saved to `localStorage` under `inland_property_draft_v2` for new listings and `inland_property_edit_draft_{id}` for edits.
* Form distinguishes create and edit sessions, preventing draft collisions.

---

## 13. IMAGE & MEDIA SYSTEM

### 13.1 Upload & Processing Pipeline `[CONFIRMED]`
* **Upload Route:** `POST /api/media/upload` (`lib/api-auth.ts:requireAuth`).
* **Validation:** File MIME type must start with `image/`; file size must not exceed 10MB (`file.size <= 10 * 1024 * 1024`).
* **Ownership Check:** Requester must be listing creator, assigned agent, or staff (`admin`/`super_admin`).
* **Server-Side Watermarking (`lib/watermark.ts`):** Sharp processes incoming image buffers:
  * Reads `public/watermark.png`
  * Trims transparency and resizes watermark relative to image dimensions (25-30% width)
  * Composites watermark with opacity (`0.7`) at center or designated corner
* **Storage Location:** Supabase Storage bucket `property-media` under path `properties/{propertyId}/{timestamp}-{random}.{ext}`.
* **Database Persistence:** Inserts record into `public.property_media` with storage path, public URL, dimensions, and sort order.
* **Client-Side Watermarking (`components/ui/WatermarkedImage.tsx`):** Renders clean original image with an overlaid SVG/PNG watermark element, ensuring protection against screenshot extraction while maintaining crisp responsive rendering.

---

## 14. API DOCUMENTATION & SERVER ACTIONS

### 14.1 Server Actions (`actions/`) `[FROZEN SECURITY ZONE]`

#### `actions/crm-leads.action.ts`
* `updateCRMLeadStatusAction(leadId, newStatus, options)`: Transitions lead status. Enforces pipeline transition rules (`lib/crm-pipeline.ts`). Requires `lostReason` for `lost`. Requires Admin deal verification for `won`. Logs to `admin_audit_log`.
* `submitCRMDealAction(leadId)`: Invoked by agent from `negotiation` stage. Sets `deal_state = 'pending_verification'`.
* `verifyCRMDealAction(leadId, verified, reason)`: Invoked by Admin/Super Admin. Sets `deal_state = 'verified'` (enabling `won` transition) or `'rejected'`.
* `createCRMLeadAction(data)`: Validates actor session, creates contact, lead, and initial interest. Logs `lead.created`.
* `deleteCRMLeadAction(leadId)`: Soft/hard deletion of lead by authorized owner or admin.
* `updateCRMLeadAction(leadId, data)`: Updates budget, interest type, and notes.
* `bulkUpdateCRMLeadsStatusAction(leadIds, newStatus, options)`: Atomic multi-lead status updates.
* `bulkAssignCRMLeadsAction(leadIds, assignedTo)`: Reassigns batch of leads to another agent.

#### `actions/crm-contacts.action.ts`
* `createCRMContactAction(data)`, `updateCRMContactAction(id, data)`, `deleteCRMContactAction(id)`.

#### `actions/crm-followups.action.ts`
* `createCRMFollowupAction(data)`, `updateCRMFollowupAction(id, data)`, `deleteCRMFollowupAction(id)`.

#### `actions/crm-interests.action.ts`
* `createCRMInterestAction(data)`, `updateCRMInterestAction(id, data)`, `deleteCRMInterestAction(id)`, `syncCRMLeadInterestsAction(leadId, propertyIds)`.

### 14.2 REST Route Handlers (`app/api/`)

#### Core Business Endpoints
* `POST /api/leads`: Public intake endpoint for property inquiries. Rate-limited (5 guest / 30 member per 10m). Reuses open leads or creates new contact + lead + interest. Dispatches WhatsApp and Push notifications.
* `PATCH /api/leads/[id]/assign`: Staff assignment of lead. Dispatches targeted notifications.
* `POST /api/properties`: Creates new property and related relational rows. Enforces agent assignment requirement.
* `GET /api/properties`: Lists properties with full multi-filter support.
* `GET /api/properties/[id]`: Detailed property lookup by UUID, listing code, or slug.
* `PATCH /api/properties/[id]/status`: Updates listing status. Auto-downgrades to draft if agent is missing.
* `PATCH /api/properties/[id]/assign`: Assigns agent to property. If assignment removed on published property, downgrades to draft.
* `POST /api/media/upload`: Authenticated media upload with Sharp watermarking.
* `GET /api/locations/search`: Sub-district and city lookup against `regions` table.
* `POST /api/surveys/requests`: Public/client submission of survey requests.
* `PATCH /api/surveys/requests/[id]`: Status updates (contacted, rejected, cancelled).
* `POST /api/surveys`: Schedules confirmed appointment (lapangan or virtual).
* `GET /api/surveys/reminders`: Vercel Cron endpoint (protected by `CRON_SECRET`). Dispatches survey reminders.
* `POST /api/invoices/[id]/print`: Generates formatted invoice print data.

#### AI & Automation Endpoints
* `POST /api/ai/generate`: Generates property titles, descriptions, and feature lists. Protected by `authorizeAI()`.
* `POST /api/ai/followup`: Generates customized WhatsApp outreach scripts for leads. Protected by `authorizeAI()`.
* `POST /api/ai/scan-invoice`: Multimodal invoice OCR via Gemini Vision. Protected by `authorizeAI()`.
* `POST /api/parse-listing`: Extracts structured JSON from unformatted WhatsApp property text. Protected by `authorizeAI()`.
* `POST /api/chat`: Public customer support chatbot (Agnes AI). Token bucket rate-limited per IP.
* `GET /api/dashboard/summary`: Generates AI executive briefing for administration.
* `GET/POST /api/admin/ai/settings`: Super Admin exclusive AI management and quota overrides.

---

## 15. COMPONENT SYSTEM

* **Layout & Navigation:**
  * `components/layout/SiteFooter.tsx`: Canonical footer with legal links, contact hotline, office address, and social links.
  * `components/layout/BottomNav.tsx`: Mobile fixed bottom navigation with role-aware tabs.
  * `components/dashboard/app-sidebar.tsx`: Collapsible drawer navigation with role permissions and notification indicators.
* **Property System:**
  * `components/properties/PropertyCard.tsx`: Standard property card with lazy-loaded watermarked images, specs chips, and price.
  * `components/properties/NumberedPagination.tsx`: URL-driven pagination bar.
  * `components/create-property/CreatePropertyWizard.tsx`: 7-step property wizard orchestrator.
  * `components/property-detail/*`: Modular detail components (`PropertyHeader`, `PropertyGallery`, `PropertySpecsGrid`, `PropertyDescription`, `PropertyLocationMap`, `PropertyAgentCard`, `PropertyKprSection`, `PropertyActionMenu`, `PropertyModals`).
* **CRM & Dashboard:**
  * `components/crm/CrmKanbanBoard.tsx`: Drag-and-drop pipeline Kanban board (`@dnd-kit`).
  * `components/crm/AgentActivityMonitor.tsx`: Agent interaction log viewer.
  * `components/dashboard/DashboardPropertySearch.tsx`: Hero search bar with multi-region selector popover.
  * `components/dashboard/RegionMultiSelect.tsx`: Virtualized searchable region selector.
  * `components/dashboard/AdminDashboardView.tsx`, `AgentDashboardView.tsx`, `ViewerDashboardView.tsx`.
* **Inquiry & Feedback:**
  * `components/inquiry/LeadCaptureModal.tsx`: WhatsApp inquiry capture modal.
  * `components/AIChatWidget.tsx`: Floating AI chat widget.
  * `components/notification-bell.tsx`: Real-time notification indicator dropdown.

---

## 16. DESIGN SYSTEM

### 16.1 Design Tokens `[CONFIRMED]`
* **CSS Variable Architecture:** Defined in `app/globals.css` using Tailwind CSS v4 `@theme inline`.
* **Color Schemes:**
  * Base Background: Light `#ffffff`, Dark `#0f172a`
  * Base Foreground: Light `#0f172a`, Dark `#f1f5f9`
  * Border & Input: Light `#e2e8f0`, Dark `#334155`
* **Dynamic Theme Accents (`data-accent` attribute on root):**
  * **Emerald (Default Brand Palette):** Primary `#059669` (Dark `#10b981`), Ring `#059669`
  * **Sapphire Blue:** Primary `#2563eb` (Dark `#3b82f6`), Ring `#2563eb`
  * **Royal Purple:** Primary `#9333ea` (Dark `#a855f7`), Ring `#9333ea`
* **Typography:**
  * Font Family: `Inter` via `next/font/google` (`subsets: ["latin"]`)
  * Dynamic Font Scale (`data-font-size` attribute):
    * `compact`: `87.5%` (14px base)
    * `normal`: `100%` (16px base)
    * `large`: `112.5%` (18px base)
* **Corner Radius:** `--radius: 0.5rem` (8px); sm: 4px; md: 6px; lg: 8px; xl: 12px; 2xl: 16px.
* **Micro-Animations:** Custom keyframe `.fade-in-up` with reduced-motion media query support.

---

## 17. RESPONSIVE DESIGN

* **Breakpoints:** Tailwind standard (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`).
* **Mobile-First Principles:**
  * Bottom Navigation bar (`BottomNav`) active on `< md` screens; hidden on desktop.
  * Desktop header quick actions (`KPR`, `Jadwal Survey`, live clock) hidden on mobile to conserve space.
  * 44px minimum touch targets on all mobile form buttons, steppers, and inputs.
  * Safe-area padding (`pb-[calc(3.75rem+env(safe-area-inset-bottom))]`) preventing content overlap on iOS home indicator devices.
  * Responsive Kanban board automatically collapses into scrollable swimlanes on mobile screens.

---

## 18. SEARCH ENGINE OPTIMIZATION (SEO)

* **Metadata Base:** Initialized via `metadataBase: new URL(SITE.url)` in `app/layout.tsx`.
* **Title Template:** `%s | Inland Property` (`app/layout.tsx:21`).
* **Open Graph & Twitter Cards:** Configured across all pages via shared `OG_BASE` (`siteName: "Inland Property"`, `locale: "id_ID"`).
* **Dynamic Property SEO (`app/(dashboard)/properties/[id]/layout.tsx`):** Server Component layout queries published property, injecting dynamic meta tags, primary photo Open Graph image, and Schema.org JSON-LD:
  * `@type: "RealEstateListing"`
  * `PostalAddress` with administrative hierarchy (province, city, district)
  * `GeoCoordinates` with latitude/longitude
  * `Offer` with IDR currency specification
  * `QuantitativeValue` for building/land area (`MTK` UN/CEFACT units)
* **Dynamic Sitemap (`app/sitemap.ts`):** Automatically aggregates static pages and active published properties with `revalidate = 3600` (1 hour ISR).
* **Robots Rule (`app/robots.ts`):** Allows public crawlers; explicitly disallows all protected paths (`/crm/`, `/admin/`, `/reports/`, `/invoices/`, `/projects/`, `/surveys/`, `/api/`).

---

## 19. SECURITY ARCHITECTURE

### 19.1 Implemented Security Controls `[CONFIRMED]`
* **Frozen Security Zone:** Strict architectural quarantine over Server Actions (`actions/crm-*.action.ts`), auth guards (`lib/api-auth.ts`, `lib/permissions.ts`), migrations, and environment configuration.
* **Server/Client Boundary:** Zero private keys exposed to browser bundle; `SUPABASE_SERVICE_ROLE_KEY`, `ONESIGNAL_REST_API_KEY`, and `FONNTE_TOKEN` remain strictly server-side.
* **Input Sanitization & Validation:** All Route Handlers guarded by Zod 4 schemas in `lib/validations.ts`.
* **Database Isolation:** Supabase Row Level Security (RLS) active across all tables. Anonymous role permissions revoked from sensitive tables (`property_owners`, `crm_*`, `invoices`, `system_settings`).
* **Rate Limiting:** Token-bucket rate limiter (`lib/rate-limit.ts`) active on public AI endpoints, lead capture, and auth.
* **Immutable Audit Trail:** Critical operations logged to `admin_audit_log` with no UPDATE/DELETE policies granted to authenticated users.

### 19.2 Potential Security Concerns / Audit Notes `[POTENTIAL ISSUE]`
* **Client-Side Phone Masking in Legacy Views:** While CRM Server Actions restrict write operations, PostgREST queries executing from browser clients could expose customer phone numbers if SELECT policies are not strictly scoped to `assigned_to` or staff roles.
* **Multi-Agent Staging Verification:** Full multi-agent tenant isolation in CRM is verified in automated unit test assertions (`scripts/verify-rls.mjs`), but requires continuous live staging verification.

---

## 20. PERFORMANCE OPTIMIZATIONS

* **Request Deduplication:** Critical Server Component queries wrapped in React `cache()` (`app/(dashboard)/properties/[id]/layout.tsx`), ensuring `generateMetadata` and page layout share a single Supabase query.
* **Image Delivery:** Remote pattern configured for Supabase Storage CDN; Sharp image optimization; lazy loading on catalog grid cards.
* **Sitemap ISR:** Sitemap generation cached with 1-hour revalidation window (`revalidate = 3600`) to prevent cold-start database spikes.
* **Address Pre-Query Indexing:** Address searches limited to 200 UUIDs (`ADDRESS_MATCH_LIMIT = 200`) to prevent oversized URL parameter construction in PostgREST queries.

---

## 21. ENVIRONMENT VARIABLES

| Variable | Purpose | Required | Client/Server | Sensitive |
|---|---|:---:|:---:|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API gateway URL | Yes | Client & Server | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anonymous API key | Yes | Client & Server | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative service-role key (RLS bypass) | Yes | Server Only | **YES** |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin (metadata, sitemap, OAuth) | Yes | Client & Server | No |
| `GROQ_API_KEY` | API key for Groq Cloud (LLaMA-3.3 inference) | Optional* | Server Only | **YES** |
| `GEMINI_API_KEY` | API key for Google GenAI / Gemini Vision | Optional* | Server Only | **YES** |
| `AGNES_API_KEY` | API key for internal Agnes AI gateway | Optional* | Server Only | **YES** |
| `AGNES_API_URL` | Endpoint URL for internal Agnes AI gateway | Optional* | Server Only | No |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | OneSignal application identifier for push | Optional | Client & Server | No |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST API key for server push dispatch | Optional | Server Only | **YES** |
| `FONNTE_TOKEN` | Security token for Fonnte WhatsApp Gateway API | Optional | Server Only | **YES** |
| `CRON_SECRET` | Bearer secret for Vercel Cron authentication | Optional | Server Only | **YES** |
| `DEFAULT_AGENT_UUID` | Fallback agent UUID for unassigned web leads | Optional | Server Only | No |
| `AI_DAILY_TOKEN_BUDGET` | Daily per-user token ceiling (default 60,000) | No | Server Only | No |
| `AI_GLOBAL_DAILY_TOKEN_BUDGET` | Daily system-wide token ceiling (default 1,500,000) | No | Server Only | No |

*\*Note: At least one AI provider key (Groq, Gemini, or Agnes) is required for AI features to function.*

---

## 22. THIRD-PARTY SERVICES

1. **Supabase (PostgreSQL, Auth, Storage, PostgREST)**
   * Purpose: Primary database, authentication, file storage, and real-time backend.
   * Integration: `@supabase/supabase-js`, `@supabase/ssr` (`lib/supabase/*`).
   * Dependency: Critical (Platform cannot function without it).
2. **OneSignal (Web Push Notifications)**
   * Purpose: Instant browser notifications for leads, survey reminders, and announcements.
   * Integration: `lib/onesignal.ts`, `components/providers/onesignal-provider.tsx`, `OneSignalSDKWorker.js`.
   * Dependency: Medium (Push disabled gracefully if credentials absent).
3. **Fonnte (WhatsApp Gateway API)**
   * Purpose: Automated WhatsApp message delivery for lead alerts and daily agent follow-up digests.
   * Integration: `lib/fonnte.ts` via `https://api.fonnte.com/send`.
   * Dependency: Medium (Gracefully logged and skipped if disabled in user preferences).
4. **Groq Cloud (LLaMA 3.3 70B Versatile)**
   * Purpose: Fast natural language generation (property titles, descriptions, follow-up messages).
   * Integration: `groq-sdk` in `services/ai.service.ts`.
   * Dependency: High (Part of AI cascading fallback chain).
5. **Google Generative AI (Gemini 2.5 / 3.5 & Gemini Vision OCR)**
   * Purpose: Secondary LLM fallback and multimodal invoice receipt OCR scanning.
   * Integration: `@google/genai` in `services/ai.service.ts`.
   * Dependency: High (Primary OCR engine for invoice scanning).
6. **Agnes AI Gateway**
   * Purpose: Primary customer support chat assistant and first-tier generation engine.
   * Integration: REST fetch in `services/ai.service.ts` and `app/api/chat/route.ts`.
   * Dependency: High (Part of AI cascading fallback chain).
7. **Vercel**
   * Purpose: Production cloud application hosting, serverless functions, and scheduled cron execution.
   * Integration: Git deployment, Vercel cron endpoints (`/api/surveys/reminders`).
   * Dependency: High.

---

## 23. TESTING & QUALITY ASSURANCE

### 23.1 Test Frameworks & Suites `[CONFIRMED]`
* **Unit / Integration / E2E Test Runners:** **UNKNOWN — not found in repository**. There is no Jest, Vitest, Cypress, or Playwright configuration present in `package.json`.
* **Automated Security & Database Verification:**
  * `scripts/verify-rls.mjs`: Comprehensive automated test script executing 32 security assertions covering Row Level Security, table permissions, anonymous data isolation, and user column access.
* **Manual Test Plans (`test-scenarios/`):**
  * `business-logic-tests.md`: Test protocols for pipeline transitions, deal verification, and role boundaries.
  * `create-property-tests.md`: Test cases for wizard steps, validation, and photo uploads.
  * `edit-property-tests.md`: Test cases for editing existing listings and draft isolation.
  * `mobile-responsive-tests.md`: Touch target, viewport, and responsive navigation tests.
* **Compilation & Code Quality:**
  * Type Check: `npx tsc --noEmit` (TypeScript strict mode)
  * Linter: ESLint 9 (`npm run lint`)
  * Build Verification: `npm run build` (`next build`)

---

## 24. DEPLOYMENT & CI/CD

* **Hosting Platform:** Vercel (configured with `.vercel/` and `next.config.ts`).
* **Build Command:** `next build` (compiled via Next.js compiler with Sharp standalone support).
* **Start Command:** `next start`.
* **Database Migrations:** Executed sequentially in Supabase SQL Editor from `supabase/migrations/` (files `001_...` through `029_...`).
* **Cron Jobs:** Configured in `vercel.json` pointing to `/api/surveys/reminders` with `CRON_SECRET` authorization header.
* **Domain Configuration:** Production apex domain automatically canonicalized to `www.inlandproperty.site` via `proxy.ts`.

---

## 25. IMPORTANT BUSINESS RULES

1. **Property Publication Rule (`lib/property-publish.ts`):** A property cannot be published without an assigned agent (`assigned_to`). Any attempt to publish without an agent forces status to `draft`.
2. **Deal Closing Rule (`actions/crm-leads.action.ts`):** A lead cannot transition to `won` directly by an agent. The lead must be in `negotiation`, submitted by the agent (`deal_state = 'pending_verification'`), and explicitly verified by an Admin or Super Admin (`deal_state = 'verified'`).
3. **Lost Lead Justification (`lib/crm-pipeline.ts`):** A lead cannot be marked as `lost` without selecting a valid `lost_reason`. If `'other'` is selected, `lost_explanation` text is mandatory.
4. **Pipeline Progression Strictness (`lib/crm-pipeline.ts`):** Stage transitions must follow the strict progression `new -> contacted -> qualified -> proposal -> negotiation -> won`. Arbitrary skipping is rejected.
5. **Super Admin Immutability (`supabase/migrations/010`):** Super Admin roles cannot be revoked or downgraded by regular Admins. User account deletion is strictly restricted to Super Admins.
6. **Lead Ownership Principle (`docs/crm/01-business-rules.md`):** Leads are company assets. Agents manage leads on behalf of the company, but cannot permanently delete company contact records.

---

## 26. TECHNICAL CONVENTIONS & CODING STANDARDS

1. **Next.js 16 Gateway Convention:** All route interception is implemented in `proxy.ts` in the repository root. Never reintroduce `middleware.ts`.
2. **Server Actions Standard:** All CRM mutations MUST be written in `actions/crm-*.action.ts` using `'use server'`, validating user session with `supabase.auth.getUser()`, and recording audit trails with `recordAudit()`.
3. **Route Group Awareness:** When referencing internal routes in code or proxy checks, remember that `app/(dashboard)/crm/page.tsx` maps to `/crm`, NOT `/dashboard/crm`.
4. **Zod 4 Syntax:** Use Zod 4 syntax (`z.email()`, `z.uuid()`, `{ error: "..." }`) rather than legacy v3 methods (`z.string().email()`, `{ required_error: "..." }`).
5. **Currency Sanitization:** Always sanitize currency strings using `cleanNumber()` in `services/ai.service.ts` or `formatCurrency()` in components before saving to prevent `NaN` or `Rp 0` bugs.
6. **Role Normalization:** Always pass user roles through `normalizeRole(profile?.role)` from `lib/permissions.ts` before conducting permission checks.

---

## 27. KNOWN ISSUES & LIMITATIONS

### 27.1 Confirmed Issues `[CONFIRMED]`
* **Invoice Column Duality (`types/invoice.types.ts:72-84`):** The `invoices` table contains both `total_amount` (new canonical field) and `amount` (legacy field). Code must continue using `resolveInvoiceAmount()` until legacy database rows are fully migrated.
* **No Automated Test Runner (`package.json`):** Unit and integration testing relies on manual scenario scripts and node scripts (`scripts/verify-rls.mjs`), with no automated CI test pipeline.

### 27.2 Potential Issues / Unverified `[POTENTIAL ISSUE]`
* **Daily Digest Idempotency Race Condition:** Theoretical concurrency window exists if multiple Vercel cron instances trigger the WhatsApp daily digest simultaneously.
* **CRM Multi-Agent Staging Verification:** Full multi-agent tenant isolation is asserted via RLS test scripts, but full staging verification with concurrent multi-agent accounts is unverified due to staging environment absence.

---

## 28. TECHNICAL DEBT

1. **Duplicate Property Views:** Several property query variations exist between `propertyService.getList()` and legacy dashboard components.
2. **Missing Unit Test Suite:** Absence of Vitest/Playwright test suites creates reliance on manual testing protocols for UI regressions.
3. **Database Migration Sync:** Core tables (`users`, early `crm_*`) were initially created via Supabase SQL Editor rather than baseline migration files, documented retroactively in `docs/crm/00-schema-baseline.md`.

---

## 29. DO NOT CHANGE LIST (FROZEN SYSTEMS)

The following modules represent the **Frozen Security Zone** and must NOT be altered without explicit authorization:

1. **`actions/crm-*.action.ts`:** All CRM Server Actions (strictly audited, session verified, and frozen for regulatory compliance).
2. **`proxy.ts`:** Root gateway interceptor handling canonical apex redirects, session enforcement, and route protection.
3. **`lib/api-auth.ts` & `lib/permissions.ts`:** Centralized authorization gates and role hierarchy definitions.
4. **`lib/ai/policy.ts` & `lib/ai/registry.ts`:** Central AI governance, fail-closed quota architecture, and feature definitions.
5. **`supabase/migrations/*`:** Applied database migrations (must never be modified retroactively; new changes require new sequential migration files).

---

## 30. DEVELOPMENT GUIDELINES FOR FUTURE AI

When assigned a task on Inland Property / PLMS:

1. **Read This Document First:** Treat `INLAND_PROJECT_CONTEXT.md` as canonical technical truth.
2. **Inspect Existing Files Before Modifying:** Verify paths and current code before proposing changes.
3. **Respect the Frozen Security Zone:** Never modify `actions/crm-*.action.ts`, `proxy.ts`, or `lib/api-auth.ts` unless explicitly requested.
4. **Reuse Existing Utilities:**
   * For database clients, use `lib/supabase/*`.
   * For validation, use `lib/validations.ts`.
   * For mortgage calculations, use `lib/kpr.ts`.
   * For AI operations, use `services/ai.service.ts` wrapped with `authorizeAI()`.
   * For address formatting, use `lib/property-address.ts`.
5. **Preserve Next.js 16 Rules:** Remember `proxy.ts` replaces `middleware.ts`. Consult `node_modules/next/dist/docs/` for Next.js 16 conventions.
6. **Preserve Design Language:** Maintain Tailwind CSS 4 design tokens, 44px mobile touch targets, and sonner toast feedback.
7. **Never Invent Missing Requirements:** If a database column or feature cannot be confirmed, mark it `UNKNOWN` and ask for clarification.
8. **Update `CURRENT_STATE.md`:** Always update `CURRENT_STATE.md` at the conclusion of every meaningful coding milestone.

---

## 31. SOURCE REFERENCES

* **Application Gatekeeper:** `proxy.ts`
* **Root Layout & Global Styles:** `app/layout.tsx`, `app/globals.css`
* **Dashboard Shell Layout:** `app/(dashboard)/layout.tsx`
* **Server Actions:** `actions/crm-leads.action.ts`, `actions/crm-contacts.action.ts`, `actions/crm-followups.action.ts`, `actions/crm-interests.action.ts`
* **API Guards & Permissions:** `lib/api-auth.ts`, `lib/permissions.ts`
* **AI Architecture:** `lib/ai/registry.ts`, `lib/ai/policy.ts`, `services/ai.service.ts`, `app/api/admin/ai/settings/route.ts`
* **Property Services & Logic:** `services/property.service.ts`, `lib/property-publish.ts`, `lib/property-address.ts`
* **CRM Service & Rules:** `services/crm.service.ts`, `lib/crm-pipeline.ts`, `docs/crm/*`
* **Database Migrations:** `supabase/migrations/001_...` through `029_...`
* **KPR Calculation Engine:** `lib/kpr.ts`
* **Notification Infrastructure:** `lib/fonnte.ts`, `lib/onesignal.ts`, `lib/notification-events.ts`
* **Site Identity Configuration:** `lib/site-config.ts`

---

## 32. FINAL PROJECT SNAPSHOT

```text
PROJECT:
INLAND Property (PLMS - Property & Lead Management System)

TYPE:
Full-Stack Real Estate Portal & Operational Enterprise Management System

FRONTEND:
Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4, shadcn/ui, Radix UI, Zustand, TanStack React Query v5

BACKEND:
Next.js 16 App Router Route Handlers, Server Actions ('use server'), Supabase PostgREST, Sharp 0.35.3

DATABASE:
PostgreSQL (Supabase Managed) with comprehensive Row Level Security (RLS) policies

AUTH:
Supabase Auth (Email/Password & Google OAuth) with custom role hierarchy (super_admin, admin, agent, marketing, commissioner, viewer)

MAIN USERS:
Public Property Seekers, Registered Clients/Buyers, Real Estate Agents, Marketing Staff, Admins, Super Admins, Commissioners

CORE FEATURES:
Property Catalog & Multi-District Search, 7-Step Property Creation Wizard, KPR Mortgage Simulator, AI Raw Text Listing Parser, Multimodal Invoice OCR, Drag-and-Drop CRM Kanban, Automated WhatsApp Alerts via Fonnte, Web Push via OneSignal, Survey Appointment System, Construction Tracking, Central AI Quota Governance

MAIN PROPERTY WORKFLOW:
Listing Creation Wizard (LocalStorage draft) -> Mandatory Assigned Agent Requirement -> Status Published -> Public Storefront Discovery -> Lead Ingestion -> CRM Pipeline Progression -> Admin Deal Verification -> Deal Won

DEPLOYMENT:
Vercel Cloud Platform with scheduled Vercel Cron jobs

CURRENT STATE:
Production-Ready (Phase 5 Complete: Mobile UX Hardening, Catalog Pagination, Frozen Security Zone active)

BIGGEST TECHNICAL RISKS:
Absence of automated unit/E2E test runner; dual invoice columns requiring migration; theoretical daily digest cron concurrency gap

BIGGEST PRODUCT GAPS:
Customer portal self-service lead tracking; native property co-broking portal ("Titip Properti" marked as coming soon)

IMPORTANT FILES:
proxy.ts, app/layout.tsx, actions/crm-leads.action.ts, lib/api-auth.ts, lib/permissions.ts, lib/ai/policy.ts, services/property.service.ts, lib/kpr.ts, lib/site-config.ts
```
