import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Building2, Users, CreditCard, Globe, ShieldCheck, ShieldOff } from "lucide-react";
import { format } from "date-fns";

interface TenantDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    subscription_interval: string | null;
    is_active: boolean;
    trial_ends_at: string | null;
    current_period_end: string | null;
    created_at: string;
    owner_user_id: string | null;
  };
  config: {
    brand_name: string | null;
    business_email: string | null;
    business_phone: string | null;
    business_city: string | null;
    business_country: string;
    currency_code: string;
    timezone: string;
    gateway_provider: string;
  } | null;
  plan: {
    id: string;
    name: string;
    price_monthly: number;
    price_annual: number;
    currency: string;
    max_staff: number;
    max_stations: number;
    max_customers: number;
  } | null;
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    joined_at: string | null;
  }>;
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  trial:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
  past_due: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  canceled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  inactive: "bg-red-500/10 text-red-500 border-red-500/20",
};

const ROLE_STYLE: Record<string, string> = {
  admin:   "bg-violet-500/10 text-violet-500 border-violet-500/20",
  manager: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  staff:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

export default function SATenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("sa_get_tenant_detail", { p_tenant_id: id });
    if (error) setError(error.message);
    else {
      const d = data as TenantDetail;
      setDetail(d);
      setPendingStatus(d?.tenant?.subscription_status ?? "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const saveStatus = async () => {
    if (!detail || !id) return;
    setSaving(true);
    const { error } = await supabase.rpc("sa_update_tenant", {
      p_tenant_id: id,
      p_subscription_status: pendingStatus,
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success("Subscription status updated");
      setDetail((d) => d ? { ...d, tenant: { ...d.tenant, subscription_status: pendingStatus } } : d);
    }
    setSaving(false);
  };

  const toggleActive = async () => {
    if (!detail || !id) return;
    setSaving(true);
    const newActive = !detail.tenant.is_active;
    const { error } = await supabase.rpc("sa_update_tenant", {
      p_tenant_id: id,
      p_is_active: newActive,
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(newActive ? "Tenant activated" : "Tenant deactivated");
      setDetail((d) => d ? { ...d, tenant: { ...d.tenant, is_active: newActive } } : d);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Tenant not found"}
        </div>
      </div>
    );
  }

  const { tenant, config, plan, members } = detail;
  const statusKey = !tenant.is_active ? "inactive" : tenant.subscription_status;
  const statusLabel = { active: "Active", trial: "Trial", past_due: "Past Due", canceled: "Canceled", inactive: "Inactive" }[statusKey] ?? statusKey;
  const statusCls = STATUS_STYLE[statusKey] ?? "bg-muted text-muted-foreground border-border";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mt-0.5 shrink-0"
          onClick={() => navigate("/super-admin/tenants")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {tenant.name || tenant.slug}
            </h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCls}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{tenant.slug}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant={tenant.is_active ? "destructive" : "default"}
              size="sm"
              disabled={saving}
            >
              {tenant.is_active ? (
                <><ShieldOff className="h-4 w-4 mr-2" />Deactivate</>
              ) : (
                <><ShieldCheck className="h-4 w-4 mr-2" />Activate</>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tenant.is_active ? "Deactivate" : "Activate"} Tenant?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tenant.is_active
                  ? "This will immediately block all staff from accessing this club."
                  : "This will restore access for all staff at this club."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={toggleActive}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-2" />Overview
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />Staff ({members.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Club info */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />Club Info
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Brand Name"    value={config?.brand_name} />
              <Field label="Email"         value={config?.business_email} />
              <Field label="Phone"         value={config?.business_phone} />
              <Field label="City"          value={config?.business_city} />
              <Field label="Country"       value={config?.business_country} />
              <Field label="Currency"      value={config?.currency_code} />
              <Field label="Timezone"      value={config?.timezone} />
              <Field label="Gateway"       value={config?.gateway_provider} />
              <Field label="Created"       value={format(new Date(tenant.created_at), "dd MMM yyyy")} />
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Plan"         value={plan?.name} />
                <Field label="Interval"     value={tenant.subscription_interval ?? "—"} />
                <Field
                  label="Monthly Price"
                  value={plan ? `${plan.currency} ${plan.price_monthly.toLocaleString()}` : undefined}
                />
                <Field label="Trial Ends"   value={tenant.trial_ends_at ? format(new Date(tenant.trial_ends_at), "dd MMM yyyy") : undefined} />
                <Field label="Period End"   value={tenant.current_period_end ? format(new Date(tenant.current_period_end), "dd MMM yyyy") : undefined} />
                <Field label="Max Staff"    value={plan?.max_staff?.toString()} />
              </div>

              <div className="pt-2 flex items-end gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1.5">Subscription Status</p>
                  <Select value={pendingStatus} onValueChange={setPendingStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["trial", "active", "past_due", "canceled"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={saveStatus}
                  disabled={saving || pendingStatus === tenant.subscription_status}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No staff members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => {
                      const roleCls = ROLE_STYLE[m.role] ?? "bg-muted text-muted-foreground border-border";
                      return (
                        <TableRow key={m.id} className="border-border hover:bg-muted/30">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {m.user_id}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleCls}`}>
                              {m.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${m.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                              {m.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {m.joined_at ? format(new Date(m.joined_at), "dd MMM yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
