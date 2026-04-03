import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Gamepad2, Circle, Target, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import StationCard, { TYPE_CONFIG } from "@/components/StationCard";

// ── Types ──────────────────────────────────────────────────────────────────

type Station = {
  id: string; name: string; type: string; rate_per_hour: number;
  description: string | null; is_active: boolean; is_occupied: boolean;
  display_order: number; event_enabled?: boolean;
};

type Customer = { id: string; name: string; phone: string | null; membership_type: string };

type Session = {
  id: string; station_id: string; customer_id: string | null;
  started_at: string; rate_per_hour: number | null; coupon_code?: string | null;
};

const STATION_TYPES = ["snooker", "pool", "gaming", "darts", "bowling", "other"] as const;
type StationType = typeof STATION_TYPES[number];

const blank = () => ({ name: "", type: "gaming" as StationType, rate_per_hour: "", description: "", is_active: true });

// ── Stat Card icons per type ───────────────────────────────────────────────

const STAT_ICONS: Record<string, React.ElementType> = {
  gaming: Gamepad2, pool: Circle, snooker: Circle, darts: Target, bowling: Trophy, other: Zap,
};

const STAT_GRADIENTS: Record<string, string> = {
  purple: "from-purple-600 to-purple-700",
  green:  "from-green-600 to-green-700",
  blue:   "from-blue-600 to-cyan-700",
  orange: "from-orange-600 to-orange-700",
  cyan:   "from-cyan-600 to-blue-700",
};

// Sort stations by numeric suffix in name (e.g. "PS5 3" before "PS5 10")
function sortByNameNum(arr: Station[]): Station[] {
  return [...arr].sort((a, b) => {
    const na = parseInt(a.name.match(/\d+/)?.[0] || "0");
    const nb = parseInt(b.name.match(/\d+/)?.[0] || "0");
    return na !== nb ? na - nb : a.name.localeCompare(b.name);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Stations() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [stations, setStations] = useState<Station[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  // ── Data loading ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [stRes, cuRes, sessRes] = await Promise.all([
      supabase.from("stations").select("*").eq("tenant_id", tenantId).order("display_order").order("created_at"),
      supabase.from("customers").select("id,name,phone,membership_type").eq("tenant_id", tenantId).order("name"),
      supabase.from("sessions").select("id,station_id,customer_id,started_at,rate_per_hour,coupon_code").eq("tenant_id", tenantId).eq("status", "active"),
    ]);
    if (stRes.error) toast.error(stRes.error.message);
    if (cuRes.error) toast.error(cuRes.error.message);
    setStations((stRes.data || []) as Station[]);
    setCustomers((cuRes.data || []) as Customer[]);
    setActiveSessions((sessRes.data || []) as Session[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // ── Add station ───────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!form.name.trim() || !tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("stations").insert({
      tenant_id: tenantId, name: form.name.trim(), type: form.type,
      rate_per_hour: parseFloat(form.rate_per_hour) || 0,
      description: form.description.trim() || null, is_active: form.is_active,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Station added");
    setAddOpen(false);
    setForm(blank());
    setSaving(false);
    load();
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  // Group stations by type (only types that have stations)
  const stationTypes = [...new Set(stations.map(s => s.type))];

  const sessionMap = Object.fromEntries(activeSessions.map(s => [s.station_id, s]));
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <PageHeader title="Gaming Stations" description="Manage your stations and sessions" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent">
            Gaming Stations
          </span>
        }
        description="Manage your stations and live sessions"
        actions={
          <Button onClick={() => { setForm(blank()); setAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Station
          </Button>
        }
      />

      {/* ── Summary Stat Cards ─────────────────────────────────────────────── */}
      {stationTypes.length > 0 && (
        <div className={`grid gap-4 ${stationTypes.length === 1 ? "grid-cols-1 max-w-xs" : stationTypes.length === 2 ? "grid-cols-2 max-w-md" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"}`}>
          {stationTypes.map(type => {
            const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other;
            const all = stations.filter(s => s.type === type);
            const active = all.filter(s => s.is_occupied).length;
            const Icon = STAT_ICONS[type] || Zap;
            const gradient = STAT_GRADIENTS[cfg.colorScheme] || STAT_GRADIENTS.cyan;
            return (
              <div key={type} className={`rounded-xl p-4 text-white bg-gradient-to-br ${gradient} shadow-lg`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{cfg.shortLabel}</p>
                    <p className="text-3xl font-bold mt-1">{active}<span className="text-lg font-normal text-white/70"> / {all.length}</span></p>
                    <p className="text-white/70 text-xs mt-0.5">Active stations</p>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Station Sections ───────────────────────────────────────────────── */}
      {stations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">No stations yet</p>
          <p className="text-sm mt-1">Add your first station to get started</p>
        </div>
      ) : (
        stationTypes.map(type => {
          const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other;
          const Icon = STAT_ICONS[type] || Zap;
          const typeStations = sortByNameNum(stations.filter(s => s.type === type));
          const activeCount = typeStations.filter(s => s.is_occupied).length;
          let cardIdx = 0;

          return (
            <div key={type} className="space-y-4">
              {/* Section header */}
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{cfg.label}</h2>
                {activeCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {activeCount} active
                  </Badge>
                )}
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Station grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {typeStations.map(station => {
                  const delay = (cardIdx++) * 100;
                  const session = sessionMap[station.id] || null;
                  const customer = session?.customer_id ? (customerMap[session.customer_id] || null) : null;
                  return (
                    <StationCard
                      key={station.id}
                      station={station}
                      session={session}
                      customer={customer}
                      customers={customers}
                      tenantId={tenantId || ""}
                      sym={sym}
                      animDelay={delay}
                      onRefresh={load}
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* ── Add Station Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Station</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PS5 Station 1" className="mt-1.5" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as StationType }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate per Hour ({sym})</Label>
              <Input type="number" min="0" step="0.5" value={form.rate_per_hour} onChange={e => setForm(f => ({ ...f, rate_per_hour: e.target.value }))} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Add Station"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
