-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/007_bootstrap_and_rpcs.sql
-- Bootstrap RLS policies + key RPCs for the auth + onboarding flow
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- Bootstrap policy: let a user see their own tenant_members row
-- even before the JWT carries tenant_id (right after sign-up)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'tenant_members'
      AND policyname = 'tenant_members_own_user_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "tenant_members_own_user_select"
        ON tenant_members FOR SELECT
        USING (user_id = auth.uid())
    $policy$;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────
-- RPC: get_my_tenant_config
-- Returns the full tenant_config row as JSONB for the calling user.
-- SECURITY DEFINER bypasses RLS — safe because it uses auth.uid() internally.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_tenant_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT to_jsonb(tc.*) INTO result
  FROM   tenant_config tc
  JOIN   tenant_members tm ON tm.tenant_id = tc.tenant_id
  WHERE  tm.user_id   = auth.uid()
    AND  tm.is_active = TRUE
  LIMIT 1;

  RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- RPC: check_slug_available
-- Returns TRUE when a slug can be registered.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug)
    AND p_slug NOT IN ('demo','www','app','api','admin','super-admin','mail','support','help','billing');
$$;

-- ─────────────────────────────────────────────────────────
-- RPC: create_tenant
-- Creates a complete tenant workspace for the calling auth user:
--   tenants row, tenant_config, tenant_members (admin), onboarding_progress, cash_vault
-- Called immediately after supabase.auth.signUp, before JWT has tenant_id.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_tenant(
  p_slug         TEXT,
  p_name         TEXT,
  p_country      TEXT DEFAULT 'IN',
  p_owner_email  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id       UUID;
  v_user_id         UUID;
  v_currency_code   TEXT := 'INR';
  v_currency_symbol TEXT := '₹';
  v_timezone        TEXT := 'Asia/Kolkata';
  v_date_format     TEXT := 'DD/MM/YYYY';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate slug
  IF NOT (SELECT public.check_slug_available(p_slug)) THEN
    RAISE EXCEPTION 'Slug "%" is not available', p_slug;
  END IF;

  -- Country-based locale defaults (matches Appendix A of PRD)
  CASE p_country
    WHEN 'US' THEN
      v_currency_code := 'USD'; v_currency_symbol := '$';
      v_timezone := 'America/New_York'; v_date_format := 'MM/DD/YYYY';
    WHEN 'GB' THEN
      v_currency_code := 'GBP'; v_currency_symbol := '£';
      v_timezone := 'Europe/London'; v_date_format := 'DD/MM/YYYY';
    WHEN 'AU' THEN
      v_currency_code := 'AUD'; v_currency_symbol := 'A$';
      v_timezone := 'Australia/Sydney'; v_date_format := 'DD/MM/YYYY';
    WHEN 'CA' THEN
      v_currency_code := 'CAD'; v_currency_symbol := 'C$';
      v_timezone := 'America/Toronto'; v_date_format := 'MM/DD/YYYY';
    WHEN 'AE' THEN
      v_currency_code := 'AED'; v_currency_symbol := 'د.إ';
      v_timezone := 'Asia/Dubai'; v_date_format := 'DD/MM/YYYY';
    WHEN 'SG' THEN
      v_currency_code := 'SGD'; v_currency_symbol := 'S$';
      v_timezone := 'Asia/Singapore'; v_date_format := 'DD/MM/YYYY';
    WHEN 'ZA' THEN
      v_currency_code := 'ZAR'; v_currency_symbol := 'R';
      v_timezone := 'Africa/Johannesburg'; v_date_format := 'DD/MM/YYYY';
    WHEN 'EU' THEN
      v_currency_code := 'EUR'; v_currency_symbol := '€';
      v_timezone := 'Europe/Paris'; v_date_format := 'DD/MM/YYYY';
    ELSE  -- IN (India) is the platform default
      v_currency_code := 'INR'; v_currency_symbol := '₹';
      v_timezone := 'Asia/Kolkata'; v_date_format := 'DD/MM/YYYY';
  END CASE;

  -- Create tenant
  INSERT INTO tenants (slug, name, owner_user_id, subscription_status, trial_ends_at)
  VALUES (p_slug, p_name, v_user_id, 'trialing', NOW() + INTERVAL '14 days')
  RETURNING id INTO v_tenant_id;

  -- Create tenant_config with locale defaults
  INSERT INTO tenant_config (
    tenant_id, brand_name,
    currency_code, currency_symbol,
    timezone, date_format,
    business_country, business_email
  ) VALUES (
    v_tenant_id, p_name,
    v_currency_code, v_currency_symbol,
    v_timezone, v_date_format,
    p_country, p_owner_email
  );

  -- Add calling user as admin
  INSERT INTO tenant_members (tenant_id, user_id, role, joined_at)
  VALUES (v_tenant_id, v_user_id, 'admin', NOW());

  -- Initialise onboarding progress
  INSERT INTO onboarding_progress (tenant_id)
  VALUES (v_tenant_id);

  -- Initialise cash vault
  INSERT INTO cash_vault (tenant_id, balance, currency)
  VALUES (v_tenant_id, 0, v_currency_code);

  RETURN v_tenant_id;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- RPC: get_my_tenant_id
-- Lightweight helper — returns just the tenant_id for the caller.
-- Used in TenantContext as a fallback when JWT app_metadata is stale.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id
  FROM   tenant_members
  WHERE  user_id   = auth.uid()
    AND  is_active = TRUE
  LIMIT 1;
$$;
