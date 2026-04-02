-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/006_currency_settings.sql
-- Per-tenant currency selection — default INR
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- SUPPORTED CURRENCIES  (public lookup table)
-- ─────────────────────────────────────────────────────────
CREATE TABLE supported_currencies (
  code           TEXT    PRIMARY KEY,  -- ISO 4217 code, e.g. 'INR'
  symbol         TEXT    NOT NULL,     -- e.g. '₹'
  name           TEXT    NOT NULL,     -- e.g. 'Indian Rupee'
  decimal_places INT     DEFAULT 2,
  is_active      BOOLEAN DEFAULT TRUE
);

INSERT INTO supported_currencies (code, symbol, name, decimal_places) VALUES
  ('INR', '₹',    'Indian Rupee',          2),
  ('USD', '$',    'US Dollar',             2),
  ('EUR', '€',    'Euro',                  2),
  ('GBP', '£',    'British Pound',         2),
  ('AED', 'د.إ',  'UAE Dirham',            2),
  ('SGD', 'S$',   'Singapore Dollar',      2),
  ('AUD', 'A$',   'Australian Dollar',     2),
  ('CAD', 'CA$',  'Canadian Dollar',       2),
  ('JPY', '¥',    'Japanese Yen',          0),
  ('CNY', '¥',    'Chinese Yuan',          2),
  ('MYR', 'RM',   'Malaysian Ringgit',     2),
  ('SAR', '﷼',    'Saudi Riyal',           2),
  ('ZAR', 'R',    'South African Rand',    2),
  ('NGN', '₦',    'Nigerian Naira',        2),
  ('PKR', '₨',    'Pakistani Rupee',       2),
  ('BDT', '৳',    'Bangladeshi Taka',      2),
  ('LKR', '₨',    'Sri Lankan Rupee',      2),
  ('NPR', '₨',    'Nepalese Rupee',        2),
  ('THB', '฿',    'Thai Baht',             2),
  ('IDR', 'Rp',   'Indonesian Rupiah',     0),
  ('PHP', '₱',    'Philippine Peso',       2),
  ('KWD', 'KD',   'Kuwaiti Dinar',         3),
  ('QAR', 'QR',   'Qatari Riyal',          2),
  ('BHD', 'BD',   'Bahraini Dinar',        3),
  ('OMR', 'OMR',  'Omani Rial',            3),
  ('NZD', 'NZ$',  'New Zealand Dollar',    2),
  ('HKD', 'HK$',  'Hong Kong Dollar',      2),
  ('CHF', 'Fr',   'Swiss Franc',           2),
  ('SEK', 'kr',   'Swedish Krona',         2),
  ('NOK', 'kr',   'Norwegian Krone',       2),
  ('DKK', 'kr',   'Danish Krone',          2),
  ('KES', 'KSh',  'Kenyan Shilling',       2),
  ('GHS', 'GH₵',  'Ghanaian Cedi',         2),
  ('EGP', 'E£',   'Egyptian Pound',        2),
  ('MXN', 'MX$',  'Mexican Peso',          2),
  ('BRL', 'R$',   'Brazilian Real',        2),
  ('ARS', '$',    'Argentine Peso',        2),
  ('CLP', '$',    'Chilean Peso',          0),
  ('COP', '$',    'Colombian Peso',        0),
  ('PEN', 'S/',   'Peruvian Sol',          2),
  ('VND', '₫',    'Vietnamese Dong',       0),
  ('KRW', '₩',    'South Korean Won',      0),
  ('TWD', 'NT$',  'Taiwan Dollar',         2),
  ('RUB', '₽',    'Russian Ruble',         2),
  ('TRY', '₺',    'Turkish Lira',          2),
  ('PLN', 'zł',   'Polish Zloty',          2),
  ('HUF', 'Ft',   'Hungarian Forint',      2),
  ('CZK', 'Kč',   'Czech Koruna',          2),
  ('ILS', '₪',    'Israeli Shekel',        2),
  ('UAH', '₴',    'Ukrainian Hryvnia',     2);


-- ─────────────────────────────────────────────────────────
-- RLS for supported_currencies — public read, no write
-- ─────────────────────────────────────────────────────────
ALTER TABLE supported_currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supported_currencies_public_read"
  ON supported_currencies FOR SELECT
  USING (TRUE);


-- ─────────────────────────────────────────────────────────
-- Soft-link tenant_config → supported_currencies
-- (advisory FK — no hard constraint so tenants can still
--  enter a custom currency code if needed)
-- ─────────────────────────────────────────────────────────
COMMENT ON COLUMN tenant_config.currency_code IS
  'ISO 4217 currency code for the entire tenant app (see supported_currencies). Default: INR.';

COMMENT ON COLUMN tenant_config.currency_symbol IS
  'Display symbol for the tenant currency, e.g. ₹. Auto-populated from supported_currencies on the client.';


-- ─────────────────────────────────────────────────────────
-- Change tenant_config defaults → INR / India / IST
-- ─────────────────────────────────────────────────────────
ALTER TABLE tenant_config
  ALTER COLUMN currency_code    SET DEFAULT 'INR',
  ALTER COLUMN currency_symbol  SET DEFAULT '₹',
  ALTER COLUMN business_country SET DEFAULT 'IN',
  ALTER COLUMN timezone         SET DEFAULT 'Asia/Kolkata',
  ALTER COLUMN date_format      SET DEFAULT 'DD/MM/YYYY';


-- ─────────────────────────────────────────────────────────
-- Change per-record currency defaults in application tables
-- ─────────────────────────────────────────────────────────
ALTER TABLE staff_profiles
  ALTER COLUMN salary_currency      SET DEFAULT 'INR';

ALTER TABLE expenses
  ALTER COLUMN currency             SET DEFAULT 'INR';

ALTER TABLE cash_vault
  ALTER COLUMN currency             SET DEFAULT 'INR';

ALTER TABLE tournaments
  ALTER COLUMN entry_fee_currency   SET DEFAULT 'INR';

ALTER TABLE investment_partners
  ALTER COLUMN currency             SET DEFAULT 'INR';

ALTER TABLE investment_transactions
  ALTER COLUMN currency             SET DEFAULT 'INR';


-- ─────────────────────────────────────────────────────────
-- Update sandbox / demo tenant to INR locale
-- ─────────────────────────────────────────────────────────
UPDATE tenant_config
SET
  currency_code    = 'INR',
  currency_symbol  = '₹',
  business_country = 'IN',
  timezone         = 'Asia/Kolkata',
  date_format      = 'DD/MM/YYYY'
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE cash_vault
SET currency = 'INR'
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';


-- ─────────────────────────────────────────────────────────
-- Helper RPC — returns the currency for the calling tenant
-- Useful for client-side queries
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_tenant_currency(p_tenant_id UUID)
RETURNS TABLE(code TEXT, symbol TEXT, name TEXT, decimal_places INT) AS $$
BEGIN
  RETURN QUERY
    SELECT
      tc.currency_code,
      tc.currency_symbol,
      COALESCE(sc.name, tc.currency_code),
      COALESCE(sc.decimal_places, 2)
    FROM tenant_config tc
    LEFT JOIN supported_currencies sc ON sc.code = tc.currency_code
    WHERE tc.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
