-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/010_fix_auth_null_fields.sql
-- Fixes: Supabase Auth 500 "converting NULL to string is
-- unsupported" on signInWithPassword.
--
-- Cause: auth.users rows created by earlier Supabase versions
-- can have NULL in token/change columns that newer GoTrue
-- expects to be empty strings. This causes SQL scan errors
-- before credentials are even checked.
-- ═══════════════════════════════════════════════════════════

UPDATE auth.users
SET
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  confirmation_token         = COALESCE(confirmation_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE
  email_change               IS NULL
  OR email_change_token_new     IS NULL
  OR email_change_token_current IS NULL
  OR phone_change               IS NULL
  OR recovery_token             IS NULL
  OR confirmation_token         IS NULL
  OR reauthentication_token     IS NULL;
