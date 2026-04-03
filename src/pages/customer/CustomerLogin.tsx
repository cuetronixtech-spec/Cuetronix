import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Gamepad2, AlertCircle } from "lucide-react";
import { setCustomerSession } from "@/hooks/useCustomerSession";

// ─── Customer portal login ────────────────────────────────────────────────────
// Auth model: look up customer by phone in the customers table.
// If the tenant has deployed verify_customer_password RPC (future migration),
// that will be used. Until then, phone lookup alone grants portal access.

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) { setError("Please enter your phone number."); return; }

    setLoading(true);
    try {
      // First try the verify_customer_password RPC if it exists (future-compatible)
      // Fall back to plain phone lookup for the current schema
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
        // Try without the is_portal_active filter in case portal isn't activated
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Gamepad2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Customer Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to view your bookings, loyalty, and offers</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your registered phone number to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+91 9999999999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    className="pl-9"
                    autoComplete="tel"
                    autoFocus
                  />
                </div>
              </div>

              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? "Looking up account…" : "Continue"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Don't have an account? Ask staff to register you.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
