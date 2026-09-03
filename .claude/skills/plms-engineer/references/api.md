# PLMS API Reference

Use existing Next.js Route Handlers / server-side service patterns rather than inventing a second API architecture.

## Boundary rules
- Validate inputs at the boundary with Zod or the existing repository convention.
- Authenticate and authorize before privileged data access.
- Return consistent, actionable errors.
- Do not expose database internals or stack traces.
- Preserve stable response shapes for callers.
- Add pagination/filtering to collection endpoints when data can grow.
- Keep provider-specific AI/database logic behind service boundaries where practical.
