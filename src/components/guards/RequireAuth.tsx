import { ReactNode } from "react";

// Placeholder — will check auth state via Supabase later
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const RequireSuperAdmin = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const RequireCustomer = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const RequireRole = ({ children, _role }: { children: ReactNode; _role?: string }) => {
  return <>{children}</>;
};

export const RequireActiveSubscription = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const FeatureGate = ({ children, _feature }: { children: ReactNode; _feature?: string }) => {
  return <>{children}</>;
};
