import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_inr: number | null;
  price_usd: number | null;
  max_stations: number | null;
  max_staff: number | null;
  features: Record<string, boolean>;
  is_active: boolean;
}

const defaultFeatures = {
  tournaments: false, expenses: false, cash_management: false,
  investors: false, ai_assistant: false, custom_domain: false,
  api_access: false, white_label: false, priority_support: false,
};

const SAPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", price_inr: "", price_usd: "", max_stations: "", max_staff: "", features: { ...defaultFeatures } });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("subscription_plans").select("*").order("price_inr");
    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", price_inr: "", price_usd: "", max_stations: "", max_staff: "", features: { ...defaultFeatures } });
    setOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug,
      price_inr: String(p.price_inr ?? ""), price_usd: String(p.price_usd ?? ""),
      max_stations: String(p.max_stations ?? ""), max_staff: String(p.max_staff ?? ""),
      features: { ...defaultFeatures, ...(p.features as Record<string, boolean>) },
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name: form.name, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
      price_inr: form.price_inr ? Number(form.price_inr) : null,
      price_usd: form.price_usd ? Number(form.price_usd) : null,
      max_stations: form.max_stations ? Number(form.max_stations) : null,
      max_staff: form.max_staff ? Number(form.max_staff) : null,
      features: form.features,
    };
    const { error } = editing
      ? await supabase.from("subscription_plans").update(payload).eq("id", editing.id)
      : await supabase.from("subscription_plans").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Plan updated" : "Plan created"); setOpen(false); load(); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    await supabase.from("subscription_plans").delete().eq("id", id);
    load();
  };

  const featureLabels: Record<string, string> = {
    tournaments: "Tournaments", expenses: "Expenses", cash_management: "Cash Mgmt",
    investors: "Investors", ai_assistant: "AI Assistant", custom_domain: "Custom Domain",
    api_access: "API Access", white_label: "White Label", priority_support: "Priority Support",
  };

  return (
    <div>
      <PageHeader title="Subscription Plans" description="Manage platform pricing plans"
        action={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Plan</Button>} />

      {loading ? <p className="text-muted-foreground py-8 text-sm">Loading…</p> : (
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className={`border-border/50 ${!plan.is_active ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">/{plan.slug}</p>
                  </div>
                  <Badge variant="outline" className={plan.is_active ? "text-green-400 border-green-500/30" : "text-muted-foreground"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm"><span className="font-semibold">₹{plan.price_inr ?? "—"}</span><span className="text-muted-foreground text-xs">/mo</span></p>
                  {plan.price_usd && <p className="text-xs text-muted-foreground">${plan.price_usd}/mo</p>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Stations: {plan.max_stations ?? "∞"}</span>
                  <span>Staff: {plan.max_staff ?? "∞"}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(plan.features ?? {}).filter(([,v]) => v).map(([k]) => (
                    <Badge key={k} variant="outline" className="text-[10px] py-0"><Check className="h-2.5 w-2.5 mr-0.5" />{featureLabels[k] ?? k}</Badge>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deletePlan(plan.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && <p className="text-muted-foreground text-sm col-span-3">No plans yet. Create one above.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" /></div>
              <div className="space-y-1"><Label className="text-xs">Price (INR/mo)</Label><Input type="number" value={form.price_inr} onChange={e => setForm(f => ({ ...f, price_inr: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Price (USD/mo)</Label><Input type="number" value={form.price_usd} onChange={e => setForm(f => ({ ...f, price_usd: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Max Stations</Label><Input type="number" value={form.max_stations} onChange={e => setForm(f => ({ ...f, max_stations: e.target.value }))} placeholder="blank = ∞" /></div>
              <div className="space-y-1"><Label className="text-xs">Max Staff</Label><Input type="number" value={form.max_staff} onChange={e => setForm(f => ({ ...f, max_staff: e.target.value }))} placeholder="blank = ∞" /></div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Features</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.keys(defaultFeatures).map(k => (
                  <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={!!form.features[k as keyof typeof form.features]} onChange={e => setForm(f => ({ ...f, features: { ...f.features, [k]: e.target.checked } }))} className="accent-primary" />
                    {featureLabels[k]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SAPlans;
