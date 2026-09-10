-- Read-only verification for migration 033.
-- Expected ACL: PUBLIC=false, anon=false, authenticated=false, service_role=true.

BEGIN TRANSACTION READ ONLY;

WITH named_functions AS MATERIALIZED (
  SELECT p.oid, p.proowner, p.prosecdef, p.proconfig, p.proacl,
    n.nspname, p.proname
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'process_deal_closing_atomic'
),
exact_function AS (
  SELECT f.*
  FROM named_functions AS f
  WHERE f.oid = to_regprocedure(
    'public.process_deal_closing_atomic(uuid,uuid,numeric)'
  )
)
SELECT
  (SELECT count(*) FROM named_functions) AS overload_count,
  format('%I.%s', f.nspname, f.oid::regprocedure::text)
    AS exact_function_signature,
  pg_get_userbyid(f.proowner) AS owner,
  f.prosecdef AS security_definer,
  (
    SELECT option_value
    FROM pg_options_to_table(f.proconfig)
    WHERE option_name = 'search_path'
  ) AS search_path,
  CASE WHEN f.oid IS NULL THEN NULL ELSE EXISTS (
    SELECT 1
    FROM aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) AS acl
    WHERE acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) END AS public_execute,
  has_function_privilege('anon', f.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', f.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role', f.oid, 'EXECUTE') AS service_role_execute
FROM (VALUES (1)) AS singleton(value)
LEFT JOIN exact_function AS f ON true;

COMMIT;
