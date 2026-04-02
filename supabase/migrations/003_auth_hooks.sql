-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/003_auth_hooks.sql
-- JWT custom claims hook — injects tenant_id, role, plan
-- features into every authenticated user's JWT
-- ═══════════════════════════════════════════════════════════

-- This function is called by Supabase as a "Hook" after auth.
-- Register it in Supabase Dashboard → Auth → Hooks →
--   "Customize Access Token (JWT) Claims"
--   Function: public.custom_jwt_claims

CREATE OR REPLACE FUNCTION public.custom_jwt_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_record  RECORD;
  plan_record    RECORD;
  claims         jsonb;
BEGIN
  -- Start with whatever claims Supabase already built
  claims := event->'claims';

  -- Look up tenant membership for this user
  SELECT
    tm.tenant_id,
    tm.role,
    t.subscription_status,
    t.plan_id,
    t.is_sandbox
  INTO member_record
  FROM tenant_members tm
  JOIN tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = (event->>'user_id')::uuid
    AND tm.is_active = TRUE
    AND t.is_active  = TRUE
  LIMIT 1;

  IF member_record IS NULL THEN
    -- Check if this is a super admin (no tenant membership required)
    IF EXISTS (
      SELECT 1 FROM superadmins
      WHERE id = (event->>'user_id')::uuid AND is_active = TRUE
    ) THEN
      claims := jsonb_set(claims, '{app_metadata}',
        COALESCE(claims->'app_metadata', '{}') || '{"role":"super_admin"}'::jsonb
      );
    END IF;
    RETURN claims;
  END IF;

  -- Fetch plan features
  SELECT * INTO plan_record
  FROM subscription_plans
  WHERE id = member_record.plan_id;

  -- Inject custom claims into app_metadata
  claims := jsonb_set(claims, '{app_metadata}',
    COALESCE(claims->'app_metadata', '{}') || jsonb_build_object(
      'tenant_id',            member_record.tenant_id,
      'role',                 member_record.role,
      'subscription_status',  member_record.subscription_status,
      'is_sandbox',           member_record.is_sandbox,
      'plan_slug',            COALESCE(plan_record.slug, 'starter'),
      'plan_max_stations',    plan_record.max_stations,
      'plan_max_staff',       plan_record.max_staff,
      'features',             COALESCE(plan_record.features, '{}'::jsonb)
    )
  );

  RETURN claims;
END;
$$;

-- Grant execute to supabase_auth_admin (required for hooks)
GRANT EXECUTE ON FUNCTION public.custom_jwt_claims(jsonb) TO supabase_auth_admin;

-- ─────────────────────────────────────────────────────────
-- Helper: extract tenant_id from JWT app_metadata
-- Used internally in RLS policies
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt()->'app_metadata'->>'role';
$$;

CREATE OR REPLACE FUNCTION auth.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.user_role() IN ('admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.user_role() = 'admin';
$$;
