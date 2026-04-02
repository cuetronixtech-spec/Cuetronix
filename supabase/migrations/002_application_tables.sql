-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/002_application_tables.sql
-- All tenant application tables — every row has tenant_id
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- LOGIN LOGS
-- ─────────────────────────────────────────────────────────
CREATE TABLE login_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID,
  email           TEXT,
  role            TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  device_type     TEXT,               -- desktop | mobile | tablet
  browser         TEXT,
  os              TEXT,
  city            TEXT,
  region          TEXT,
  country         TEXT,
  latitude        NUMERIC,
  longitude       NUMERIC,
  selfie_url      TEXT,
  success         BOOLEAN DEFAULT TRUE,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE stations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'snooker', -- snooker | pool | gaming | darts | bowling | other
  rate_per_hour  NUMERIC(10,2) NOT NULL DEFAULT 0,
  description    TEXT,
  image_url      TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  is_occupied    BOOLEAN DEFAULT FALSE,
  display_order  INT DEFAULT 0,
  parent_id      UUID REFERENCES stations(id),   -- grouped/consolidated stations
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────
CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  date_of_birth       DATE,
  gender              TEXT,
  address             TEXT,
  membership_type     TEXT DEFAULT 'regular',   -- regular | premium | vip
  loyalty_points      INT DEFAULT 0,
  total_spend         NUMERIC(10,2) DEFAULT 0,
  visit_count         INT DEFAULT 0,
  last_visit_at       TIMESTAMPTZ,
  notes               TEXT,
  referral_code       TEXT UNIQUE,
  referred_by_id      UUID REFERENCES customers(id),
  tags                TEXT[] DEFAULT '{}',
  portal_user_id      UUID,                     -- auth.users.id for customer portal
  is_portal_active    BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────
-- CATEGORIES (for products)
-- ─────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  price               NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price          NUMERIC(10,2),
  stock               INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  sku                 TEXT,
  barcode             TEXT,
  image_url           TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  track_stock         BOOLEAN DEFAULT TRUE,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────
-- STOCK HISTORY
-- ─────────────────────────────────────────────────────────
CREATE TABLE stock_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta        INT NOT NULL,           -- positive=in, negative=out
  stock_after  INT NOT NULL,
  reason       TEXT NOT NULL,          -- sale | manual_add | manual_remove | void | adjustment
  reference_id UUID,                   -- bill_id if reason=sale
  note         TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- SESSIONS  (table/station time tracking)
-- ─────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  station_id       UUID NOT NULL REFERENCES stations(id),
  customer_id      UUID REFERENCES customers(id),
  staff_id         UUID,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  paused_at        TIMESTAMPTZ,
  resumed_at       TIMESTAMPTZ,
  total_pause_ms   BIGINT DEFAULT 0,
  duration_mins    INT,
  rate_per_hour    NUMERIC(10,2),
  total_amount     NUMERIC(10,2),
  notes            TEXT,
  status           TEXT DEFAULT 'active',   -- active | paused | completed | cancelled
  bill_id          UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- BILLS
-- ─────────────────────────────────────────────────────────
CREATE TABLE bills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bill_number           TEXT,           -- auto-generated: BILL-2026-00001
  customer_id           UUID REFERENCES customers(id),
  staff_id              UUID,
  session_id            UUID REFERENCES sessions(id),
  subtotal              NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(10,2) DEFAULT 0,
  discount_type         TEXT,           -- flat | percent | student | loyalty | offer
  discount_note         TEXT,
  tax_rate              NUMERIC(5,2) DEFAULT 0,
  tax_amount            NUMERIC(10,2) DEFAULT 0,
  tax_label             TEXT DEFAULT 'Tax',
  total_amount          NUMERIC(10,2) NOT NULL,
  payment_method        TEXT NOT NULL,  -- cash | card | online | credit | complimentary | split
  payment_breakdown     JSONB DEFAULT '{}',
  gateway_payment_id    TEXT,
  loyalty_points_used   INT DEFAULT 0,
  loyalty_points_earned INT DEFAULT 0,
  status                TEXT DEFAULT 'completed', -- completed | voided | complimentary
  comp_note             TEXT,
  void_note             TEXT,
  void_by               UUID,
  voided_at             TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(bill_number, '-', 3) AS INT)), 0) + 1
  INTO next_num
  FROM bills
  WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND bill_number IS NOT NULL
    AND bill_number ~ '^BILL-[0-9]{4}-[0-9]+$';

  NEW.bill_number := 'BILL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bills_auto_number
  BEFORE INSERT ON bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL)
  EXECUTE FUNCTION generate_bill_number();


-- ─────────────────────────────────────────────────────────
-- BILL ITEMS
-- ─────────────────────────────────────────────────────────
CREATE TABLE bill_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bill_id      UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  item_type    TEXT NOT NULL DEFAULT 'product', -- product | session | custom
  name         TEXT NOT NULL,
  qty          INT NOT NULL DEFAULT 1,
  unit_price   NUMERIC(10,2) NOT NULL,
  discount     NUMERIC(10,2) DEFAULT 0,
  total_price  NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- BILL EDIT AUDIT
-- ─────────────────────────────────────────────────────────
CREATE TABLE bill_edit_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bill_id     UUID NOT NULL REFERENCES bills(id),
  edited_by   UUID,
  changes     JSONB NOT NULL,   -- { field: { old_val, new_val } }
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- LOYALTY TRANSACTIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bill_id       UUID REFERENCES bills(id),
  type          TEXT NOT NULL,       -- earn | redeem | bonus | expire | adjust
  points        INT NOT NULL,
  balance_after INT NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  station_id          UUID NOT NULL REFERENCES stations(id),
  customer_id         UUID REFERENCES customers(id),
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  customer_email      TEXT,
  booking_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  duration_mins       INT,
  status              TEXT DEFAULT 'pending',   -- pending | confirmed | checked_in | completed | cancelled | no_show
  payment_mode        TEXT DEFAULT 'venue',     -- venue | online
  payment_status      TEXT DEFAULT 'unpaid',    -- unpaid | paid | refunded
  amount              NUMERIC(10,2) DEFAULT 0,
  gateway_order_id    TEXT,
  gateway_payment_id  TEXT,
  coupon_code         TEXT,
  discount_amount     NUMERIC(10,2) DEFAULT 0,
  access_code         TEXT,                     -- 6-char alphanumeric for check-in
  notes               TEXT,
  cancelled_reason    TEXT,
  cancelled_by        UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────
-- SLOT BLOCKS  (temporary holds during booking)
-- ─────────────────────────────────────────────────────────
CREATE TABLE slot_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  station_id    UUID NOT NULL REFERENCES stations(id),
  booking_date  DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  session_key   TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF PROFILES
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL UNIQUE,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  address           TEXT,
  date_of_birth     DATE,
  gender            TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  photo_url         TEXT,
  position          TEXT,
  department        TEXT,
  date_joined       DATE,
  base_salary       NUMERIC(10,2) DEFAULT 0,
  salary_currency   TEXT DEFAULT 'USD',
  bank_account_no   TEXT,
  bank_routing_no   TEXT,
  bank_name         TEXT,
  id_proof_type     TEXT,
  id_proof_url      TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────
-- STAFF ATTENDANCE
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  date            DATE NOT NULL,
  clock_in        TIMESTAMPTZ,
  clock_out       TIMESTAMPTZ,
  working_hours   NUMERIC(5,2),
  status          TEXT DEFAULT 'present', -- present | absent | late | half_day | holiday | on_leave
  notes           TEXT,
  is_regularized  BOOLEAN DEFAULT FALSE,
  regularized_by  UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, date)
);


-- ─────────────────────────────────────────────────────────
-- STAFF BREAKS
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_breaks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL,
  attendance_id  UUID REFERENCES staff_attendance(id),
  started_at     TIMESTAMPTZ NOT NULL,
  ended_at       TIMESTAMPTZ,
  duration_mins  INT,
  type           TEXT DEFAULT 'short',   -- short | meal | other
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF WORK SCHEDULES
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_work_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  day_of_week  INT NOT NULL,   -- 0=Sun … 6=Sat
  shift_start  TIME,
  shift_end    TIME,
  is_off       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, day_of_week)
);


-- ─────────────────────────────────────────────────────────
-- STAFF LEAVE REQUESTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_leave_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  leave_type   TEXT NOT NULL,   -- casual | sick | emergency | earned | unpaid
  from_date    DATE NOT NULL,
  to_date      DATE NOT NULL,
  days         NUMERIC(4,1),
  reason       TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',   -- pending | approved | rejected
  reviewed_by  UUID,
  review_note  TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF OVERTIME REQUESTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_overtime_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  date             DATE NOT NULL,
  hours            NUMERIC(4,2) NOT NULL,
  reason           TEXT,
  rate_multiplier  NUMERIC(4,2) DEFAULT 1.5,
  status           TEXT DEFAULT 'pending',
  reviewed_by      UUID,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF DOUBLE SHIFT REQUESTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_double_shift_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  date          DATE NOT NULL,
  shift_1_start TIME,
  shift_1_end   TIME,
  shift_2_start TIME,
  shift_2_end   TIME,
  reason        TEXT,
  status        TEXT DEFAULT 'pending',
  reviewed_by   UUID,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF ATTENDANCE REGULARIZATION
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_attendance_regularization (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL,
  date                 DATE NOT NULL,
  requested_clock_in   TIMESTAMPTZ,
  requested_clock_out  TIMESTAMPTZ,
  reason               TEXT NOT NULL,
  status               TEXT DEFAULT 'pending',
  reviewed_by          UUID,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF ALLOWANCES
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_allowances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  type        TEXT NOT NULL,   -- transport | meal | medical | performance | housing | other
  amount      NUMERIC(10,2) NOT NULL,
  month       INT,
  year        INT,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF DEDUCTIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_deductions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  type        TEXT NOT NULL,   -- advance | penalty | late | absence | tax | other
  amount      NUMERIC(10,2) NOT NULL,
  month       INT,
  year        INT,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- STAFF PAYROLL
-- ─────────────────────────────────────────────────────────
CREATE TABLE staff_payroll (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,
  month             INT NOT NULL,
  year              INT NOT NULL,
  base_salary       NUMERIC(10,2) DEFAULT 0,
  working_days      INT DEFAULT 0,
  present_days      INT DEFAULT 0,
  absent_days       INT DEFAULT 0,
  leave_days        NUMERIC(4,1) DEFAULT 0,
  overtime_hours    NUMERIC(5,2) DEFAULT 0,
  overtime_amount   NUMERIC(10,2) DEFAULT 0,
  allowances_total  NUMERIC(10,2) DEFAULT 0,
  deductions_total  NUMERIC(10,2) DEFAULT 0,
  gross_salary      NUMERIC(10,2) DEFAULT 0,
  net_salary        NUMERIC(10,2) DEFAULT 0,
  status            TEXT DEFAULT 'draft',   -- draft | finalized | paid
  paid_at           TIMESTAMPTZ,
  payment_mode      TEXT,
  payslip_url       TEXT,
  notes             TEXT,
  generated_by      UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, month, year)
);


-- ─────────────────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,  -- rent | utilities | salary | maintenance | marketing | supplies | other
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'USD',
  date            DATE NOT NULL,
  payment_mode    TEXT DEFAULT 'cash',  -- cash | bank | card | online
  vendor_name     TEXT,
  receipt_url     TEXT,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT,                 -- monthly | weekly | yearly | quarterly
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- CASH VAULT
-- ─────────────────────────────────────────────────────────
CREATE TABLE cash_vault (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance     NUMERIC(10,2) DEFAULT 0,
  currency    TEXT DEFAULT 'USD',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_vault_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,  -- deposit | withdrawal | bill_receipt | expense
  amount          NUMERIC(10,2) NOT NULL,
  balance_after   NUMERIC(10,2) NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,           -- bill | expense | deposit
  note            TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_bank_deposits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  bank_name      TEXT,
  account_last4  TEXT,
  deposit_date   DATE NOT NULL,
  reference_no   TEXT,
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- TOURNAMENTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE tournaments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  format                TEXT NOT NULL,    -- knockout | league | round_robin | double_elimination | custom
  game_type             TEXT DEFAULT 'snooker',
  start_date            DATE,
  end_date              DATE,
  registration_deadline DATE,
  max_participants      INT,
  entry_fee             NUMERIC(10,2) DEFAULT 0,
  entry_fee_currency    TEXT DEFAULT 'USD',
  prize_pool            NUMERIC(10,2) DEFAULT 0,
  first_prize           TEXT,
  second_prize          TEXT,
  third_prize           TEXT,
  additional_prizes     JSONB DEFAULT '[]',
  discount_coupons      JSONB DEFAULT '[]',
  banner_url            TEXT,
  gallery_urls          TEXT[] DEFAULT '{}',
  rules                 TEXT,
  venue_details         TEXT,
  status                TEXT DEFAULT 'upcoming',  -- upcoming | registration_open | ongoing | completed | cancelled
  is_public             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────
-- TOURNAMENT REGISTRATIONS  (admin-managed participants)
-- ─────────────────────────────────────────────────────────
CREATE TABLE tournament_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id),
  player_name     TEXT NOT NULL,
  player_phone    TEXT,
  player_email    TEXT,
  seeding         INT,
  status          TEXT DEFAULT 'registered',  -- registered | confirmed | eliminated | winner | withdrawn
  final_position  INT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- TOURNAMENT PUBLIC REGISTRATIONS  (self-registered, paid online)
-- ─────────────────────────────────────────────────────────
CREATE TABLE tournament_public_registrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tournament_id        UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name          TEXT NOT NULL,
  player_phone         TEXT NOT NULL,
  player_email         TEXT,
  country              TEXT,
  coupon_code          TEXT,
  original_fee         NUMERIC(10,2) DEFAULT 0,
  discount_amount      NUMERIC(10,2) DEFAULT 0,
  final_fee            NUMERIC(10,2) DEFAULT 0,
  payment_status       TEXT DEFAULT 'pending', -- pending | paid | failed | refunded
  payment_mode         TEXT DEFAULT 'online',  -- online | venue
  gateway_order_id     TEXT,
  gateway_payment_id   TEXT,
  registration_number  TEXT UNIQUE,
  status               TEXT DEFAULT 'pending', -- pending | confirmed | cancelled
  created_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- TOURNAMENT MATCHES
-- ─────────────────────────────────────────────────────────
CREATE TABLE tournament_matches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round          INT NOT NULL,
  match_number   INT,
  player1_id     UUID REFERENCES tournament_registrations(id),
  player2_id     UUID REFERENCES tournament_registrations(id),
  player1_score  INT,
  player2_score  INT,
  winner_id      UUID REFERENCES tournament_registrations(id),
  station_id     UUID REFERENCES stations(id),
  scheduled_at   TIMESTAMPTZ,
  played_at      TIMESTAMPTZ,
  status         TEXT DEFAULT 'scheduled',  -- scheduled | ongoing | completed | walkover | bye
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- TOURNAMENT WINNERS
-- ─────────────────────────────────────────────────────────
CREATE TABLE tournament_winners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  position       INT NOT NULL,
  player_name    TEXT NOT NULL,
  prize_won      TEXT,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- OFFERS  (general / public)
-- ─────────────────────────────────────────────────────────
CREATE TABLE offers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL,  -- discount | free_session | cashback | combo | freebie
  value        NUMERIC(10,2),
  valid_from   DATE,
  valid_until  DATE,
  min_spend    NUMERIC(10,2) DEFAULT 0,
  usage_limit  INT,
  usage_count  INT DEFAULT 0,
  image_url    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  terms        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- CUSTOMER OFFERS  (personalised)
-- ─────────────────────────────────────────────────────────
CREATE TABLE customer_offers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL,
  value        NUMERIC(10,2),
  valid_from   DATE,
  valid_until  DATE,
  image_url    TEXT,
  terms        TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_offer_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offer_id     UUID NOT NULL REFERENCES customer_offers(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  is_used      BOOLEAN DEFAULT FALSE,
  used_at      TIMESTAMPTZ,
  bill_id      UUID REFERENCES bills(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (offer_id, customer_id)
);


-- ─────────────────────────────────────────────────────────
-- REWARDS
-- ─────────────────────────────────────────────────────────
CREATE TABLE rewards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  points_required  INT NOT NULL,
  reward_type      TEXT NOT NULL,  -- discount | free_item | free_session | voucher
  reward_value     NUMERIC(10,2),
  product_id       UUID REFERENCES products(id),
  image_url        TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id),
  reward_id    UUID NOT NULL REFERENCES rewards(id),
  points_spent INT NOT NULL,
  bill_id      UUID REFERENCES bills(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- REFERRALS
-- ─────────────────────────────────────────────────────────
CREATE TABLE referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referrer_id   UUID NOT NULL REFERENCES customers(id),
  referred_id   UUID NOT NULL REFERENCES customers(id),
  bonus_points  INT DEFAULT 0,
  status        TEXT DEFAULT 'pending',  -- pending | qualified | rewarded
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- INVESTMENT PARTNERS
-- ─────────────────────────────────────────────────────────
CREATE TABLE investment_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  country         TEXT,
  equity_percent  NUMERIC(5,2) DEFAULT 0,
  total_invested  NUMERIC(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'USD',
  notes           TEXT,
  joined_date     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE investment_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES investment_partners(id),
  type        TEXT NOT NULL,  -- investment | return | withdrawal | dividend
  amount      NUMERIC(10,2) NOT NULL,
  currency    TEXT DEFAULT 'USD',
  date        DATE NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID,          -- NULL = all staff in tenant
  type        TEXT NOT NULL, -- booking | low_stock | payment | system | trial | staff_request | subscription
  title       TEXT NOT NULL,
  body        TEXT,
  metadata    JSONB DEFAULT '{}',
  action_url  TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- AI CHAT HISTORY
-- ─────────────────────────────────────────────────────────
CREATE TABLE ai_chat_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  session_id  UUID NOT NULL,
  role        TEXT NOT NULL,   -- user | assistant
  content     TEXT NOT NULL,
  tokens_used INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- DATABASE FUNCTIONS / RPCs
-- ─────────────────────────────────────────────────────────

-- Check station availability for a date/time range
CREATE OR REPLACE FUNCTION check_station_availability(
  p_tenant_id        UUID,
  p_station_id       UUID,
  p_date             DATE,
  p_start_time       TIME,
  p_end_time         TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE tenant_id    = p_tenant_id
      AND station_id   = p_station_id
      AND booking_date = p_date
      AND status NOT IN ('cancelled', 'no_show')
      AND (id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
      AND (start_time < p_end_time AND end_time > p_start_time)
  )
  AND NOT EXISTS (
    SELECT 1 FROM slot_blocks
    WHERE tenant_id    = p_tenant_id
      AND station_id   = p_station_id
      AND booking_date = p_date
      AND expires_at   > NOW()
      AND (start_time < p_end_time AND end_time > p_start_time)
  );
END;
$$ LANGUAGE plpgsql;


-- Get available time slots for a station on a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id   UUID,
  p_station_id  UUID,
  p_date        DATE,
  p_slot_mins   INT DEFAULT 60
)
RETURNS TABLE(slot_start TIME, slot_end TIME, is_available BOOLEAN) AS $$
DECLARE
  v_minutes INT := 0;
  v_start   TIME;
  v_end     TIME;
BEGIN
  WHILE v_minutes < 1440 LOOP   -- 1440 = 24 * 60
    v_start := (v_minutes || ' minutes')::INTERVAL + '00:00'::TIME;
    v_end   := v_start + (p_slot_mins || ' minutes')::INTERVAL;
    IF v_end <= '24:00:00'::TIME THEN
      RETURN QUERY SELECT
        v_start,
        v_end,
        check_station_availability(p_tenant_id, p_station_id, p_date, v_start, v_end);
    END IF;
    v_minutes := v_minutes + p_slot_mins;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- Auto-cleanup expired slot blocks
CREATE OR REPLACE FUNCTION cleanup_expired_slot_blocks()
RETURNS void AS $$
BEGIN
  DELETE FROM slot_blocks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;


-- Generate monthly payroll for all staff of a tenant
CREATE OR REPLACE FUNCTION generate_monthly_payroll(
  p_tenant_id UUID,
  p_month     INT,
  p_year      INT
)
RETURNS SETOF staff_payroll AS $$
DECLARE
  v_member       RECORD;
  v_profile      RECORD;
  v_attendance   RECORD;
  v_working_days INT;
  v_allowances   NUMERIC;
  v_deductions   NUMERIC;
  v_ot_hours     NUMERIC;
  v_ot_amount    NUMERIC;
  v_gross        NUMERIC;
  v_net          NUMERIC;
BEGIN
  SELECT COUNT(*)
  INTO v_working_days
  FROM generate_series(
    MAKE_DATE(p_year, p_month, 1),
    (MAKE_DATE(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE,
    '1 day'::INTERVAL
  ) d
  WHERE EXTRACT(DOW FROM d) NOT IN (0);  -- exclude Sundays

  FOR v_member IN
    SELECT tm.user_id FROM tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.is_active = TRUE
  LOOP
    SELECT * INTO v_profile FROM staff_profiles
    WHERE tenant_id = p_tenant_id AND user_id = v_member.user_id;

    IF v_profile IS NULL THEN CONTINUE; END IF;

    SELECT
      COUNT(*) FILTER (WHERE status IN ('present', 'late')) AS present_days,
      COUNT(*) FILTER (WHERE status = 'absent')             AS absent_days
    INTO v_attendance
    FROM staff_attendance
    WHERE tenant_id = p_tenant_id
      AND user_id   = v_member.user_id
      AND EXTRACT(MONTH FROM date) = p_month
      AND EXTRACT(YEAR  FROM date) = p_year;

    SELECT COALESCE(SUM(amount), 0) INTO v_allowances
    FROM staff_allowances
    WHERE tenant_id = p_tenant_id AND user_id = v_member.user_id
      AND month = p_month AND year = p_year;

    SELECT COALESCE(SUM(amount), 0) INTO v_deductions
    FROM staff_deductions
    WHERE tenant_id = p_tenant_id AND user_id = v_member.user_id
      AND month = p_month AND year = p_year;

    SELECT COALESCE(SUM(hours), 0) INTO v_ot_hours
    FROM staff_overtime_requests
    WHERE tenant_id = p_tenant_id AND user_id = v_member.user_id
      AND EXTRACT(MONTH FROM date) = p_month
      AND EXTRACT(YEAR  FROM date) = p_year
      AND status = 'approved';

    v_ot_amount := (v_profile.base_salary / GREATEST(v_working_days, 1) / 8) * v_ot_hours * 1.5;
    v_gross     := v_profile.base_salary + v_allowances + v_ot_amount;
    v_net       := v_gross - v_deductions;

    INSERT INTO staff_payroll (
      tenant_id, user_id, month, year, base_salary, working_days,
      present_days, absent_days, overtime_hours, overtime_amount,
      allowances_total, deductions_total, gross_salary, net_salary, status
    ) VALUES (
      p_tenant_id, v_member.user_id, p_month, p_year, v_profile.base_salary, v_working_days,
      COALESCE(v_attendance.present_days, 0), COALESCE(v_attendance.absent_days, 0),
      v_ot_hours, v_ot_amount, v_allowances, v_deductions, v_gross, v_net, 'draft'
    )
    ON CONFLICT (tenant_id, user_id, month, year) DO UPDATE
      SET base_salary      = EXCLUDED.base_salary,
          working_days     = EXCLUDED.working_days,
          present_days     = EXCLUDED.present_days,
          absent_days      = EXCLUDED.absent_days,
          overtime_hours   = EXCLUDED.overtime_hours,
          overtime_amount  = EXCLUDED.overtime_amount,
          allowances_total = EXCLUDED.allowances_total,
          deductions_total = EXCLUDED.deductions_total,
          gross_salary     = EXCLUDED.gross_salary,
          net_salary       = EXCLUDED.net_salary;

    RETURN QUERY SELECT * FROM staff_payroll
    WHERE tenant_id = p_tenant_id AND user_id = v_member.user_id
      AND month = p_month AND year = p_year;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
