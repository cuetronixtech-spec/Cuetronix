-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/005_sandbox.sql
-- Sandbox tenant seed data and demo user accounts
-- Run this AFTER the platform is deployed and Supabase Auth
-- users have been created for the demo accounts.
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- Seed the sandbox tenant (fixed UUID — never changes)
-- ─────────────────────────────────────────────────────────
INSERT INTO tenants (
  id,
  slug,
  name,
  subscription_status,
  is_active,
  is_sandbox
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo',
  'The Demo Club',
  'active',
  TRUE,
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Seed starter plan for sandbox (use the pro plan for full feature access in demo)
UPDATE tenants
SET plan_id = (SELECT id FROM subscription_plans WHERE slug = 'pro' LIMIT 1)
WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO tenant_config (
  tenant_id,
  brand_name,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_color,
  currency_code,
  currency_symbol,
  timezone,
  feature_ai_assistant,
  feature_investors,
  feature_bookings,
  feature_tournaments,
  feature_staff_hr,
  feature_cash_management,
  feature_expenses
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'The Demo Club',
  '#7c3aed',
  '#f97316',
  '#a78bfa',
  '#0f0f1a',
  '#1a1a2e',
  'USD',
  '$',
  'America/New_York',
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
) ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO onboarding_progress (
  tenant_id,
  step_club_info,
  step_stations,
  step_pos,
  step_staff,
  step_payment,
  wizard_dismissed,
  completed_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW()
) ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO cash_vault (tenant_id, balance, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 340.50, 'USD')
ON CONFLICT (tenant_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────
-- IMPORTANT: After running this migration, create the demo
-- users in Supabase Auth using the Admin API or Dashboard:
--
--   demo_admin@cuetronix.com   → user_id: 00000000-0000-0000-0000-000000000002
--   demo_manager@cuetronix.com → user_id: 00000000-0000-0000-0000-000000000003
--   demo_staff@cuetronix.com   → user_id: 00000000-0000-0000-0000-000000000004
--
-- Then insert the tenant_members rows below:
-- ─────────────────────────────────────────────────────────

-- Sandbox tenant member rows (insert after creating auth users)
-- INSERT INTO tenant_members (tenant_id, user_id, role, is_active, joined_at) VALUES
--   ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin',   TRUE, NOW()),
--   ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'manager', TRUE, NOW()),
--   ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'staff',   TRUE, NOW());


-- ─────────────────────────────────────────────────────────
-- Protect the 'demo' slug from being taken by real signups
-- This is enforced in the check-slug API, but also add a
-- DB constraint comment for documentation:
-- The API layer checks: if (slug === 'demo') return { available: false }
-- ─────────────────────────────────────────────────────────
COMMENT ON COLUMN tenants.is_sandbox IS
  'TRUE for the permanent demo tenant at demo.app.cuetronix.com. Never delete this tenant.';

COMMENT ON COLUMN tenants.slug IS
  'The subdomain slug. "demo" is reserved for the sandbox and cannot be claimed by real tenants.';
