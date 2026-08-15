# Project Map

> Purpose: navigation map for AI agents.
> This file is a map, not a source of business rules.
> For business/security rules, read the relevant documents under `docs/`.

---

## 1. Application Routes

### Public

| Route       | Source          |
| ----------- | --------------- |
| `/`         | `app/page.tsx`  |
| `/login`    | `app/login/`    |
| `/register` | `app/register/` |

### Dashboard

> Route group `(dashboard)` does not appear in the public URL.

| Public Route  | Source                        |
| ------------- | ----------------------------- |
| `/dashboard`  | `app/(dashboard)/dashboard/`  |
| `/properties` | `app/(dashboard)/properties/` |
| `/invoices`   | `app/(dashboard)/invoices/`   |
| `/settings`   | `app/(dashboard)/settings/`   |

### CRM

| Public Route               | Source                                     |
| -------------------------- | ------------------------------------------ |
| `/crm`                     | `app/(dashboard)/crm/`                     |
| `/crm/leads`               | `app/(dashboard)/crm/leads/`               |
| `/crm/leads/create`        | `app/(dashboard)/crm/leads/create/`        |
| `/crm/leads/[id]`          | `app/(dashboard)/crm/leads/[id]/`          |
| `/crm/leads/[id]/edit`     | `app/(dashboard)/crm/leads/[id]/edit/`     |
| `/crm/followups`           | `app/(dashboard)/crm/followups/`           |
| `/crm/followups/create`    | `app/(dashboard)/crm/followups/create/`    |
| `/crm/followups/[id]`      | `app/(dashboard)/crm/followups/[id]/`      |
| `/crm/followups/[id]/edit` | `app/(dashboard)/crm/followups/[id]/edit/` |

---

## 2. Important API Routes

### Leads

| API                                     | Purpose                |
| --------------------------------------- | ---------------------- |
| `app/api/leads/route.ts`                | Lead intake / creation |
| `app/api/leads/[id]/follow-up/route.ts` | Follow-Up creation     |
| `app/api/leads/[id]/assign/route.ts`    | Lead assignment        |

### AI

| API                            | Purpose                 |
| ------------------------------ | ----------------------- |
| `app/api/ai/followup/route.ts` | AI Follow-Up generation |
| `app/api/chat/route.ts`        | Existing chatbot        |

### Admin

| API                           | Purpose              |
| ----------------------------- | -------------------- |
| `app/api/admin/logs/route.ts` | Admin log operations |

> Do not assume this list is exhaustive.
> Search the repository when a task requires another endpoint.

---

## 3. Important Services

| Domain    | File                            |
| --------- | ------------------------------- |
| CRM       | `services/crm.service.ts`       |
| AI        | `services/ai.service.ts`        |
| Reports   | `services/report.service.ts`    |
| Dashboard | `services/dashboard.service.ts` |

---

## 4. Important Shared Libraries

| Domain         | File                  |
| -------------- | --------------------- |
| Authentication | `lib/api-auth.ts`     |
| Permissions    | `lib/permissions.ts`  |
| Pipeline       | `lib/crm-pipeline.ts` |
| AI quota       | `lib/ai-quota.ts`     |
| Audit          | `lib/audit-log.ts`    |

---

## 5. Important CRM Components

| Component                                 | Purpose            |
| ----------------------------------------- | ------------------ |
| `components/crm/CrmKanbanBoard.tsx`       | CRM pipeline board |
| `components/crm/AgentActivityMonitor.tsx` | Agent monitoring   |

---

## 6. CRM Documentation Map

| Topic                 | Document                               |
| --------------------- | -------------------------------------- |
| Schema / baseline     | `docs/crm/00-schema-baseline.md`       |
| Business rules        | `docs/crm/01-business-rules.md`        |
| Roles & permissions   | `docs/crm/02-roles-permissions.md`     |
| Lead governance       | `docs/crm/03-lead-governance.md`       |
| Pipeline              | `docs/crm/04-pipeline-rules.md`        |
| Follow-Up             | `docs/crm/05-follow-up-rules.md`       |
| Audit                 | `docs/crm/06-audit-system.md`          |
| Risk Engine           | `docs/crm/07-risk-engine.md`           |
| AI CRM                | `docs/crm/08-ai-crm.md`                |
| CRM UI                | `docs/crm/09-crm-ui.md`                |
| Implementation phases | `docs/crm/10-implementation-phases.md` |

---

## 7. Context Routing Rules

When a task is received, do NOT read the entire repository.

Use the smallest relevant context.

### Lead / Ownership

Read:

* `docs/crm/02-roles-permissions.md`
* `docs/crm/03-lead-governance.md`

Inspect only relevant:

* Lead route
* Lead action/service
* permissions
* relevant RLS/migration

### Pipeline

Read:

* `docs/crm/04-pipeline-rules.md`
* `docs/crm/06-audit-system.md`

Inspect:

* `lib/crm-pipeline.ts`
* pipeline actions/routes
* Kanban component
* related types

### Follow-Up

Read:

* `docs/crm/05-follow-up-rules.md`
* `docs/crm/03-lead-governance.md`

Inspect only the Follow-Up route/action/service and related RLS.

### Security / RLS

Read:

* `docs/crm/00-schema-baseline.md`
* `docs/crm/02-roles-permissions.md`
* `docs/crm/03-lead-governance.md`
* `docs/crm/05-follow-up-rules.md`
* `docs/crm/06-audit-system.md`

Inspect only the affected migrations, server authorization, actions/routes, and RLS verification.

### AI CRM

Read:

* `docs/crm/08-ai-crm.md`
* `docs/crm/07-risk-engine.md` only when the task involves risk explanation

Then inspect the existing AI infrastructure.

---

## 8. Context Loading Policy

1. Read `CLAUDE.md`.
2. Read `CURRENT_STATE.md`.
3. Read this file only when navigation is needed.
4. Identify the task domain.
5. Read only the relevant domain documents.
6. Inspect only source files directly relevant to the task.
7. Do not scan the entire repository unless the task is explicitly an audit.
8. Do not treat this file as proof that a feature exists.
9. Source code, migrations, and verified live schema are the implementation truth.
10. `CURRENT STATE` is the project-progress truth.
11. Domain documents define business/design rules.

---

## 9. Important Principle

**Full project knowledge does not mean full project context on every request.**

The agent should discover context progressively:

```text
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
    ↓
Verification
```

Never start by reading the entire project.
