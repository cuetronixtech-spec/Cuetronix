import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Phone, AlertCircle, ChevronDown, Eye, EyeOff, Gamepad2 } from "lucide-react";
import { setCustomerSession } from "@/hooks/useCustomerSession";
import { cn } from "@/lib/utils";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPhone, setShowPhone] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleLogin = async () => {
    setError("");
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) { setError("Please enter your phone number."); return; }

    setLoading(true);
    try {
      const { data: customer, error: fetchErr } = await supabase
        .from("customers")
        .select("id, name, phone, email, loyalty_points, membership_type, tenant_id, is_portal_active")
        .eq("phone", trimmedPhone)
        .eq("is_portal_active", true)
        .maybeSingle();

      if (fetchErr) { setError("Something went wrong. Please try again."); setLoading(false); return; }

      if (!customer) {
        const { data: fallback, error: fallbackErr } = await supabase
          .from("customers")
          .select("id, name, phone, email, loyalty_points, membership_type, tenant_id, is_portal_active")
          .eq("phone", trimmedPhone)
          .maybeSingle();

        if (fallbackErr || !fallback) { setError("No account found for this phone number. Please contact staff."); setLoading(false); return; }

        const row = fallback as Record<string, unknown>;
        setCustomerSession({
          id: row.id as string, name: row.name as string, phone: row.phone as string,
          email: (row.email as string | null) ?? null, isFirstLogin: false,
          loyaltyPoints: (row.loyalty_points as number | null) ?? 0,
          isMember: (row.membership_type as string) !== "regular",
          tenantId: row.tenant_id as string,
        });
        navigate("/customer/dashboard");
        return;
      }

      const row = customer as Record<string, unknown>;
      setCustomerSession({
        id: row.id as string, name: row.name as string, phone: row.phone as string,
        email: (row.email as string | null) ?? null, isFirstLogin: false,
        loyaltyPoints: (row.loyalty_points as number | null) ?? 0,
        isMember: (row.membership_type as string) !== "regular",
        tenantId: row.tenant_id as string,
      });
      navigate("/customer/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell backTo="/" backLabel="Home" variant="customer">
      <div className="space-y-6">
        {/* Header with icon */}
        <div className="auth-fade-1 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(190,85%,48%)] shadow-lg shadow-primary/25 ring-1 ring-white/10">
            <Gamepad2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-white">
              Customer portal
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Bookings, loyalty, and offers — all in one place
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Phone input */}
        <div className="auth-fade-2 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="customer-phone" className="text-[13px] font-medium text-foreground/80">
                Phone number
              </Label>
              <span className="text-[11px] text-muted-foreground">Registered at your venue</span>
            </div>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-phone"
                type={showPhone ? "tel" : "password"}
                inputMode="tel"
                placeholder="+91 99999 99999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-11 border-white/10 bg-white/[0.03] pl-10 pr-11 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                autoComplete="tel"
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPhone ? "Hide phone" : "Show phone"}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPhone((v) => !v)}
              >
                {showPhone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="h-11 w-full text-[14px] font-semibold shadow-lg shadow-primary/20"
          >
            {loading ? "Looking up account…" : "Continue"}
          </Button>
        </div>

        {/* Help */}
        <div className="auth-fade-3">
          <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-left text-[13px] font-medium text-foreground/80 transition-colors hover:bg-white/[0.04]"
              >
                Forgot your phone or can&apos;t sign in?
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", helpOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 px-1 pt-2.5 text-[12px] leading-relaxed text-muted-foreground">
              <p>
                This portal uses the phone number registered at your club — not the same as staff email login.
                If your number changed, ask the front desk to update your profile.
              </p>
              <p>
                <Link to="/contact" className="font-medium text-primary hover:underline">Contact support</Link>
                {" · "}
                <Link to="/signin" className="font-medium text-primary hover:underline">Staff / owner sign in</Link>
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <p className="auth-fade-4 text-center text-[12px] text-muted-foreground">
          New here? Ask staff to add you to the system.
        </p>
      </div>
    </AuthShell>
  );
}
