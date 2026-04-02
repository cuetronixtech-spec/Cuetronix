import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Users, Settings2, AlertTriangle } from "lucide-react";

const SATenantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<{ id: string; role: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [tRes, cRes, mRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", id).single(),
        supabase.from("tenant_config").select("brand_name, currency_code, timezone, business_email, business_country").eq("tenant_id", id).maybeSingle(),
        supabase.from("tenant_members").select("id, role, user_id").eq("tenant_id", id),
      ]);
      setTenant(tRes.data);
      setConfig(cRes.data);
      setMembers(mRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    const { error } = await supabase.from("tenants").update({ subscription_status: status }).eq("id", id!);
    if (error) toast.error(error.message);
    else { toast.success("Status updated"); setTenant(t => t ? { ...t, subscription_status: status } : t); }
    setSaving(false);
  };

  const toggleActive = async () => {
    const current = tenant?.is_active as boolean;
    setSaving(true);
    await supabase.from("tenants").update({ is_active: !current }).eq("id", id!);
    toast.success(current ? "Tenant deactivated" : "Tenant activated");
    setTenant(t => t ? { ...t, is_active: !current } : t);
    setSaving(false);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  if (!tenant) return <div className="py-8 text-center text-destructive">Tenant not found</div>;

  const statusBadgeClass: Record<string, string> = {
    trialing: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    active: "bg-green-500/10 text-green-400 border-green-500/30",
    canceled: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <div>
      <button onClick={() => navigate("/super-admin/tenants")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" />Back to tenants
      </button>

      <PageHeader
        title={String(tenant.name)}
        description={`/${tenant.slug} · Created ${new Date(String(tenant.created_at)).toLocaleDateString()}`}
        action={
          <Badge variant="outline" className={`${statusBadgeClass[String(tenant.subscription_status)] ?? "bg-muted"} text-xs`}>
            {String(tenant.subscription_status)}
          </Badge>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info */}
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" />Club Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Tenant ID", String(tenant.id)],
              ["Slug", `/${tenant.slug}`],
              ["Brand Name", String(config?.brand_name ?? "—")],
              ["Email", String(config?.business_email ?? "—")],
              ["Country", String(config?.business_country ?? "—")],
              ["Currency", String(config?.currency_code ?? "—")],
              ["Timezone", String(config?.timezone ?? "—")],
              ["Trial Ends", tenant.trial_ends_at ? new Date(String(tenant.trial_ends_at)).toLocaleDateString() : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right max-w-[180px] truncate">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Subscription Control</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Change subscription status</p>
                <Select value={String(tenant.subscription_status)} onValueChange={updateStatus} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="active">Active (Paid)</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant={tenant.is_active ? "destructive" : "default"}
                size="sm"
                className="w-full"
                onClick={toggleActive}
                disabled={saving}
              >
                {tenant.is_active ? <><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Deactivate Club</> : "Activate Club"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />Staff Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members</p>
              ) : (
                <ul className="space-y-2">
                  {members.map(m => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-mono text-xs truncate max-w-[180px]">{m.user_id}</span>
                      <Badge variant="outline" className="text-xs">{m.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SATenantDetail;
