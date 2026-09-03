-- ======================================================================================
-- MIGRATION 029: PHASE 4 - LEGACY AI RPC CLEANUP
-- ======================================================================================
-- DESCRIPTION:
-- Drops the obsolete legacy signatures for AI quota management. 
-- The system has fully migrated to the Central AI Policy (`authorizeAI()`) which 
-- uses the 6-argument `consume_ai_quota` and 4-argument `add_ai_tokens` functions 
-- (which include the explicit `p_usage_date` parameter).
-- ======================================================================================

-- 1. DROP LEGACY 5-ARGUMENT `consume_ai_quota`
-- The original function created in Migration 005.
DROP FUNCTION IF EXISTS public.consume_ai_quota(text, text, integer, bigint, bigint);

-- 2. DROP LEGACY 3-ARGUMENT `add_ai_tokens`
-- The original function created in Migration 005.
DROP FUNCTION IF EXISTS public.add_ai_tokens(text, text, bigint);

-- We explicitly DO NOT DROP the new canonical signatures created in Migration 026:
-- public.consume_ai_quota(text, text, integer, bigint, bigint, date)
-- public.add_ai_tokens(text, text, bigint, date)
-- public.refund_ai_quota(text, text, date)
