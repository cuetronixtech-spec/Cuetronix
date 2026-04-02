import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, Clock, Activity, AlertCircle } from "lucide-react";

interface PlatformStats {
  totalTenants: number;
  activeTrials: number;
  activeSubscriptions: number;
  canceledCount: number;
  totalUsers: number;
  recentSignups: { name: string; slug: string; created_at: string; subscription_status: string }[];
}

const SADashboard = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tenantsRes, membersRes, recentRes] = await Promise.all([
          supabase.from("tenants").select("subscription_status").eq("is_active", true).neq("id", "00000000-0000-0000-0000-000000000001"),
          supabase.from("tenant_members").select("id", { count: "exact" }),
          supabase.from("tenants").select("name, slug, created_at, subscription_status").neq("id", "00000000-0000-0000-0000-000000000001").order("created_at", { ascending: false }).limit(5),
        ]);

        const tenants = tenantsRes.data ?? [];
        setStats({
          totalTenants: tenants.length,
          activeTrials: tenants.filter(t => t.subscription_status === "trialing").length,
          activeSubscriptions: tenants.filter(t => t.subscription_status === "active").length,
          canceledCount: tenants.filter(t => t.subscription_status === "canceled").length,
          totalUsers: membersRes.count ?? 0,
          recentSignups: recentRes.data ?? [],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { title: "Total Clubs", value: stats?.totalTenants ?? 0, icon: Building2, color: "text-blue-400" },
    { title: "Active Trials", value: stats?.activeTrials ?? 0, icon: Clock, color: "text-yellow-400" },
    { title: "Paid Subscribers", value: stats?.activeSubscriptions ?? 0, icon: TrendingUp, color: "text-green-400" },
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-purple-400" },
  ];

  const statusColor = (s: string) => {
    if (s === "trialing") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    if (s === "active") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (s === "canceled") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <PageHeader title="Super Admin Dashboard" description="Platform-wide overview" />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8"><Activity className="h-4 w-4 animate-pulse" />Loading platform data…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map((s) => (
              <Card key={s.title} className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Recent Sign-ups</CardTitle></CardHeader>
              <CardContent>
                {stats?.recentSignups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tenants yet</p>
                ) : (
                  <ul className="space-y-3">
                    {stats?.recentSignups.map((t) => (
                      <li key={t.slug} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">/{t.slug} · {new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${statusColor(t.subscription_status)}`}>
                          {t.subscription_status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Subscription Health</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Trialing", count: stats?.activeTrials ?? 0, color: "bg-yellow-400" },
                  { label: "Active (Paid)", count: stats?.activeSubscriptions ?? 0, color: "bg-green-400" },
                  { label: "Canceled", count: stats?.canceledCount ?? 0, color: "bg-red-400" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                    <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                    <span className="text-sm font-medium">{row.count}</span>
                  </div>
                ))}
                {stats?.canceledCount && stats.canceledCount > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-orange-400 mt-2 pt-2 border-t border-border/50">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {stats.canceledCount} club{stats.canceledCount > 1 ? "s" : ""} cancelled — consider reaching out
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default SADashboard;
