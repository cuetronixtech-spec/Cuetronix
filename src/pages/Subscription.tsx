import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Zap, Shield, LifeBuoy, LogOut } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// ─── Plan cards ───────────────────────────────────────────────────────────────

const plans = [
  {
    slug: "starter",
    name: "Starter",
    price: "₹1,499",
    period: "/month",
    description: "Perfect for small clubs getting started",
    features: [
      "Up to 5 stations",
      "Up to 3 staff members",
      "POS & billing",
      "Customer management",
      "Basic reports",
      "Online booking",
    ],
    highlighted: false,
    cta: "Choose Starter",
  },
  {
    slug: "pro",
    name: "Pro",
    price: "₹2,999",
    period: "/month",
    description: "For growing clubs with advanced needs",
    features: [
      "Up to 15 stations",
      "Unlimited staff",
      "Everything in Starter",
      "Tournaments module",
      "Expense tracking",
      "Cash management",
      "Investor reports",
      "Priority support",
    ],
    highlighted: true,
    cta: "Choose Pro",
    badge: "Most Popular",
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "₹5,999",
    period: "/month",
    description: "Unlimited scale with white-label & API",
    features: [
      "Unlimited stations",
      "Unlimited staff",
      "Everything in Pro",
      "AI assistant",
      "White-label branding",
      "API access",
      "Custom domain",
      "Dedicated support",
    ],
    highlighted: false,
    cta: "Choose Enterprise",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Subscription = () => {
  const { config } = useTenant();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState<string | null>(null);

  const trialEndsAt = config?.trial_ends_at ? new Date(config.trial_ends_at) : null;
  const trialExpired = trialEndsAt && trialEndsAt < new Date();
  const status = config?.subscription_status;

  const handleSelect = async (planSlug: string) => {
    setSelecting(planSlug);
    // TODO: Integrate Stripe/Razorpay checkout here
    toast.info(`Redirecting to checkout for ${planSlug} plan… (payment integration coming soon)`);
    await new Promise((r) => setTimeout(r, 1500));
    setSelecting(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-primary tracking-tight">Cuetronix</span>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={async () => { await signOut(); navigate("/signin"); }}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Lock notice */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            {trialExpired ? "Your trial has ended" : "Subscription required"}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-base">
            {trialExpired
              ? `Your 14-day free trial expired on ${trialEndsAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Choose a plan to continue using Cuetronix.`
              : status === "canceled"
              ? "Your subscription has been cancelled. Choose a plan below to restore access."
              : "Choose a plan to unlock all features for your club."}
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.slug}
              className={`relative border flex flex-col ${
                plan.highlighted
                  ? "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                  : "border-border/50"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={selecting !== null}
                  onClick={() => handleSelect(plan.slug)}
                >
                  {selecting === plan.slug ? (
                    <><div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />Processing…</>
                  ) : plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { icon: Zap, text: "Instant activation" },
            { icon: Shield, text: "Secure payments" },
            { icon: LifeBuoy, text: "Cancel anytime" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Need help choosing?{" "}
          <a href="/contact" className="text-primary hover:underline">
            Contact us
          </a>{" "}
          and we'll find the right plan for you.
        </p>
      </div>
    </div>
  );
};

export default Subscription;
