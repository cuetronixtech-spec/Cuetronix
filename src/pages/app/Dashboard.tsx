import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Monitor, ShoppingCart, Clock, AlertTriangle, Sparkles, X } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Trial Banner ──────────────────────────────────────────────────────────────

function TrialBanner() {
  const { config } = useTenant();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !config) return null;

  const status = config.subscription_status;
  const trialEndsAt = config.trial_ends_at ? new Date(config.trial_ends_at) : null;
  const now = new Date();

  if (status !== "trialing" || !trialEndsAt) return null;

  const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysLeft <= 3;
  const isExpired = daysLeft <= 0;

  if (isExpired) return null; // guard handles the redirect

  const bgClass = isExpiringSoon
    ? "bg-orange-500/10 border-orange-500/40 text-orange-300"
    : "bg-primary/10 border-primary/30 text-primary";

  const Icon = isExpiringSoon ? AlertTriangle : Clock;

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 mb-6 ${bgClass}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">
          {isExpiringSoon
            ? `⚠️ Your trial expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}! Upgrade now to keep access.`
            : `Your 14-day free trial is active — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining (ends ${trialEndsAt.toLocaleDateString()})`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant={isExpiringSoon ? "default" : "outline"}
          className={isExpiringSoon ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : ""}
          onClick={() => navigate("/subscription")}
        >
          Upgrade Plan
        </Button>
        {!isExpiringSoon && (
          <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Welcome Banner ────────────────────────────────────────────────────────────

function WelcomeBanner({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  const { config } = useTenant();
  const trialEndsAt = config?.trial_ends_at ? new Date(config.trial_ends_at) : null;

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-base">
            Welcome to Cuetronix, {name}! 🎉
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your club workspace is ready. Your 14-day free trial has started
            {trialEndsAt && ` and runs until ${trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Explore the platform and set up your club — head to <strong>Settings</strong> to configure stations, billing, and more.
          </p>
        </div>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats = [
  { title: "Today's Revenue", value: "₹0", icon: DollarSign, color: "text-green-400" },
  { title: "Active Sessions", value: "0", icon: Monitor, color: "text-blue-400" },
  { title: "Total Customers", value: "0", icon: Users, color: "text-purple-400" },
  { title: "Today's Orders", value: "0", icon: ShoppingCart, color: "text-orange-400" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { config } = useTenant();
  const [showWelcome, setShowWelcome] = useState(false);

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    config?.tenant_name ??
    "there";

  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setShowWelcome(true);
      // Remove ?welcome=1 from URL without a re-render
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your club's performance"
        action={
          config?.subscription_status === "trialing" && config.trial_ends_at ? (
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Trial active
            </Badge>
          ) : undefined
        }
      />

      {showWelcome && (
        <WelcomeBanner
          name={displayName}
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      <TrialBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                {s.title}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Revenue Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No data yet — start recording sessions in POS
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
