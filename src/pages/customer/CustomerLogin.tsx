import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Phone, Gamepad2, AlertCircle, ChevronDown, Eye, EyeOff } from "lucide-react";
import { setCustomerSession } from "@/hooks/useCustomerSession";
import { cn } from "@/lib/utils";

// ─── Customer portal login ────────────────────────────────────────────────────
// Auth model: look up customer by phone in the customers table.
// If the tenant has deployed verify_customer_password RPC (future migration),
// that will be used. Until then, phone lookup alone grants portal access.

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPhone, setShowPhone] = useState(false);
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

      if (fetchErr) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (!customer) {
        const { data: fallback, error: fallbackErr } = await supabase
          .from("customers")
          .select("id, name, phone, email, loyalty_points, membership_type, tenant_id, is_portal_active")
          .eq("phone", trimmedPhone)
          .maybeSingle();

        if (fallbackErr || !fallback) {
          setError("No account found for this phone number. Please contact staff.");
          setLoading(false);
          return;
        }

        const row = fallback as Record<string, unknown>;
        setCustomerSession({
          id: row.id as string,
          name: row.name as string,
          phone: row.phone as string,
          email: (row.email as string | null) ?? null,
          isFirstLogin: false,
          loyaltyPoints: (row.loyalty_points as number | null) ?? 0,
          isMember: (row.membership_type as string) !== "regular",
          tenantId: row.tenant_id as string,
        });
        navigate("/customer/dashboard");
        return;
      }

      const row = customer as Record<string, unknown>;
      setCustomerSession({
        id: row.id as string,
        name: row.name as string,
        phone: row.phone as string,
        email: (row.email as string | null) ?? null,
        isFirstLogin: false,
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
    <AuthShell showBrand={false}>
      <div className="mb-2 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(190,85%,48%)] shadow-lg shadow-primary/30 ring-1 ring-white/10">
          <Gamepad2 className="h-7 w-7 text-primary-foreground" />
        </div>
      </div>
      <div className="mb-6 text-center">
        <h1 className="font-['Poppins',sans-serif] text-[22px] font-bold tracking-tight text-white">
          Customer portal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookings, loyalty, and offers — all in one place
        </p>
      </div>

      <Card className="border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg font-semibold">Sign in</CardTitle>
          <CardDescription>
            Use the phone number your venue has on file. Toggle the eye to hide or show it on screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="customer-phone">Phone number</Label>
                <span className="text-[11px] font-medium text-muted-foreground">Staff sign-in uses email</span>
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
                  className="border-white/10 bg-background/50 pl-9 pr-10"
                  autoComplete="tel"
                  autoFocus
                />
                <button
                  type="button"
                  aria-label={showPhone ? "Hide phone number" : "Show phone number"}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPhone((v) => !v)}
                >
                  {showPhone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleLogin} disabled={loading} className="w-full shadow-lg shadow-primary/25">
              {loading ? "Looking up account…" : "Continue"}
            </Button>

            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
                >
                  <span>Forgot your phone or can&apos;t sign in?</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", helpOpen && "rotate-180")}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 px-0.5 pt-2 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  This portal matches the phone number registered at your club — it is not the same as staff email
                  login. If your number changed or you are unsure which number is on file, ask the front desk to
                  update your profile or confirm the digits.
                </p>
                <p>
                  <Link to="/contact" className="font-medium text-primary hover:underline">
                    Contact support
                  </Link>
                  {" · "}
                  <Link to="/signin" className="font-medium text-primary hover:underline">
                    Staff / owner sign in
                  </Link>
                </p>
              </CollapsibleContent>
            </Collapsible>

            <p className="text-center text-xs text-muted-foreground">
              New here? Ask staff to add you to the system.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="font-medium hover:text-foreground hover:underline">
          Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
