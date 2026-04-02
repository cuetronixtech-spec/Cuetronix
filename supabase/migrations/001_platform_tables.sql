-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/001_platform_tables.sql
-- Platform-level tables: no tenant_id, owned by Cuetronix
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- SUBSCRIPTION PLANS
-- ─────────────────────────────────────────────────────────
CREATE TABLE subscription_plans (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT    NOT NULL,
  slug                     TEXT    UNIQUE NOT NULL,
  razorpay_plan_id         TEXT,
  stripe_price_id_monthly  TEXT,
  stripe_price_id_annual   TEXT,
  price_monthly            NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_annual             NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency                 TEXT    NOT NULL DEFAULT 'USD',
  max_stations             INT,              -- NULL = unlimited
  max_staff                INT,              -- NULL = unlimited
  max_customers            INT,              -- NULL = unlimited
  features                 JSONB   NOT NULL DEFAULT '{
    "ai_assistant": false,
    "custom_domain": false,
    "investors":     false,
    "white_label":   false,
    "api_access":    false,
    "priority_support": false
  }',
  is_active                BOOLEAN DEFAULT TRUE,
  display_order            INT     DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO subscription_plans
  (name, slug, price_monthly, price_annual, max_stations, max_staff, features, display_order)
VALUES
  ('Starter',    'starter',    29,   290,  4,    3,    '{"ai_assistant":false,"custom_domain":false,"investors":false,"white_label":false,"api_access":false,"priority_support":false}', 1),
  ('Growth',     'growth',     59,   590,  10,   8,    '{"ai_assistant":false,"custom_domain":false,"investors":false,"white_label":false,"api_access":false,"priority_support":false}', 2),
  ('Pro',        'pro',        99,   990,  20,   20,   '{"ai_assistant":true,"custom_domain":true,"investors":true,"white_label":false,"api_access":false,"priority_support":false}',    3),
  ('Business',   'business',   199,  1990, NULL, NULL, '{"ai_assistant":true,"custom_domain":true,"investors":true,"white_label":true,"api_access":false,"priority_support":false}',     4),
  ('Enterprise', 'enterprise', 0,    0,    NULL, NULL, '{"ai_assistant":true,"custom_domain":true,"investors":true,"white_label":true,"api_access":true,"priority_support":true}',       5);


-- ─────────────────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                      TEXT    UNIQUE NOT NULL,
  name                      TEXT    NOT NULL,
  owner_user_id             UUID,                         -- references auth.users(id)
  plan_id                   UUID    REFERENCES subscription_plans(id),
  subscription_status       TEXT    DEFAULT 'trialing',   -- trialing | active | past_due | canceled | paused
  subscription_interval     TEXT    DEFAULT 'monthly',    -- monthly | annual
  stripe_customer_id        TEXT    UNIQUE,
  stripe_subscription_id    TEXT    UNIQUE,
  razorpay_subscription_id  TEXT    UNIQUE,
  trial_ends_at             TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN DEFAULT FALSE,
  is_active                 BOOLEAN DEFAULT TRUE,
  is_sandbox                BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- TENANT MEMBERS  (user <-> tenant relationship + role)
-- ─────────────────────────────────────────────────────────
CREATE TABLE tenant_members (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL,               -- references auth.users(id)
  role        TEXT    NOT NULL DEFAULT 'staff', -- admin | manager | staff
  is_active   BOOLEAN DEFAULT TRUE,
  invited_by  UUID,
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  joined_at   TIMESTAMPTZ,
  UNIQUE (tenant_id, user_id)
);


-- ─────────────────────────────────────────────────────────
-- TENANT CONFIG
-- Single source of truth for all tenant settings
-- ─────────────────────────────────────────────────────────
CREATE TABLE tenant_config (
  tenant_id                   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,

  -- Branding
  brand_name                  TEXT,
  brand_logo_url              TEXT,
  brand_favicon_url           TEXT,
  primary_color               TEXT DEFAULT '#7c3aed',
  secondary_color             TEXT DEFAULT '#f97316',
  accent_color                TEXT DEFAULT '#a78bfa',
  background_color            TEXT DEFAULT '#0f0f1a',
  surface_color               TEXT DEFAULT '#1a1a2e',
  font_heading                TEXT DEFAULT 'Poppins',
  font_body                   TEXT DEFAULT 'Quicksand',
  dark_mode_default           BOOLEAN DEFAULT TRUE,
  powered_by_visible          BOOLEAN DEFAULT TRUE,

  -- Business Info
  business_address            TEXT,
  business_city               TEXT,
  business_state              TEXT,
  business_country            TEXT DEFAULT 'US',
  business_postal_code        TEXT,
  business_phone              TEXT,
  business_email              TEXT,
  business_tax_id             TEXT,
  business_website            TEXT,
  currency_code               TEXT DEFAULT 'USD',
  currency_symbol             TEXT DEFAULT '$',
  timezone                    TEXT DEFAULT 'America/New_York',
  date_format                 TEXT DEFAULT 'MM/DD/YYYY',
  time_format                 TEXT DEFAULT '12h',

  -- Payment Gateway (tenant's own — for their customers)
  gateway_provider            TEXT DEFAULT 'stripe',   -- stripe | razorpay | square
  stripe_publishable_key      TEXT,
  stripe_secret_key           TEXT,                    -- AES-256-GCM encrypted
  stripe_webhook_secret       TEXT,                    -- AES-256-GCM encrypted
  razorpay_key_id_test        TEXT,
  razorpay_key_secret_test    TEXT,                    -- AES-256-GCM encrypted
  razorpay_key_id_live        TEXT,
  razorpay_key_secret_live    TEXT,                    -- AES-256-GCM encrypted
  razorpay_mode               TEXT DEFAULT 'test',
  square_access_token         TEXT,                    -- AES-256-GCM encrypted
  square_location_id          TEXT,
  square_environment          TEXT DEFAULT 'sandbox',  -- sandbox | production

  -- Receipt Settings
  receipt_template            TEXT DEFAULT 'default',  -- default | minimal | detailed
  receipt_show_logo           BOOLEAN DEFAULT TRUE,
  receipt_header_text         TEXT,
  receipt_footer_text         TEXT DEFAULT 'Thank you for visiting!',
  receipt_show_tax_id         BOOLEAN DEFAULT FALSE,
  receipt_tax_label           TEXT DEFAULT 'Tax',

  -- POS & Session Settings
  session_inactivity_timeout  INT DEFAULT 300,
  student_discount_percent    NUMERIC(5,2) DEFAULT 0,
  loyalty_enabled             BOOLEAN DEFAULT TRUE,
  loyalty_points_per_unit     NUMERIC(5,2) DEFAULT 1,
  loyalty_redeem_threshold    INT DEFAULT 100,
  loyalty_unit_per_point      NUMERIC(5,2) DEFAULT 0.10,
  default_session_rate        NUMERIC(10,2) DEFAULT 0,
  enable_split_payment        BOOLEAN DEFAULT TRUE,
  enable_complimentary        BOOLEAN DEFAULT TRUE,
  enable_credit_payment       BOOLEAN DEFAULT TRUE,

  -- Booking Settings
  booking_slot_duration_mins  INT DEFAULT 60,
  booking_advance_days        INT DEFAULT 7,
  booking_min_notice_hours    INT DEFAULT 1,
  booking_cancellation_hours  INT DEFAULT 2,
  booking_event_name          TEXT DEFAULT 'Book a Station',
  booking_coupons             JSONB DEFAULT '[]',
  booking_confirmation_msg    TEXT,

  -- Feature Flags
  feature_tournaments         BOOLEAN DEFAULT TRUE,
  feature_bookings            BOOLEAN DEFAULT TRUE,
  feature_customer_portal     BOOLEAN DEFAULT TRUE,
  feature_ai_assistant        BOOLEAN DEFAULT FALSE,
  feature_staff_hr            BOOLEAN DEFAULT TRUE,
  feature_cash_management     BOOLEAN DEFAULT TRUE,
  feature_expenses            BOOLEAN DEFAULT TRUE,
  feature_investors           BOOLEAN DEFAULT FALSE,
  feature_how_to_use          BOOLEAN DEFAULT TRUE,

  -- Payment Method Configuration
  payment_methods             JSONB DEFAULT '{
    "cash":          {"label": "Cash",          "enabled": true},
    "card":          {"label": "Card",          "enabled": true},
    "online":        {"label": "Online",        "enabled": false},
    "credit":        {"label": "Credit",        "enabled": true},
    "complimentary": {"label": "Complimentary", "enabled": true}
  }',

  -- Custom Domain
  custom_domain               TEXT UNIQUE,
  custom_domain_verified      BOOLEAN DEFAULT FALSE,
  custom_domain_cname_target  TEXT DEFAULT 'cname.vercel-dns.com',

  -- Notification Settings
  notify_new_booking          BOOLEAN DEFAULT TRUE,
  notify_low_stock            BOOLEAN DEFAULT TRUE,
  low_stock_threshold         INT DEFAULT 5,
  notify_trial_expiry         BOOLEAN DEFAULT TRUE,
  notify_staff_requests       BOOLEAN DEFAULT TRUE,

  -- Customer Portal
  customer_portal_welcome_text TEXT,
  customer_portal_show_loyalty BOOLEAN DEFAULT TRUE,
  customer_portal_show_booking BOOLEAN DEFAULT TRUE,
  customer_portal_show_offers  BOOLEAN DEFAULT TRUE,

  -- Extended / Overflow
  extended_config             JSONB DEFAULT '{}',

  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- ONBOARDING PROGRESS
-- ─────────────────────────────────────────────────────────
CREATE TABLE onboarding_progress (
  tenant_id         UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  step_club_info    BOOLEAN DEFAULT FALSE,
  step_stations     BOOLEAN DEFAULT FALSE,
  step_pos          BOOLEAN DEFAULT FALSE,
  step_staff        BOOLEAN DEFAULT FALSE,
  step_payment      BOOLEAN DEFAULT FALSE,
  wizard_dismissed  BOOLEAN DEFAULT FALSE,
  completed_at      TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────
-- SAAS INVOICES  (platform billing — tenants pay Cuetronix)
-- ─────────────────────────────────────────────────────────
CREATE TABLE saas_invoices (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID    NOT NULL REFERENCES tenants(id),
  stripe_invoice_id    TEXT,
  razorpay_payment_id  TEXT,
  amount               NUMERIC(10,2) NOT NULL,
  currency             TEXT    DEFAULT 'USD',
  status               TEXT    DEFAULT 'pending',  -- pending | paid | failed | voided
  plan_id              UUID    REFERENCES subscription_plans(id),
  interval             TEXT,
  period_start         TIMESTAMPTZ,
  period_end           TIMESTAMPTZ,
  invoice_number       TEXT    UNIQUE,
  pdf_url              TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- SUPER ADMIN AUDIT LOG
-- ─────────────────────────────────────────────────────────
CREATE TABLE super_admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID NOT NULL,
  action          TEXT NOT NULL,
  target_type     TEXT,               -- tenant | user | plan
  target_id       UUID,
  metadata        JSONB DEFAULT '{}',
  ip_address      TEXT,
  is_impersonation BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- SUPER ADMINS
-- ─────────────────────────────────────────────────────────
CREATE TABLE superadmins (
  id          UUID PRIMARY KEY,      -- references auth.users(id)
  email       TEXT NOT NULL,
  full_name   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- SANDBOX SESSIONS  (analytics for demo conversion tracking)
-- ─────────────────────────────────────────────────────────
CREATE TABLE sandbox_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address           TEXT,
  country              TEXT,
  user_agent           TEXT,
  started_at           TIMESTAMPTZ DEFAULT NOW(),
  ended_at             TIMESTAMPTZ,
  duration_secs        INT,
  pages_visited        TEXT[] DEFAULT '{}',
  converted            BOOLEAN DEFAULT FALSE,
  converted_at         TIMESTAMPTZ,
  converted_tenant_id  UUID REFERENCES tenants(id)
);


-- ─────────────────────────────────────────────────────────
-- updated_at triggers for platform tables
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tenant_config_updated_at
  BEFORE UPDATE ON tenant_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
