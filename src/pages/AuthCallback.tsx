import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PENDING_TENANT_KEY } from "./SignUp";

/**
 * Landing page for:
 *  1. Google OAuth redirect (code exchange)
 *  2. Email confirmation redirect (after clicking the link in the signup email)
 *
 * In both cases Supabase has already exchanged the URL fragment / code for a
 * session (detectSessionInUrl: true on the client).  We then:
 *   a) If sessionStorage has pending tenant data → create the tenant and go to /onboarding
 *   b) If the user already has a tenant_id in their JWT → go to /dashboard
 *   c) Otherwise → back to /signup (new Google user who skipped tenant creation)
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const passwordRecoveryRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        passwordRecoveryRef.current = true;
        navigate("/reset-password", { replace: true });
      }
    });

    const handleCallback = async () => {
      // Supabase needs a moment to finish exchanging the code/hash for a session
      await new Promise((r) => setTimeout(r, 400));

      if (passwordRecoveryRef.current) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/signin", { replace: true });
        return;
      }

      // Check for pending tenant data left by SignUp.tsx before email was sent
      const raw = sessionStorage.getItem(PENDING_TENANT_KEY);
      if (raw) {
        try {
          const pending = JSON.parse(raw) as {
            slug: string;
            clubName: string;
            country: string;
            email: string;
            yourName: string;
          };

          const { error } = await supabase.rpc("create_tenant", {
            p_slug: pending.slug,
            p_name: pending.clubName,
            p_country: pending.country,
            p_owner_email: pending.email,
          });

          if (error) {
            // Slug might already exist if user confirmed twice — check
            if (error.message?.includes("duplicate") || error.message?.includes("already")) {
              toast.info("Your club was already created. Taking you to the dashboard.");
            } else {
              toast.error("Could not create your club: " + error.message);
              navigate("/signup", { replace: true });
              return;
            }
          } else {
            toast.success(`Welcome to Cuetronix, ${pending.yourName}!`);
          }

          sessionStorage.removeItem(PENDING_TENANT_KEY);
          // Refresh session so the JWT now carries the new tenant_id claim
          await supabase.auth.refreshSession();
          navigate("/pending-approval", { replace: true });
          return;
        } catch {
          sessionStorage.removeItem(PENDING_TENANT_KEY);
        }
      }

      // No pending tenant — route based on whether the user already has one
      const tenantId = session.user.app_metadata?.tenant_id;
      if (tenantId) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/signup", { replace: true });
      }
    };

    handleCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Setting up your account…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
