import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

// ─── Shared loading spinner ───────────────────────────────────────────────────

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  </div>
);

// ─── RequireAuth ──────────────────────────────────────────────────────────────

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

// ─── RequireActiveSubscription ────────────────────────────────────────────────
// Allows trialing (within trial period), active, past_due.
// Redirects to /subscription when:
//   - subscription_status === "canceled"
//   - subscription_status === "trialing" AND trial_ends_at is in the past

export const RequireActiveSubscription = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { appMeta, loading: authLoading } = useAuth();
  const { config, loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) return <Spinner />;

  const status = appMeta.subscription_status ?? config?.subscription_status;

  if (status === "canceled") {
    return <Navigate to="/subscription" replace />;
  }

  if (status === "trialing" && config?.trial_ends_at) {
    const trialEnded = new Date(config.trial_ends_at) < new Date();
    if (trialEnded) return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

// ─── RequireSuperAdmin ────────────────────────────────────────────────────────

export const RequireSuperAdmin = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/super-admin/login" replace />;
  // SA_FLAG is set by SuperAdminLogin after verifying the superadmins table
  if (sessionStorage.getItem("_cuetronix_sa") !== "1") return <Navigate to="/super-admin/login" replace />;
  return <>{children}</>;
};

// ─── RequireCustomer ─────────────────────────────────────────────────────────

export const RequireCustomer = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/customer/login" replace />;
  return <>{children}</>;
};

// ─── RequireRole ─────────────────────────────────────────────────────────────
// Redirects back to /dashboard if the user's role is not in the allowed list.

export const RequireRole = ({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: string[];
}) => {
  const { appMeta, loading } = useAuth();
  if (loading) return <Spinner />;
  if (roles && appMeta.role && !roles.includes(appMeta.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// ─── FeatureGate ─────────────────────────────────────────────────────────────
// Will be wired to TenantContext feature flags in the Settings phase.
// For now it passes through so stubs are reachable.

export const FeatureGate = ({
  children,
}: {
  children: ReactNode;
  feature?: string;
}) => {
  return <>{children}</>;
};
