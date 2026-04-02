import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, Building2, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Summary {
  status: string;
  count: number;
  plan_name: string | null;
  price_monthly: number | null;
}

interface RevenueTenant {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_interval: string | null;
  created_at: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan_name: string | null;
  price_monthly: number | null;
  price_annual: number | null;
}

interface RevenueStats {
  summary: Summary[];
  tenants: RevenueTenant[];
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  trial:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
  past_due: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  canceled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function SARevenue() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("sa_get_revenue_stats");
    if (error) setError(error.message);
    else setStats(data as RevenueStats);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const mrr = stats?.tenants
    ?.filter((t) => t.subscription_status === "active")
    .reduce((sum, t) => {
      if (!t.price_monthly) return sum;
      if (t.subscription_interval === "annual" && t.price_annual) {
        return sum + (t.price_annual / 12);
      }
      return sum + t.price_monthly;
    }, 0) ?? 0;

  const activeCount = stats?.summary?.find((s) => s.status === "active")?.count ?? 0;
  const trialCount  = stats?.summary?.find((s) => s.status === "trial")?.count ?? 0;
  const pastDue     = stats?.summary?.find((s) => s.status === "past_due")?.count ?? 0;

  const CARDS = [
    {
      label: "Est. MRR",
      value: `₹${Math.round(mrr).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      sub: "Active subscriptions only",
    },
    {
      label: "Paying Clubs",
      value: activeCount.toString(),
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
      sub: "subscription_status = active",
    },
    {
      label: "On Trial",
      value: trialCount.toString(),
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      sub: "Free trial period",
    },
    {
      label: "Past Due",
      value: pastDue.toString(),
      icon: AlertCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      sub: "Needs attention",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform subscription overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="pt-5 pb-5">
              <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${bg} mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              {loading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value}</p>
              )}
              <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan breakdown */}
      {!loading && stats?.summary && stats.summary.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By Plan & Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {stats.summary.map((s, i) => {
                const cls = STATUS_STYLE[s.status] ?? "bg-muted text-muted-foreground border-border";
                const label = { active: "Active", trial: "Trial", past_due: "Past Due", canceled: "Canceled" }[s.status] ?? s.status;
                const rev = s.status === "active" && s.price_monthly ? s.count * s.price_monthly : null;
                return (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
                        {label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {s.plan_name ?? "No Plan"}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-muted-foreground">{s.count} club{s.count !== 1 ? "s" : ""}</span>
                      {rev !== null && (
                        <span className="font-medium text-foreground">
                          ₹{rev.toLocaleString("en-IN")}/mo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant table */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Clubs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Club</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !stats?.tenants?.length ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tenants yet
                  </TableCell>
                </TableRow>
              ) : (
                stats.tenants.map((t) => {
                  const cls = STATUS_STYLE[t.subscription_status] ?? "bg-muted text-muted-foreground border-border";
                  const label = { active: "Active", trial: "Trial", past_due: "Past Due", canceled: "Canceled" }[t.subscription_status] ?? t.subscription_status;
                  return (
                    <TableRow key={t.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{t.name || t.slug}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.plan_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
                          {label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {t.price_monthly ? `₹${t.price_monthly.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.current_period_end ? format(new Date(t.current_period_end), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(t.created_at), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
