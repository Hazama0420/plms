# Security-Sensitive Change Workflow

1. Map the protected route/API/data path.
2. Identify authentication and role checks.
3. Identify ownership/business-scope checks.
4. Inspect Supabase/RLS enforcement.
5. Validate inputs and output exposure.
6. Check secrets, redirects, uploads, and provider calls.
7. Test permitted and denied cases.
8. Review the diff for bypasses or accidental privilege expansion.
9. Run relevant lint/type/tests and document evidence.
