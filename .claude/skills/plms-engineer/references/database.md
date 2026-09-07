# PLMS Database Reference

Primary persistence uses Supabase/PostgreSQL.

## Rules
- Inspect existing schema and access patterns before adding queries.
- Prefer existing service/data-access abstractions.
- Preserve RLS assumptions.
- Avoid query-in-render loops and obvious N+1 patterns.
- Paginate growing collections such as leads, follow-ups, logs, invoices, notifications, and reports.
- For performance claims, capture a baseline and compare after the change when tooling/data access permits.
- Do not add indexes blindly; consider read benefit vs write/storage cost.
- Treat migrations and RLS changes as high-risk changes requiring focused review.
