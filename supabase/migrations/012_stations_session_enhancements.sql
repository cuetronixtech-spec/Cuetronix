-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/012_stations_session_enhancements.sql
-- Adds coupon_code to sessions and event_enabled to stations
-- ═══════════════════════════════════════════════════════════

-- Allow sessions to store the coupon code used at session start
-- The discounted rate is already stored in rate_per_hour;
-- coupon_code is kept for display and audit purposes only.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Controls whether a station is listed on the public booking page.
-- Defaults to TRUE so existing stations remain publicly bookable.
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS event_enabled BOOLEAN DEFAULT TRUE;
