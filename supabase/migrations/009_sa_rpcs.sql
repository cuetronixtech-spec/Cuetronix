-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/009_sa_rpcs.sql
-- SECURITY DEFINER RPCs for the super admin panel.
-- All functions verify is_super_admin() before operating,
-- bypassing the tenant-scoped RLS policies safely.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Dashboard Stats ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sandbox uuid := '00000000-0000-0000-0000-000000000001';
  v_result  jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT jsonb_build_object(
    'total_tenants',    COUNT(*) FILTER (WHERE id != v_sandbox AND deleted_at IS NULL),
    'active_tenants',   COUNT(*) FILTER (WHERE subscription_status = 'active'   AND id != v_sandbox AND deleted_at IS NULL),
    'trial_tenants',    COUNT(*) FILTER (WHERE subscription_status = 'trial'    AND id != v_sandbox AND deleted_at IS NULL),
    'past_due_tenants', COUNT(*) FILTER (WHERE subscription_status = 'past_due' AND id != v_sandbox AND deleted_at IS NULL),
    'inactive_tenants', COUNT(*) FILTER (WHERE is_active = false                AND id != v_sandbox AND deleted_at IS NULL),
    'total_members', (
      SELECT COUNT(*) FROM tenant_members WHERE tenant_id != v_sandbox
    ),
    'recent_tenants', (
      SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, subscription_status, is_active, created_at
        FROM tenants
        WHERE id != v_sandbox AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 5
      ) r
    )
  )
  INTO v_result
  FROM tenants WHERE deleted_at IS NULL;

  RETURN v_result;
END;
$$;


-- ── 2. List All Tenants ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_list_tenants()
RETURNS TABLE (
  id                  uuid,
  name                text,
  slug                text,
  subscription_status text,
  subscription_interval text,
  is_active           boolean,
  is_sandbox          boolean,
  trial_ends_at       timestamptz,
  created_at          timestamptz,
  owner_user_id       uuid,
  business_email      text,
  plan_name           text,
  member_count        bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN QUERY
  SELECT
    t.id, t.name, t.slug,
    t.subscription_status, t.subscription_interval,
    t.is_active, t.is_sandbox,
    t.trial_ends_at, t.created_at,
    t.owner_user_id,
    tc.business_email,
    p.name  AS plan_name,
    COUNT(tm.id) AS member_count
  FROM tenants t
  LEFT JOIN tenant_config     tc ON tc.tenant_id = t.id
  LEFT JOIN subscription_plans p  ON p.id = t.plan_id
  LEFT JOIN tenant_members    tm ON tm.tenant_id = t.id
  WHERE t.id != '00000000-0000-0000-0000-000000000001'
    AND t.deleted_at IS NULL
  GROUP BY t.id, t.name, t.slug, t.subscription_status, t.subscription_interval,
           t.is_active, t.is_sandbox, t.trial_ends_at, t.created_at,
           t.owner_user_id, tc.business_email, p.name
  ORDER BY t.created_at DESC;
END;
$$;


-- ── 3. Tenant Detail ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_get_tenant_detail(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT jsonb_build_object(
    'tenant',  to_jsonb(t),
    'config',  to_jsonb(tc),
    'plan',    to_jsonb(p),
    'members', COALESCE(
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.joined_at)
       FROM tenant_members m WHERE m.tenant_id = p_tenant_id),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM tenants t
  LEFT JOIN tenant_config      tc ON tc.tenant_id = t.id
  LEFT JOIN subscription_plans p  ON p.id = t.plan_id
  WHERE t.id = p_tenant_id;

  RETURN v_result;
END;
$$;


-- ── 4. Update Tenant ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_update_tenant(
  p_tenant_id         uuid,
  p_is_active         boolean DEFAULT NULL,
  p_subscription_status text   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_admin_id uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  UPDATE tenants
  SET
    is_active           = COALESCE(p_is_active, is_active),
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    updated_at          = NOW()
  WHERE id = p_tenant_id;

  INSERT INTO super_admin_audit_log
    (admin_user_id, action, target_type, target_id, metadata)
  VALUES (
    v_admin_id, 'update_tenant', 'tenant', p_tenant_id,
    jsonb_build_object(
      'is_active', p_is_active,
      'subscription_status', p_subscription_status
    )
  );
END;
$$;


-- ── 5. List Plans (all, incl. inactive) ──────────────────
CREATE OR REPLACE FUNCTION public.sa_list_plans()
RETURNS TABLE (
  id            uuid,
  name          text,
  slug          text,
  price_monthly numeric,
  price_annual  numeric,
  currency      text,
  max_staff     integer,
  max_stations  integer,
  max_customers integer,
  features      jsonb,
  is_active     boolean,
  display_order integer,
  created_at    timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.slug, p.price_monthly, p.price_annual, p.currency,
         p.max_staff, p.max_stations, p.max_customers, p.features,
         p.is_active, p.display_order, p.created_at
  FROM subscription_plans p
  ORDER BY p.display_order NULLS LAST, p.name;
END;
$$;


-- ── 6. Upsert Plan ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_upsert_plan(
  p_name          text,
  p_price_monthly numeric,
  p_price_annual  numeric,
  p_currency      text    DEFAULT 'INR',
  p_max_staff     integer DEFAULT 5,
  p_max_stations  integer DEFAULT 5,
  p_max_customers integer DEFAULT 500,
  p_features      jsonb   DEFAULT '[]',
  p_is_active     boolean DEFAULT true,
  p_display_order integer DEFAULT 0,
  p_id            uuid    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  IF p_id IS NOT NULL THEN
    UPDATE subscription_plans
    SET name = p_name, price_monthly = p_price_monthly, price_annual = p_price_annual,
        currency = p_currency, max_staff = p_max_staff, max_stations = p_max_stations,
        max_customers = p_max_customers, features = p_features,
        is_active = p_is_active, display_order = p_display_order
    WHERE id = p_id;
    RETURN p_id;
  ELSE
    INSERT INTO subscription_plans
      (name, price_monthly, price_annual, currency, max_staff, max_stations,
       max_customers, features, is_active, display_order)
    VALUES
      (p_name, p_price_monthly, p_price_annual, p_currency, p_max_staff, p_max_stations,
       p_max_customers, p_features, p_is_active, p_display_order)
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
END;
$$;


-- ── 7. Delete Plan ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_delete_plan(p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  DELETE FROM subscription_plans WHERE id = p_plan_id;
END;
$$;


-- ── 8. Revenue Stats ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_get_revenue_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT jsonb_build_object(
    'summary', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'status',        subscription_status,
        'count',         cnt,
        'plan_name',     plan_name,
        'price_monthly', price_monthly
      )), '[]'::jsonb)
      FROM (
        SELECT t.subscription_status, p.name AS plan_name, p.price_monthly, COUNT(*) AS cnt
        FROM tenants t
        LEFT JOIN subscription_plans p ON p.id = t.plan_id
        WHERE t.id != '00000000-0000-0000-0000-000000000001' AND t.deleted_at IS NULL
        GROUP BY t.subscription_status, p.name, p.price_monthly
      ) x
    ),
    'tenants', (
      SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT t.id, t.name, t.slug, t.subscription_status, t.subscription_interval,
               t.created_at, t.trial_ends_at, t.current_period_end,
               p.name AS plan_name, p.price_monthly, p.price_annual
        FROM tenants t
        LEFT JOIN subscription_plans p ON p.id = t.plan_id
        WHERE t.id != '00000000-0000-0000-0000-000000000001' AND t.deleted_at IS NULL
        ORDER BY t.created_at DESC
      ) r
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ── 9. Audit Log ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sa_get_audit_log(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id            uuid,
  admin_user_id uuid,
  admin_email   text,
  action        text,
  target_type   text,
  target_id     uuid,
  metadata      jsonb,
  ip_address    text,
  created_at    timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN QUERY
  SELECT al.id, al.admin_user_id, sa.email AS admin_email,
         al.action, al.target_type, al.target_id,
         al.metadata, al.ip_address, al.created_at
  FROM super_admin_audit_log al
  LEFT JOIN superadmins sa ON sa.id = al.admin_user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;


-- ── Grants ────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.sa_get_dashboard_stats()                                                                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_list_tenants()                                                                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_get_tenant_detail(uuid)                                                                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_update_tenant(uuid, boolean, text)                                                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_list_plans()                                                                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_upsert_plan(text, numeric, numeric, text, integer, integer, integer, jsonb, boolean, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_delete_plan(uuid)                                                                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_get_revenue_stats()                                                                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_get_audit_log(integer)                                                                            TO authenticated;
