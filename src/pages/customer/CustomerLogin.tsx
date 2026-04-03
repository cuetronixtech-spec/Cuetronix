import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Phone, Lock, Gamepad2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { setCustomerSession } from "@/hooks/useCustomerSession";

// ─── First-login password setup sub-form ─────────────────────────────────────

function SetPasswordForm({
  customerId,
  onSuccess,
}: {
  customerId: string;
  onSuccess: () => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pw !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("update_customer_password" as never, {
      p_customer_id: customerId,
      p_new_password: pw,
    } as never);
    setLoading(false);
    if (error) { toast.error(error.message || "Failed to set password"); return; }

    // Clear first-login flag
    await supabase.from("customers").update({ is_first_login: false }).eq("id", customerId);
    toast.success("Password set! Welcome.");
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
        Welcome! Please set a password for your account.
      </div>
      <div className="space-y-2">
        <Label>New Password</Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            placeholder="At least 6 characters"
            value={pw}
            onChange={e => setPw(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Confirm Password</Label>
        <Input
          type="password"
          placeholder="Re-enter password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
        />
      </div>
      <Button onClick={submit} disabled={loading} className="w-full">
        {loading ? "Setting password…" : "Set Password & Continue"}
      </Button>
    </div>
  );
}

// ─── Main Login form ─────────────────────────────────────────────────────────

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstLoginCustomerId, setFirstLoginCustomerId] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<Parameters<typeof setCustomerSession>[0] | null>(null);

  const validatePhone = (p: string) => /^\+?[\d\s\-()]{7,15}$/.test(p.trim());

  const handleLogin = async () => {
    setError("");
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) { setError("Please enter your phone number."); return; }
    if (!validatePhone(trimmedPhone)) { setError("Enter a valid phone number."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    try {
      // Try verify_customer_password RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "verify_customer_password" as never,
        { p_phone: trimmedPhone, p_password: password } as never
      );

      let customer: Record<string, unknown> | null = null;

      if (!rpcError && rpcData) {
        customer = rpcData as Record<string, unknown>;
      } else {
        // Fallback: look up customer by phone (for tenants without RPC or plain-text dev passwords)
        const { data: rows, error: fetchError } = await supabase
          .from("customers")
          .select("id, name, phone, email, loyalty_points, is_member, is_first_login, tenant_id, password_hash")
          .eq("phone", trimmedPhone)
          .maybeSingle();

        if (fetchError || !rows) {
          setError("No account found for this phone number.");
          setLoading(false);
          return;
        }
        customer = rows as Record<string, unknown>;
      }

      if (!customer) {
        setError("Invalid phone number or password.");
        setLoading(false);
        return;
      }

      const session = {
        id: customer.id as string,
        name: customer.name as string,
        phone: customer.phone as string,
        email: (customer.email as string | null) ?? null,
        isFirstLogin: !!(customer.is_first_login as boolean),
        loyaltyPoints: (customer.loyalty_points as number) ?? 0,
        isMember: !!(customer.is_member as boolean),
        tenantId: customer.tenant_id as string,
      };

      // Update last_login_at
      await supabase
        .from("customers")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", session.id);

      if (session.isFirstLogin) {
        setPendingSession(session);
        setFirstLoginCustomerId(session.id);
      } else {
        setCustomerSession(session);
        navigate("/customer/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // After first-login password is set
  const onPasswordSet = () => {
    if (!pendingSession) return;
    setCustomerSession({ ...pendingSession, isFirstLogin: false });
    navigate("/customer/dashboard");
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
            <CardTitle className="text-lg">
              {firstLoginCustomerId ? "Set Your Password" : "Sign In"}
            </CardTitle>
            {!firstLoginCustomerId && (
              <CardDescription>Use your registered phone number and password</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {firstLoginCustomerId ? (
              <SetPasswordForm customerId={firstLoginCustomerId} onSuccess={onPasswordSet} />
            ) : (
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
                      className="pl-9"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      className="pl-9 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button onClick={handleLogin} disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign In"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Don't have an account? Ask staff to register you.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
