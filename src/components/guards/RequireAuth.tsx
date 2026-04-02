import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

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
// Redirects unauthenticated visitors to /signin.

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

// ─── RequireActiveSubscription ────────────────────────────────────────────────
// Shows a lock screen when subscription is canceled.
// trialing / active / past_due are allowed through.

export const RequireActiveSubscription = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { appMeta } = useAuth();
  if (appMeta.subscription_status === "canceled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-foreground">
            Subscription Ended
          </h2>
          <p className="text-muted-foreground">
            Your subscription has ended. Renew to continue using Cuetronix.
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Renew Subscription
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// ─── RequireSuperAdmin ────────────────────────────────────────────────────────
// Basic session check; the SuperAdminLogin page does the superadmins table check.

export const RequireSuperAdmin = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/super-admin/login" replace />;
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
