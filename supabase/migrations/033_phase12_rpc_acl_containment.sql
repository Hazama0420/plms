-- Phase 12 Step 1C.1: contain the exposed deal-closing RPC ACL only.

BEGIN;

DO $$
DECLARE
  v_overload_count integer;
  v_function_oid oid;
  v_owner text;
BEGIN
  SELECT count(*)
  INTO v_overload_count
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'process_deal_closing_atomic';

  IF v_overload_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one public.process_deal_closing_atomic overload; found %.',
      v_overload_count;
  END IF;

  v_function_oid := to_regprocedure(
    'public.process_deal_closing_atomic(uuid,uuid,numeric)'
  );

  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION
      'Expected function public.process_deal_closing_atomic(uuid,uuid,numeric) was not found.';
  END IF;

  SELECT pg_get_userbyid(p.proowner)
  INTO v_owner
  FROM pg_proc AS p
  WHERE p.oid = v_function_oid;

  IF v_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'Expected public.process_deal_closing_atomic(uuid,uuid,numeric) owner postgres; found %.',
      coalesce(v_owner, '<missing>');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.process_deal_closing_atomic(uuid, uuid, numeric)
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION
  public.process_deal_closing_atomic(uuid, uuid, numeric)
FROM anon;

REVOKE EXECUTE ON FUNCTION
  public.process_deal_closing_atomic(uuid, uuid, numeric)
FROM authenticated;

GRANT EXECUTE ON FUNCTION
  public.process_deal_closing_atomic(uuid, uuid, numeric)
TO service_role;

COMMIT;
