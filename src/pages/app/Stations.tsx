import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

type Station = {
  id: string;
  name: string;
  type: string;
  rate_per_hour: number;
  description: string | null;
  is_active: boolean;
  is_occupied: boolean;
  display_order: number;
};

const TYPES = ["snooker", "pool", "gaming", "darts", "bowling", "other"];

const blank = () => ({ name: "", type: "snooker", rate_per_hour: "", description: "", is_active: true });

export default function Stations() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("stations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("display_order")
      .order("created_at");
    if (error) toast.error(error.message);
    setStations(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEditing(null); setForm(blank()); setOpen(true); };
  const openEdit = (s: Station) => {
    setEditing(s);
    setForm({ name: s.name, type: s.type, rate_per_hour: String(s.rate_per_hour), description: s.description || "", is_active: s.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !tenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      type: form.type,
      rate_per_hour: parseFloat(form.rate_per_hour) || 0,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("stations").update(payload).eq("id", editing.id)
      : await supabase.from("stations").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editing ? "Station updated" : "Station added");
    setOpen(false);
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this station?")) return;
    const { error } = await supabase.from("stations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Station deleted");
    load();
  };

  const toggleOccupied = async (s: Station) => {
    await supabase.from("stations").update({ is_occupied: !s.is_occupied }).eq("id", s.id);
    setStations(prev => prev.map(st => st.id === s.id ? { ...st, is_occupied: !st.is_occupied } : st));
  };

  const getStatus = (s: Station) => {
    if (!s.is_active) return { label: "Inactive", cls: "bg-gray-100 text-gray-600" };
    if (s.is_occupied) return { label: "Occupied", cls: "bg-red-100 text-red-700" };
    return { label: "Available", cls: "bg-green-100 text-green-700" };
  };

  return (
    <div>
      <PageHeader
        title="Stations"
        description="Manage your tables and gaming stations"
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Station</Button>}
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-base">No stations yet.</p>
          <p className="text-sm mt-1">Add your first station to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stations.map(s => {
            const status = getStatus(s);
            return (
              <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base leading-tight">{s.name}</CardTitle>
                    <Badge className={`${status.cls} shrink-0 text-xs`}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm text-muted-foreground capitalize">{s.type}</p>
                  <p className="text-sm font-semibold">{config?.currency_symbol || "₹"}{s.rate_per_hour}/hr</p>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                  <div className="flex gap-2 pt-2">
                    {s.is_active && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleOccupied(s)}>
                        <Zap className="h-3 w-3 mr-1" />
                        {s.is_occupied ? "Mark Free" : "Mark Busy"}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(s)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Station" : "Add Station"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Table 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rate per Hour ({config?.currency_symbol || "₹"})</Label>
              <Input type="number" min="0" step="0.5" value={form.rate_per_hour} onChange={e => setForm(f => ({ ...f, rate_per_hour: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add Station"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
