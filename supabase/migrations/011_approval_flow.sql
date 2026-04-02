-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/011_approval_flow.sql
-- Adds super-admin approval gate + sandbox seeding flow.
-- New tenants start with is_approved = FALSE and are shown a
-- "pending activation" screen until an SA approves + seeds data.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Add is_approved column to tenants ─────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Approve all existing tenants so current users are never locked out
UPDATE tenants SET is_approved = TRUE WHERE is_approved = FALSE;


-- ── 2. Update get_my_tenant_config to enrich with tenant fields ──
-- Previous version returned only tenant_config.* which is missing
-- slug, name, trial/subscription status, sandbox flag, and approval status.
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

  IF result IS NULL THEN RETURN NULL; END IF;

  -- Enrich with live tenant-level fields
  result := result || (
    SELECT jsonb_build_object(
      'tenant_slug',          t.slug,
      'tenant_name',          t.name,
      'trial_ends_at',        t.trial_ends_at,
      'subscription_status',  t.subscription_status,
      'is_sandbox',           t.is_sandbox,
      'owner_user_id',        t.owner_user_id,
      'is_approved',          t.is_approved
    )
    FROM tenants t
    WHERE t.id = (result->>'tenant_id')::uuid
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_config() TO authenticated;


-- ── 3. Update sa_list_tenants to expose is_approved ──────
CREATE OR REPLACE FUNCTION public.sa_list_tenants()
RETURNS TABLE (
  id                    uuid,
  name                  text,
  slug                  text,
  subscription_status   text,
  subscription_interval text,
  is_active             boolean,
  is_sandbox            boolean,
  is_approved           boolean,
  trial_ends_at         timestamptz,
  created_at            timestamptz,
  owner_user_id         uuid,
  business_email        text,
  plan_name             text,
  member_count          bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN QUERY
  SELECT
    t.id, t.name, t.slug,
    t.subscription_status, t.subscription_interval,
    t.is_active, t.is_sandbox, t.is_approved,
    t.trial_ends_at, t.created_at,
    t.owner_user_id,
    tc.business_email,
    p.name  AS plan_name,
    COUNT(tm.id) AS member_count
  FROM tenants t
  LEFT JOIN tenant_config      tc ON tc.tenant_id = t.id
  LEFT JOIN subscription_plans p  ON p.id = t.plan_id
  LEFT JOIN tenant_members     tm ON tm.tenant_id = t.id
  WHERE t.id     != '00000000-0000-0000-0000-000000000001'
    AND t.deleted_at IS NULL
  GROUP BY t.id, t.name, t.slug, t.subscription_status, t.subscription_interval,
           t.is_active, t.is_sandbox, t.is_approved, t.trial_ends_at, t.created_at,
           t.owner_user_id, tc.business_email, p.name
  ORDER BY t.is_approved ASC, t.created_at DESC;
END;
$$;


-- ── 4. sa_approve_and_seed_tenant — approve + populate demo data ──
-- Idempotent: skips seeding if stations already exist for the tenant.
CREATE OR REPLACE FUNCTION public.sa_approve_and_seed_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station1  UUID; v_station2  UUID; v_station3  UUID; v_station4  UUID;
  v_cat1      UUID; v_cat2      UUID;
  v_cust1     UUID; v_cust2     UUID; v_cust3     UUID;
  v_cust4     UUID; v_cust5     UUID;
  v_session_id UUID;
  v_i         INT;
  v_curr      TEXT;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  -- Mark approved
  UPDATE tenants SET is_approved = TRUE, updated_at = NOW() WHERE id = p_tenant_id;

  -- Audit log
  INSERT INTO super_admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'approve_and_seed', 'tenant', p_tenant_id, '{"seeded": true}');

  -- Idempotency guard — skip if already seeded
  IF EXISTS (SELECT 1 FROM stations WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- Resolve currency for expenses table (uses TEXT currency column)
  SELECT currency_code INTO v_curr FROM tenant_config WHERE tenant_id = p_tenant_id;
  v_curr := COALESCE(v_curr, 'INR');

  -- ── Product Categories ──────────────────────────────────
  INSERT INTO categories (tenant_id, name, sort_order)
  VALUES (p_tenant_id, 'Beverages', 1) RETURNING id INTO v_cat1;

  INSERT INTO categories (tenant_id, name, sort_order)
  VALUES (p_tenant_id, 'Snacks', 2) RETURNING id INTO v_cat2;

  -- ── Products ────────────────────────────────────────────
  INSERT INTO products (tenant_id, category_id, name, price, stock, is_active, sort_order) VALUES
    (p_tenant_id, v_cat1, 'Coca-Cola (330ml)',    60,  50, true, 1),
    (p_tenant_id, v_cat1, 'Water Bottle (500ml)', 30, 100, true, 2),
    (p_tenant_id, v_cat1, 'Red Bull (250ml)',     150,  30, true, 3),
    (p_tenant_id, v_cat2, 'Masala Chips',          30,  80, true, 1),
    (p_tenant_id, v_cat2, 'Chocolate Bar',         40,  60, true, 2);

  -- ── Stations ────────────────────────────────────────────
  INSERT INTO stations (tenant_id, name, type, rate_per_hour, is_active, display_order)
  VALUES (p_tenant_id, 'Table 1', 'snooker', 200, true, 1) RETURNING id INTO v_station1;

  INSERT INTO stations (tenant_id, name, type, rate_per_hour, is_active, display_order)
  VALUES (p_tenant_id, 'Table 2', 'snooker', 200, true, 2) RETURNING id INTO v_station2;

  INSERT INTO stations (tenant_id, name, type, rate_per_hour, is_active, display_order)
  VALUES (p_tenant_id, 'Table 3', 'pool', 150, true, 3) RETURNING id INTO v_station3;

  INSERT INTO stations (tenant_id, name, type, rate_per_hour, is_active, display_order)
  VALUES (p_tenant_id, 'Table 4', 'pool', 150, true, 4) RETURNING id INTO v_station4;

  -- ── Customers ───────────────────────────────────────────
  INSERT INTO customers (tenant_id, name, phone, email, loyalty_points, visit_count)
  VALUES (p_tenant_id, 'Arjun Mehta',   '+91 98765 43210', 'arjun@example.com',  450,  9) RETURNING id INTO v_cust1;

  INSERT INTO customers (tenant_id, name, phone, email, loyalty_points, visit_count)
  VALUES (p_tenant_id, 'Priya Sharma',  '+91 98765 11111', 'priya@example.com',  120,  3) RETURNING id INTO v_cust2;

  INSERT INTO customers (tenant_id, name, phone, email, loyalty_points, visit_count)
  VALUES (p_tenant_id, 'Rahul Singh',   '+91 87654 32109', 'rahul@example.com',  890, 18) RETURNING id INTO v_cust3;

  INSERT INTO customers (tenant_id, name, phone, loyalty_points, visit_count)
  VALUES (p_tenant_id, 'Neha Patel',    '+91 76543 21098',                        55,  1) RETURNING id INTO v_cust4;

  INSERT INTO customers (tenant_id, name, phone, loyalty_points, visit_count)
  VALUES (p_tenant_id, 'Vikram Joshi',  '+91 65432 10987',                       300,  6) RETURNING id INTO v_cust5;

  -- ── Sessions + Bills (10 entries spread over last 30 days) ──
  FOR v_i IN 1..10 LOOP
    INSERT INTO sessions (
      tenant_id, station_id, customer_id,
      started_at, ended_at, duration_mins, rate_per_hour, total_amount, status
    ) VALUES (
      p_tenant_id,
      CASE (v_i % 4) WHEN 0 THEN v_station1 WHEN 1 THEN v_station2 WHEN 2 THEN v_station3 ELSE v_station4 END,
      CASE (v_i % 5) WHEN 0 THEN v_cust1 WHEN 1 THEN v_cust2 WHEN 2 THEN v_cust3 WHEN 3 THEN v_cust4 ELSE v_cust5 END,
      NOW() - (v_i * INTERVAL '3 days') - INTERVAL '2 hours',
      NOW() - (v_i * INTERVAL '3 days'),
      120,
      CASE (v_i % 2) WHEN 0 THEN 200 ELSE 150 END,
      CASE (v_i % 2) WHEN 0 THEN 400 ELSE 300 END,
      'completed'
    ) RETURNING id INTO v_session_id;

    INSERT INTO bills (
      tenant_id, session_id, customer_id,
      subtotal, total_amount, payment_method, status, created_at
    ) VALUES (
      p_tenant_id,
      v_session_id,
      CASE (v_i % 5) WHEN 0 THEN v_cust1 WHEN 1 THEN v_cust2 WHEN 2 THEN v_cust3 WHEN 3 THEN v_cust4 ELSE v_cust5 END,
      CASE (v_i % 2) WHEN 0 THEN 400 ELSE 300 END,
      CASE (v_i % 2) WHEN 0 THEN 400 ELSE 300 END,
      CASE (v_i % 3) WHEN 0 THEN 'cash' WHEN 1 THEN 'card' ELSE 'online' END,
      'completed',
      NOW() - (v_i * INTERVAL '3 days')
    );
  END LOOP;

  -- ── Expenses ────────────────────────────────────────────
  INSERT INTO expenses (tenant_id, category, description, amount, currency, date, payment_mode) VALUES
    (p_tenant_id, 'rent',        'Monthly club rent',          25000, v_curr, CURRENT_DATE - 15, 'bank'),
    (p_tenant_id, 'utilities',   'Monthly electricity bill',    4500, v_curr, CURRENT_DATE - 10, 'online'),
    (p_tenant_id, 'maintenance', 'Table cloth replacement',     2000, v_curr, CURRENT_DATE -  5, 'cash'),
    (p_tenant_id, 'salary',      'Monthly staff salary',       18000, v_curr, CURRENT_DATE -  1, 'bank');

  -- ── Seed cash vault ─────────────────────────────────────
  UPDATE cash_vault SET balance = 15000 WHERE tenant_id = p_tenant_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.sa_approve_and_seed_tenant(UUID) TO authenticated;
