import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, Monitor, ShoppingCart, Clock, AlertTriangle, Sparkles, X, TrendingUp } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  todayRevenue: number;
  activeSessions: number;
  totalCustomers: number;
  todayBills: number;
};

type RecentActivity = {
  id: string;
  type: "bill" | "session" | "booking";
  description: string;
  amount?: number;
  time: string;
};

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
  if (daysLeft <= 0) return null;
  const isExpiringSoon = daysLeft <= 3;

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 mb-6 ${isExpiringSoon ? "bg-orange-500/10 border-orange-500/40 text-orange-300" : "bg-primary/10 border-primary/30 text-primary"}`}>
      <div className="flex items-center gap-3">
        {isExpiringSoon ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <p className="text-sm font-medium">
          {isExpiringSoon
            ? `⚠️ Your trial expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}! Upgrade now to keep access.`
            : `Your 14-day free trial is active — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining (ends ${trialEndsAt.toLocaleDateString()})`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant={isExpiringSoon ? "default" : "outline"} className={isExpiringSoon ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : ""} onClick={() => navigate("/subscription")}>
          Upgrade Plan
        </Button>
        {!isExpiringSoon && <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 p-1"><X className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  );
}

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
          <h3 className="font-semibold text-foreground text-base">Welcome to Cuetronix, {name}! 🎉</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your club workspace is ready. Your 14-day free trial has started
            {trialEndsAt && ` and runs until ${trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Head to <strong>Settings</strong> to configure stations, billing, and more.</p>
        </div>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 shrink-0"><X className="h-4 w-4" /></button>
    </div>
  );
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [showWelcome, setShowWelcome] = useState(false);
  const [stats, setStats] = useState<Stats>({ todayRevenue: 0, activeSessions: 0, totalCustomers: 0, todayBills: 0 });
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ?? config?.tenant_name ?? "there";

  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setShowWelcome(true);
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tenantId) return;
    const loadStats = async () => {
      setLoading(true);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const [billsRes, sessionsRes, customersRes, recentBillsRes, recentBookingsRes] = await Promise.all([
        supabase.from("bills").select("total_amount").eq("tenant_id", tenantId).gte("created_at", todayStart).neq("status", "voided"),
        supabase.from("sessions").select("id").eq("tenant_id", tenantId).eq("status", "active"),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("bills").select("id, bill_number, total_amount, payment_method, created_at").eq("tenant_id", tenantId).neq("status", "voided").order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("id, customer_name, booking_date, start_time, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(3),
      ]);

      const todayRevenue = (billsRes.data || []).reduce((s, b) => s + Number(b.total_amount), 0);
      const todayBills = (billsRes.data || []).length;
      const activeSessions = (sessionsRes.data || []).length;
      const totalCustomers = customersRes.count || 0;

      setStats({ todayRevenue, activeSessions, totalCustomers, todayBills });

      const recentAct: RecentActivity[] = [
        ...(recentBillsRes.data || []).map(b => ({
          id: b.id,
          type: "bill" as const,
          description: `Bill ${b.bill_number || b.id.slice(0, 8)} · ${b.payment_method}`,
          amount: Number(b.total_amount),
          time: b.created_at,
        })),
        ...(recentBookingsRes.data || []).map(b => ({
          id: b.id,
          type: "booking" as const,
          description: `Booking for ${b.customer_name} on ${new Date(b.booking_date).toLocaleDateString()}`,
          time: b.created_at,
        })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      setActivity(recentAct);
      setLoading(false);
    };
    loadStats();
  }, [tenantId]);

  const statCards = [
    { title: "Today's Revenue", value: `${sym}${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
    { title: "Active Sessions", value: String(stats.activeSessions), icon: Monitor, color: "text-blue-400" },
    { title: "Total Customers", value: String(stats.totalCustomers), icon: Users, color: "text-purple-400" },
    { title: "Today's Bills", value: String(stats.todayBills), icon: ShoppingCart, color: "text-orange-400" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your club's performance"
        actions={
          config?.subscription_status === "trialing" && config.trial_ends_at ? (
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">
              <Clock className="h-3 w-3 mr-1" />Trial active
            </Badge>
          ) : undefined
        }
      />

      {showWelcome && <WelcomeBanner name={displayName} onDismiss={() => setShowWelcome(false)} />}
      <TrialBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <Card key={s.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{s.title}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold text-foreground">{s.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : activity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity — start a session in POS!</p>
            ) : (
              <div className="space-y-3">
                {activity.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${a.type === "bill" ? "bg-green-500/10" : "bg-blue-500/10"}`}>
                        {a.type === "bill" ? <ShoppingCart className="h-3.5 w-3.5 text-green-500" /> : <Clock className="h-3.5 w-3.5 text-blue-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.time).toLocaleString()}</p>
                      </div>
                    </div>
                    {a.amount != null && <p className="text-sm font-semibold shrink-0 text-green-500">{sym}{a.amount.toLocaleString()}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Active Sessions</span>
                  </div>
                  <span className="font-bold text-blue-500">{stats.activeSessions}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Today's Revenue</span>
                  </div>
                  <span className="font-bold text-green-500">{sym}{stats.todayRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Total Customers</span>
                  </div>
                  <span className="font-bold text-purple-500">{stats.totalCustomers}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
