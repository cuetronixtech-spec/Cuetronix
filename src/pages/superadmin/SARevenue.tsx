import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Activity } from "lucide-react";

const SARevenue = () => {
  const [tenants, setTenants] = useState<{name: string; slug: string; subscription_status: string; plan_id: string | null; created_at: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("tenants")
      .select("name, slug, subscription_status, plan_id, created_at")
      .neq("id", "00000000-0000-0000-0000-000000000001")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setTenants(data ?? []); setLoading(false); });
  }, []);

  const paid = tenants.filter(t => t.subscription_status === "active").length;
  const trial = tenants.filter(t => t.subscription_status === "trialing").length;

  return (
    <div>
      <PageHeader title="Revenue" description="Platform revenue overview" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Estimated MRR", value: `₹${paid * 1499}`, icon: DollarSign, note: "Based on Starter plan avg" },
          { label: "Paid Tenants", value: String(paid), icon: TrendingUp, note: "Active subscriptions" },
          { label: "In Trial", value: String(trial), icon: Activity, note: "Potential conversions" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">All Tenants — Subscription Status</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Club</TableHead><TableHead>Status</TableHead><TableHead>Plan</TableHead><TableHead>Joined</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : tenants.map(t => (
                <TableRow key={t.slug}>
                  <TableCell>
                    <div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground">/{t.slug}</p></div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${
                      t.subscription_status === "active" ? "text-green-400 border-green-500/30"
                      : t.subscription_status === "trialing" ? "text-yellow-400 border-yellow-500/30"
                      : "text-red-400 border-red-500/30"
                    }`}>{t.subscription_status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.plan_id ? "Custom" : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SARevenue;
