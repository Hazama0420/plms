# PLMS Security Reference

Use this reference for authentication, authorization, RBAC, route protection, Supabase, RLS, user/admin functions, API boundaries, uploads, AI providers, and sensitive business data.

## Security order
1. Authentication
2. Authorization / role
3. Record ownership or business scope
4. Input validation
5. Data access / RLS
6. Output/error leakage
7. Secrets and configuration
8. Abuse/rate-limit considerations

## PLMS-specific rule
`proxy.ts` is an early access-control layer, not the sole security boundary. Preserve server-side authorization and Supabase RLS.

## Review checklist
- Is the user authenticated?
- Is the user allowed to perform this operation?
- Can a user change an ID and access another record?
- Does the server re-check permissions?
- Are sensitive fields excluded from client responses?
- Are environment secrets server-only?
- Are redirects constrained?
- Are uploaded files validated by type/size/path policy?
- Are external AI requests isolated from secrets and validated on return?
- Are errors safe for end users?
