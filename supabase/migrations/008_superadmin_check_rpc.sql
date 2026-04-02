-- ═══════════════════════════════════════════════════════════
-- FILE: supabase/migrations/008_superadmin_check_rpc.sql
-- Adds a SECURITY DEFINER RPC so the login page can verify
-- super admin status without requiring a client-side SELECT
-- on the superadmins table (which has no RLS SELECT policy).
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM superadmins
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
