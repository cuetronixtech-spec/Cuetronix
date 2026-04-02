import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { toast } from "sonner";

type Station = { id: string; name: string };
type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  amount: number;
  payment_status: string;
  stations?: { name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

const blank = () => ({
  customer_name: "", customer_phone: "", customer_email: "",
  station_id: "", booking_date: new Date().toISOString().split("T")[0],
  start_time: "10:00", end_time: "11:00", amount: "", notes: "",
});

export default function BookingManagement() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [bRes, sRes] = await Promise.all([
      supabase.from("bookings").select("*, stations(name)").eq("tenant_id", tenantId).order("booking_date", { ascending: false }).order("start_time"),
      supabase.from("stations").select("id, name").eq("tenant_id", tenantId).eq("is_active", true),
    ]);
    setBookings((bRes.data || []) as Booking[]);
    setStations(sRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toISOString().split("T")[0];
  const filtered = bookings.filter(b => {
    if (tab === "today") return b.booking_date === today;
    if (tab === "upcoming") return b.booking_date > today && !["cancelled", "completed"].includes(b.status);
    if (tab === "all") return true;
    return b.status === tab;
  });

  const save = async () => {
    if (!form.customer_name.trim() || !form.station_id || !tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      tenant_id: tenantId,
      station_id: form.station_id,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim() || "—",
      customer_email: form.customer_email.trim() || null,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      amount: parseFloat(form.amount) || 0,
      status: "confirmed",
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Booking created");
    setOpen(false);
    setSaving(false);
    setForm(blank());
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Booking ${status.replace("_", " ")}`);
    load();
  };

  const todayCount = bookings.filter(b => b.booking_date === today).length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
  const revenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div>
      <PageHeader
        title="Booking Management"
        description="Manage online and walk-in reservations"
        actions={<Button onClick={() => { setForm(blank()); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Booking</Button>}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Bookings</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{todayCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Confirmed Upcoming</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-500">{confirmedCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue from Bookings</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-500">{sym}{revenue.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No bookings found</TableCell></TableRow>
                ) : filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{(b as any).stations?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(b.booking_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{b.start_time} – {b.end_time}</TableCell>
                    <TableCell>{sym}{Number(b.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"}>{b.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {b.status === "confirmed" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => updateStatus(b.id, "checked_in")}>
                            <LogIn className="h-3 w-3" />
                          </Button>
                        )}
                        {["pending", "confirmed", "checked_in"].includes(b.status) && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => updateStatus(b.id, "completed")}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => updateStatus(b.id, "cancelled")}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div>
              <Label>Station *</Label>
              <Select value={form.station_id} onValueChange={v => setForm(f => ({ ...f, station_id: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>{stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Booking Date</Label><Input type="date" value={form.booking_date} onChange={e => setForm(f => ({ ...f, booking_date: e.target.value }))} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div><Label>Amount ({sym})</Label><Input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create Booking"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
