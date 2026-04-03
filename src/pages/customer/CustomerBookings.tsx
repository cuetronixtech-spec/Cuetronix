import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/hooks/useCustomerSession";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CalendarDays, Clock, MapPin, Ban, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  station_name: string;
  station_type: string | null;
  start_time: string;
  end_time: string;
  status: string;
  amount: number | null;
  booking_date: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  confirmed:  { label: "Confirmed",  className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  pending:    { label: "Pending",    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  active:     { label: "Active",     className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  completed:  { label: "Completed",  className: "bg-muted text-muted-foreground border-border" },
  cancelled:  { label: "Cancelled",  className: "bg-red-500/10 text-red-400 border-red-500/20" },
  no_show:    { label: "No Show",    className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

function fmt(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString("en-IN", opts);
}
function fmtDate(iso: string) {
  return fmt(iso, { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return fmt(iso, { hour: "2-digit", minute: "2-digit" });
}
function duration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─── Quick date filter pills ──────────────────────────────────────────────────

type DatePreset = "all" | "today" | "week" | "month" | "custom";

function isInRange(iso: string, preset: DatePreset, from: string, to: string): boolean {
  if (preset === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (preset === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (preset === "week") {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }
  if (preset === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (preset === "custom" && from && to) {
    return d >= new Date(from) && d <= new Date(to + "T23:59:59");
  }
  return true;
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel?: (id: string) => void }) {
  const badge = STATUS_BADGE[booking.status] ?? STATUS_BADGE.pending;
  const canCancel = booking.status === "confirmed" || booking.status === "pending";
  const upcoming = new Date(booking.start_time) > new Date();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-semibold text-foreground">{booking.station_name}</span>
              {booking.station_type && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {booking.station_type}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {fmtDate(booking.booking_date || booking.start_time)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {fmtTime(booking.start_time)} – {fmtTime(booking.end_time)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {duration(booking.start_time, booking.end_time)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge variant="outline" className={`text-xs ${badge.className}`}>{badge.label}</Badge>
            {booking.amount != null && (
              <span className="text-sm font-semibold text-foreground">
                ₹{booking.amount.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
        {canCancel && upcoming && onCancel && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={() => onCancel(booking.id)}
            >
              <Ban className="h-3 w-3" /> Cancel booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerBookings() {
  const session = getCustomerSession();
  const customerId = session?.id;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [tab, setTab] = useState("upcoming");

  const load = async () => {
    if (!customerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, station_name, station_type, start_time, end_time, status, amount, booking_date")
      .eq("customer_id", customerId)
      .order("start_time", { ascending: false });
    if (error) toast.error(error.message);
    setBookings((data || []) as Booking[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", cancelId)
      .eq("customer_id", customerId);
    setCancelling(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Booking cancelled");
    setCancelId(null);
    load();
  };

  const now = new Date();

  const filter = (list: Booking[]) =>
    list.filter(b => {
      const matchSearch = !search ||
        b.station_name.toLowerCase().includes(search.toLowerCase()) ||
        (b.station_type || "").toLowerCase().includes(search.toLowerCase());
      const matchDate = isInRange(b.start_time, datePreset, dateFrom, dateTo);
      return matchSearch && matchDate;
    });

  const upcoming = filter(bookings.filter(b =>
    (b.status === "confirmed" || b.status === "pending" || b.status === "active") && new Date(b.start_time) >= now
  ));
  const past = filter(bookings.filter(b => b.status === "completed" || new Date(b.end_time) < now && b.status !== "cancelled"));
  const cancelled = filter(bookings.filter(b => b.status === "cancelled"));

  const DATE_PRESETS: { key: DatePreset; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "custom", label: "Custom" },
  ];

  const counts = { upcoming: upcoming.length, past: past.length, cancelled: cancelled.length };

  return (
    <div className="space-y-5">
      <PageHeader title="My Bookings" description="View and manage your reservations" />

      {/* Search + date filters */}
      <div className="space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search station…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                datePreset === p.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === "custom" && (
          <div className="flex gap-2 items-center">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming {counts.upcoming > 0 && <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{counts.upcoming}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        {["upcoming", "past", "cancelled"].map(t => {
          const list = t === "upcoming" ? upcoming : t === "past" ? past : cancelled;
          return (
            <TabsContent key={t} value={t} className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {t === "upcoming" ? "No upcoming bookings" : t === "past" ? "No past sessions yet" : "No cancelled bookings"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {list.map(b => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onCancel={t === "upcoming" ? setCancelId : undefined}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Cancel confirm dialog */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep booking</Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
