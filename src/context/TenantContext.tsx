import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentMethodConfig {
  label: string;
  enabled: boolean;
}

export interface TenantConfig {
  tenant_id: string;

  // Tenant-level fields (joined from tenants table)
  tenant_slug: string | null;
  tenant_name: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  is_sandbox: boolean;
  is_approved: boolean;
  owner_user_id: string | null;

  // Branding
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  font_heading: string;
  font_body: string;
  dark_mode_default: boolean;
  powered_by_visible: boolean;

  // Business
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_country: string;
  business_postal_code: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_tax_id: string | null;
  business_website: string | null;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  time_format: string;

  // Gateway
  gateway_provider: string;
  razorpay_mode: string;
  square_environment: string;

  // Receipt
  receipt_template: string;
  receipt_show_logo: boolean;
  receipt_header_text: string | null;
  receipt_footer_text: string | null;
  receipt_show_tax_id: boolean;
  receipt_tax_label: string;

  // POS & Session
  session_inactivity_timeout: number;
  student_discount_percent: number;
  loyalty_enabled: boolean;
  loyalty_points_per_unit: number;
  loyalty_redeem_threshold: number;
  loyalty_unit_per_point: number;
  default_session_rate: number;
  enable_split_payment: boolean;
  enable_complimentary: boolean;
  enable_credit_payment: boolean;

  // Booking
  booking_slot_duration_mins: number;
  booking_advance_days: number;
  booking_min_notice_hours: number;
  booking_cancellation_hours: number;
  booking_event_name: string;
  booking_coupons: unknown[];
  booking_confirmation_msg: string | null;

  // Feature Flags
  feature_tournaments: boolean;
  feature_bookings: boolean;
  feature_customer_portal: boolean;
  feature_ai_assistant: boolean;
  feature_staff_hr: boolean;
  feature_cash_management: boolean;
  feature_expenses: boolean;
  feature_investors: boolean;
  feature_how_to_use: boolean;

  // Payment methods
  payment_methods: Record<string, PaymentMethodConfig>;

  // Notifications
  notify_new_booking: boolean;
  notify_low_stock: boolean;
  low_stock_threshold: number;

  // Custom Domain
  custom_domain: string | null;
  custom_domain_verified: boolean;

  // Customer Portal
  customer_portal_welcome_text: string | null;
  customer_portal_show_loyalty: boolean;
  customer_portal_show_booking: boolean;
  customer_portal_show_offers: boolean;
}

interface TenantContextType {
  config: TenantConfig | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

// ─── Theme application ────────────────────────────────────────────────────────

/**
 * Injects tenant brand colors and fonts into CSS variables.
 * The shadcn/ui theme uses `--primary`, `--secondary`, etc. mapped through
 * tailwind.config.ts. We override the HSL values directly on :root.
 *
 * We also set tenant-specific vars (--tenant-*) for explicit usage in custom
 * components that need hex values (e.g. chart fills, inline styles).
 */
function applyTenantTheme(config: TenantConfig) {
  const root = document.documentElement;

  // Convert hex to raw CSS value usable in hsl() — for now just store the hex
  // and let components that need it read from TenantContext. The CSS variables
  // below override the shadcn palette using the tenant's primary color.
  if (config.primary_color) {
    root.style.setProperty("--tenant-primary", config.primary_color);
  }
  if (config.secondary_color) {
    root.style.setProperty("--tenant-secondary", config.secondary_color);
  }
  if (config.accent_color) {
    root.style.setProperty("--tenant-accent", config.accent_color);
  }
  if (config.background_color) {
    root.style.setProperty("--tenant-background", config.background_color);
  }
  if (config.surface_color) {
    root.style.setProperty("--tenant-surface", config.surface_color);
  }

  // Favicon
  if (config.brand_favicon_url) {
    const link = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;
    if (link) link.href = config.brand_favicon_url;
  }

  // Page title
  if (config.brand_name) {
    document.title = `${config.brand_name} — Club Manager`;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!user) {
      setConfig(null);
      return;
    }

    setLoading(true);
    try {
      // get_my_tenant_config is a SECURITY DEFINER RPC that returns the
      // full tenant_config row as JSONB — works even before the JWT carries
      // tenant_id (right after sign-up + before session refresh).
      const { data, error } = await supabase.rpc("get_my_tenant_config");

      if (!error && data) {
        const cfg = data as unknown as TenantConfig;
        setConfig(cfg);
        applyTenantTheme(cfg);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <TenantContext.Provider value={{ config, loading, refetch: fetchConfig }}>
      {children}
    </TenantContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within <TenantProvider>");
  return ctx;
}
