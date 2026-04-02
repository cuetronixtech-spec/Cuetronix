import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Users, Monitor, UserCheck, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Plan {
  id: string;
  name: string;
  slug: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  max_staff: number;
  max_stations: number;
  max_customers: number;
  features: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  price_monthly: "",
  price_annual: "",
  currency: "INR",
  max_staff: "5",
  max_stations: "5",
  max_customers: "500",
  features: "",
  is_active: true,
  display_order: "0",
};

export default function SAPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("sa_list_plans");
    if (error) setError(error.message);
    else setPlans((data as Plan[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price_monthly: p.price_monthly.toString(),
      price_annual: p.price_annual.toString(),
      currency: p.currency,
      max_staff: p.max_staff.toString(),
      max_stations: p.max_stations.toString(),
      max_customers: p.max_customers.toString(),
      features: Array.isArray(p.features) ? p.features.join(", ") : "",
      is_active: p.is_active,
      display_order: p.display_order?.toString() ?? "0",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    setSaving(true);
    const features = form.features.split(",").map((f) => f.trim()).filter(Boolean);
    const { error } = await supabase.rpc("sa_upsert_plan", {
      p_name:          form.name.trim(),
      p_price_monthly: parseFloat(form.price_monthly) || 0,
      p_price_annual:  parseFloat(form.price_annual) || 0,
      p_currency:      form.currency,
      p_max_staff:     parseInt(form.max_staff) || 5,
      p_max_stations:  parseInt(form.max_stations) || 5,
      p_max_customers: parseInt(form.max_customers) || 500,
      p_features:      features,
      p_is_active:     form.is_active,
      p_display_order: parseInt(form.display_order) || 0,
      p_id:            editingId ?? undefined,
    });
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(editingId ? "Plan updated" : "Plan created");
      setDialogOpen(false);
      load();
    }
    setSaving(false);
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.rpc("sa_delete_plan", { p_plan_id: id });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success("Plan deleted");
      setPlans((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const field = (key: keyof typeof EMPTY_FORM) =>
    typeof form[key] === "string"
      ? { value: form[key] as string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })) }
      : {};

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage pricing plans for clubs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />New Plan
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 w-full" />)}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Plus className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No plans yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first subscription plan</p>
            <Button className="mt-4" size="sm" onClick={openCreate}>Create Plan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className={`border-border/50 relative ${!p.is_active ? "opacity-60" : ""}`}>
              {!p.is_active && (
                <div className="absolute top-3 right-3">
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                    Inactive
                  </span>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {p.currency === "INR" ? "₹" : p.currency}{p.price_monthly.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                {p.price_annual > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {p.currency === "INR" ? "₹" : p.currency}{p.price_annual.toLocaleString()}/year
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <Users className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-medium text-foreground">{p.max_staff}</p>
                    <p className="text-muted-foreground">Staff</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <Monitor className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-medium text-foreground">{p.max_stations}</p>
                    <p className="text-muted-foreground">Stations</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <UserCheck className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-medium text-foreground">{p.max_customers}</p>
                    <p className="text-muted-foreground">Customers</p>
                  </div>
                </div>

                {Array.isArray(p.features) && p.features.length > 0 && (
                  <ul className="space-y-1">
                    {p.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                    {p.features.length > 4 && (
                      <li className="text-xs text-muted-foreground">+{p.features.length - 4} more</li>
                    )}
                  </ul>
                )}

                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(p.created_at), "dd MMM yyyy")}
                </p>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes the plan. Existing subscribers won't be affected but new signups won't see it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deletePlan(p.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Plan Name *</Label>
                <Input placeholder="e.g. Starter" {...field("name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Price</Label>
                <Input type="number" placeholder="1499" {...field("price_monthly")} />
              </div>
              <div className="space-y-1.5">
                <Label>Annual Price</Label>
                <Input type="number" placeholder="14999" {...field("price_annual")} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input placeholder="INR" {...field("currency")} />
              </div>
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" placeholder="0" {...field("display_order")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Staff</Label>
                <Input type="number" {...field("max_staff")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Stations</Label>
                <Input type="number" {...field("max_stations")} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Max Customers</Label>
                <Input type="number" {...field("max_customers")} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Features <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input placeholder="Tournaments, Bookings, AI Assistant" {...field("features")} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label>Active (visible to new signups)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
