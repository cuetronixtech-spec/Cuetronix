import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Handles the redirect after Google OAuth (or any Supabase OAuth provider).
 *
 * Supabase automatically exchanges the ?code= query parameter for a session
 * when `detectSessionInUrl: true` is set on the client (it is, in client.ts).
 * We just need to wait for that to complete then route the user appropriately:
 *
 *   - Has tenant_id in JWT  →  /dashboard
 *   - No tenant_id yet      →  /signup  (new Google user, needs to create their club)
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Give Supabase a moment to finish exchanging the code for a session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/signin", { replace: true });
        return;
      }

      const tenantId = session.user.app_metadata?.tenant_id;

      if (tenantId) {
        navigate("/dashboard", { replace: true });
      } else {
        // New Google sign-in — the user has no tenant yet
        navigate("/signup", { replace: true });
      }
    };

    // Small delay lets Supabase finish URL-hash/code-exchange processing
    const timer = setTimeout(checkSession, 300);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
