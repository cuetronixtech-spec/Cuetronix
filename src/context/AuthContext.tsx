import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppMetadata {
  tenant_id?: string;
  role?: "admin" | "manager" | "staff" | "customer";
  subscription_status?: string;
  plan_slug?: string;
  plan_max_stations?: number | null;
  plan_max_staff?: number | null;
  features?: {
    ai_assistant?: boolean;
    custom_domain?: boolean;
    investors?: boolean;
    white_label?: boolean;
    api_access?: boolean;
    priority_support?: boolean;
  };
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  /** Parsed app_metadata from the current JWT (tenant_id, role, plan info, features) */
  appMeta: AppMetadata;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Force-refresh the JWT so that newly created tenant_id / role claims are visible */
  refreshSession: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from storage on first mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Keep in sync with sign-in / sign-out / token-refresh events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) setSession(data.session);
  };

  // app_metadata is embedded in the JWT by the custom_jwt_claims hook
  const appMeta: AppMetadata = (session?.user?.app_metadata ?? {}) as AppMetadata;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        appMeta,
        loading,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
