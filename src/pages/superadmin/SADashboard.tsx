import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, TrendingUp, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  past_due_tenants: number;
  inactive_tenants: number;
  total_members: number;
  recent_tenants: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    is_active: boolean;
    created_at: string;
  }>;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",   className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  trial:    { label: "Trial",    className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  past_due: { label: "Past Due", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  canceled: { label: "Canceled", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  inactive: { label: "Inactive", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function SADashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("sa_get_dashboard_stats");
      if (error) {
        setError(error.message);
      } else {
        setStats(data as DashboardStats);
      }
      setLoading(false);
    })();
  }, []);

  const STAT_CARDS = [
    {
      label: "Total Clubs",
      value: stats?.total_tenants ?? 0,
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Active",
      value: stats?.active_tenants ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "On Trial",
      value: stats?.trial_tenants ?? 0,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Staff",
      value: stats?.total_members ?? 0,
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Past Due",
      value: stats?.past_due_tenants ?? 0,
      icon: AlertCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Inactive",
      value: stats?.inactive_tenants ?? 0,
      icon: TrendingUp,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load dashboard: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${bg} mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent sign-ups */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Sign-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !stats?.recent_tenants?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tenants yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.recent_tenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      to={`/super-admin/tenants/${t.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {t.name || t.slug}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={!t.is_active ? "inactive" : t.subscription_status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health breakdown */}
      {!loading && stats && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subscription Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Active",   count: stats.active_tenants,   color: "bg-emerald-500" },
                { label: "Trial",    count: stats.trial_tenants,    color: "bg-blue-500" },
                { label: "Past Due", count: stats.past_due_tenants, color: "bg-amber-500" },
                { label: "Inactive", count: stats.inactive_tenants, color: "bg-red-500" },
              ].map(({ label, count, color }) => {
                const pct = stats.total_tenants > 0
                  ? Math.round((count / stats.total_tenants) * 100)
                  : 0;
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
