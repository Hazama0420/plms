# PROJECT MAP

> Purpose: navigation map for AI agents.
> This file describes repository structure and important code locations.
> It is NOT a business-rule document or implementation proof.

## 1. Context Loading Policy

- **Always scan** the actual repository structure before making assumptions
- **Always verify** paths exist before listing them in analysis
- **Never rely** on outdated documentation from PROJECT_MAP.md
- **Current source of truth**: actual filesystem structure in repository

**Context Loading Order:**
```
CLAUDE.md
    ↓
CURRENT_STATE.md
    ↓
PROJECT_MAP.md
    ↓
Relevant domain docs
    ↓
Relevant source files
    ↓
Implementation
```

## 2. Application Routes

### Public Routes
- `/` - Landing page (`app/page.tsx`)
- `/login` - User login (`app/login/`)
- `/register` - User registration (`app/register/`)
- `/forgot-password` - Password reset (`app/forgot-password/`)

### Dashboard Routes (`app/(dashboard)/`)
- `/dashboard` - Main dashboard page (`dashboard/page.tsx`)
- `/properties` - Property management (`properties/page.tsx`)
- `/properties/create` - Create new property (`properties/create/`)
- `/properties/[id]` - Property details (`properties/[id]/`)
- `/crm` - CRM main page (`crm/page.tsx`)
- `/crm/leads` - Lead management (`crm/leads/`)
- `/crm/followups` - Follow-up management (`crm/followups/`)
- `/admin` - Admin section (`admin/`)
- `/admin/users` - User management (`admin/users/`)
- `/admin/logs` - System logs (`admin/logs/`)
- `/admin/ai` - AI management (`admin/ai/`)
- `/invoices` - Invoice management (`invoices/`)
- `/projects` - Project management (`projects/`)
- `/reports` - Reports section (`reports/`)
- `/surveys` - Survey management (`surveys/`)
- `/notifications` - Notifications (`notifications/`)
- `/settings` - User settings (`settings/`)
- `/legal` - Legal documents (`legal/`)

**Note**: This list is not exhaustive; search `app/(dashboard)/` when working on routes not listed here.

## 3. Important API Routes

### AI & Management APIs (`app/api/`)
- `/api/ai/followup/` - AI follow-up generation
- `/api/ai/generate/` - AI content generation
- `/api/ai/scan-invoice/` - AI invoice scanning
- `/api/admin/ai/settings/` - Super Admin AI management
- `/api/chat/` - Chat functionality
- `/api/dashboard/summary/` - Dashboard AI summary
- `/api/parse-listing/` - Property listing parser

### Core Business APIs
- `/api/properties/` - Property CRUD operations
- `/api/leads/` - Lead management
- `/api/invoices/` - Invoice operations
- `/api/surveys/` - Survey operations
- `/api/media/` - Media upload/processing
- `/api/notifications/` - Notification system
- `/api/agents/` - Agent management
- `/api/auth/` - Authentication (if exists)
- `/api/support/` - Support operations

**Note**: This list is not exhaustive; search `app/api/` when working on an endpoint not listed here.

## 4. Server Actions

**Status**: ✅ IMPLEMENTED dan FROZEN
- **Directory**: `actions/` exists with CRM mutation actions
- **Security**: `'use server'` directives, session verification, audit logging
- **Files**: 
  - `actions/crm-leads.action.ts` - Lead mutations (491 lines)
  - `actions/crm-contacts.action.ts` - Contact mutations
  - `actions/crm-followups.action.ts` - Follow-up mutations
  - `actions/crm-interests.action.ts` - Interest mutations

### Security Zone
These files are part of the **Frozen Security Zone** and require explicit authorization for modifications.

## 5. Important Services

### Core Services (`services/`)
- `crm.service.ts` - CRM business logic
- `property.service.ts` - Property management logic
- `ai.service.ts` - AI integration service (multi-provider fallback)
- `dashboard.service.ts` - Dashboard data aggregation
- `user.service.ts` - User management
- `report.service.ts` - Report generation
- `notification.service.ts` - Notification handling
- `project.service.ts` - Project management logic

## 6. Important Shared Libraries

### Infrastructure (`lib/`)
- `api-auth.ts` - API authentication middleware
- `permissions.ts` - Role-based permissions
- `audit-log.ts` - Audit logging system
- `ai-quota.ts` - AI quota management
- `rate-limit.ts` - API rate limiting

### Business Logic Libraries
- `ai/registry.ts` - AI feature registry (AI_FEATURE_REGISTRY)
- `ai/policy.ts` - Central AI authorization policy (authorizeAI)
- `crm-pipeline.ts` - CRM pipeline management
- `kpr.ts` - KPR calculation engine
- `property-address.ts` - Property address utilities
- `supabase/` - Supabase client configuration
- `validations.ts` - Input validation schemas

### Notifications & Integrations
- `fonnte.ts` - WhatsApp integration
- `onesignal.ts` - Push notification service
- `notification-helper.ts` - Notification helpers
- `templates/` - Email/SMS templates

## 7. Major UI / Component Modules

### Core Layout (`app/`)
- `app-shell.tsx` - Main application shell (if exists)
- `layout.tsx` - Root layout component
- `globals.css` - Global styles

### Property Components (`components/`)
- `create-property/` - Property creation wizard
  - `CreatePropertyWizard.tsx` - Main wizard component
  - `steps/` - Individual form step components
  - `SidebarStepper.tsx` - Step navigation
  - `PropertyScoreCard.tsx` - Listing completeness scoring
- `property-detail/` - Property detail modules (if exists)

### CRM Components (`components/crm/`)
- CRM interface components (verify specific files needed)

### AI Components (`components/`)
- AI interface components (verify specific files needed)

### Admin Components (`components/admin/`)
- User management interface
- System logs viewer
- AI management UI

### UI Framework (`components/ui/`)
- shadcn/ui base components
- Reusable design system components

### Shared Components (`components/`)
- `app-header.tsx` - Application header
- `notification-bell.tsx` - Notification indicator
- Theme providers and navigation components

## 8. AI Architecture

### Entry Points
- **Registry**: `lib/ai/registry.ts` - AI_FEATURE_REGISTRY
- **Policy**: `lib/ai/policy.ts` - authorizeAI function
- **API**: `app/api/ai/` - AI endpoints
- **Service**: `services/ai.service.ts` - Multi-provider AI service
- **Admin**: `app/api/admin/ai/settings/` - AI management API
- **Components**: AI interface components

### Authority Rules
- **super_admin**: Full AI management access
- **admin**: Unlimited AI usage, NO settings access
- **agent**: 5 successful generations/day
- **Other roles**: 0/generation disabled by default

### AI Features Registry
Current registered features (verify `lib/ai/registry.ts` for complete list):
- `property.parse` - Property listing extraction
- `property.description` - Description generation
- `property.title` - Title generation
- `crm.followup` - CRM follow-up generation
- `finance.scan_invoice` - Invoice OCR scanning
- `executive.summary` - Dashboard AI summary

**CRITICAL**: Do not create feature-specific AI quota systems. Use the central registry.

## 9. Property Architecture

### Entry Points
- **Routes**: `app/(dashboard)/properties/` - Property management
  - Main listing: `/properties`
  - Create wizard: `/properties/create`
  - Property details: `/properties/[id]`
- **Service**: `services/property.service.ts` - Property business logic
- **API**: `app/api/properties/` - Property CRUD operations
- **Components**: `components/create-property/` - Property creation wizard

### Property Creation System
**CreatePropertyWizard**: Complete 7-step production system
- Step 1: Category & Photos
- Step 2: Specification  
- Step 3: Location (with Supabase regions integration)
- Step 4: Facilities
- Step 5: Price & Description
- Step 6: Contact
- Step 7: Review & Publish

### Key Features
- ✅ **AI Auto-Fill**: Indonesian property terminology parsing
- ✅ **Draft System**: localStorage dengan create/edit separation
- ✅ **Mobile Responsive**: Professional 3-button navigation
- ✅ **Region Intelligence**: AI candidate → Supabase regions lookup
- ✅ **File Upload**: Image processing and validation

## 10. CRM Architecture

### Entry Points
- **Routes**: `app/(dashboard)/crm/` - CRM interface
  - Main page: `/crm`
  - Leads: `/crm/leads`
  - Follow-ups: `/crm/followups`
- **Server Actions**: `actions/crm-*.action.ts` - CRM mutations
- **Service**: `services/crm.service.ts` - CRM business logic
- **API**: `app/api/leads/` - Lead management REST endpoints
- **Library**: `lib/crm-pipeline.ts` - Pipeline business rules

### Security & Audit
- ✅ **Server Actions**: 100% mutations through secure actions/
- ✅ **RLS Policies**: Verified (29/32 tests passing)
- ✅ **Audit Logging**: Complete user action tracking
- ✅ **Role-based Access**: `normalizeRole()` implementation

### Current Status
**CRM System**: Phase 1A COMPLETE dan FROZEN
- Multi-agent isolation: [UNVERIFIED] - staging environmental needed

## 11. Admin Architecture

### Entry Points
- **Routes**: `app/(dashboard)/admin/` - Admin interface
  - User management: `/admin/users`
  - System logs: `/admin/logs`
  - AI management: `/admin/ai`
- **API**: `app/api/admin/` - Administrative operations
- **Components**: `components/admin/` - Admin UI components
- **Service**: `services/user.service.ts` - User management logic

### Admin Capabilities
- User management and role assignment
- System activity and audit log viewing
- AI feature management (super_admin only)
- System configuration and monitoring

## 12. Database Architecture

### Supabase Integration
- **Location**: `supabase/migrations/` - Database schema
- **RLS**: Row Level Security implemented and verified
- **Authentication**: Supabase Auth with custom role mapping

### Key Tables
- **CRM**: `crm_leads`, `crm_contacts`, `crm_followups`, `crm_interests`
- **Property**: `properties`, `regions`
- **Users**: `users` (custom profile model)
- **AI**: `ai_usage`, system_settings
- **Audit**: `admin_audit_log`

### Migrations
**Status**: 25+ migrations implemented
**Verification**: `node scripts/verify-rls.mjs` → 29 passed, 0 failed, 3 skipped

## 13. Documentation Structure

### Domain Documentation (`docs/`)
- `crm/` - CRM-specific business rules
- `ai/` - AI architecture and management
- `property/` - Property system documentation
- `security/` - Security policies and procedures

### Project Documentation
- `CURRENT_STATE.md` - Current implementation state
- `PROJECT_CONTEXT.md` - Permanent architecture rules
- `CLAUDE.md` - AI agent instructions

**Note**: Documentation structure verification needed during actual use.

## 14. Source-of-Truth Rules

1. **Filesystem is authoritative** - Always check actual file paths
2. **Route discovery** - Use filesystem routing in `app/` directory
3. **Server Actions verification** - Check `actions/` directory presence
4. **AI architecture verification** - Check `lib/ai/` implementation
5. **Service discovery** - Check `services/` directory structure
6. **Component discovery** - Check `components/` directory organization

## 15. Verification Commands

After meaningful changes, run relevant verification:

```bash
# Type Safety
npx tsc --noEmit

# Build System  
npm run build

# Code Quality
npm run lint

# Database Security
node scripts/verify-rls.mjs
```

### Security-Sensitive Areas
When modifying security-sensitive areas (Server Actions, RLS, Auth), prioritize:
- authorization verification
- RLS policy compliance
- audit logging functionality
- server/client boundary integrity

---

**Repository Implementation Truth**: This map describes repository structure based on latest audit. Always verify against actual source code for critical implementation details.