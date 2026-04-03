import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/hooks/useCustomerSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, Zap, Trophy, TrendingUp, CalendarDays, Tag,
  Activity, Clock, ChevronRight, Gamepad2, Award,
  DollarSign, Users, Flame,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  upcomingBookings: number;
  totalSpend: number;
  loyaltyPoints: number;
  visitCount: number;
  rank: number | null;
  totalCustomers: number;
};

// Bookings table: booking_date DATE, start_time TIME, end_time TIME
type Booking = {
  id: string;
  booking_date: string;          // "2026-04-03"
  start_time: string;            // "14:00:00"
  end_time: string;              // "15:30:00"
  status: string;
  amount: number | null;
  stations?: { name: string; type: string } | null;
};

type Offer = {
  id: string;
  title: string;
  type: string;
  value: number | null;
  valid_until: string | null;
  is_used: boolean;
};

type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  earned: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Combine a DATE string and a TIME string into a JS Date */
function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

function fmtTimeStr(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const display = hour % 12 || 12;
  return `${display}:${m}${ampm}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function durationLabel(start: string, end: string): string {
  const s = new Date(`2000-01-01T${start}`);
  const e = new Date(`2000-01-01T${end}`);
  const mins = Math.round((e.getTime() - s.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function computeAchievements(bookings: Booking[], totalSpend: number, visitCount: number): Achievement[] {
  return [
    { id: "first_booking", label: "First Booking",    description: "Made your first reservation", icon: Gamepad2, color: "text-blue-400",   earned: visitCount >= 1 },
    { id: "5_sessions",    label: "Regular Player",   description: "Completed 5 sessions",         icon: Flame,    color: "text-orange-400", earned: visitCount >= 5 },
    { id: "10_sessions",   label: "10 Sessions",      description: "Completed 10 sessions",        icon: Trophy,   color: "text-purple-400", earned: visitCount >= 10 },
    { id: "vip_spender",   label: "VIP Spender",      description: `Spent ${fmtCurrency(5000)}+`,  icon: Star,     color: "text-yellow-400", earned: totalSpend >= 5000 },
    { id: "loyal_fan",     label: "Loyal Fan",        description: "20+ visits",                   icon: Clock,    color: "text-emerald-400", earned: visitCount >= 20 },
    { id: "high_roller",   label: "High Roller",      description: `Spent ${fmtCurrency(20000)}+`, icon: Award,    color: "text-pink-400",   earned: totalSpend >= 20000 },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const session = getCustomerSession();
  const customerId = session?.id;

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    const load = async () => {
      setLoading(true);
      try {
        // Customer row — fresh loyalty, spend, visit_count
        const { data: customer } = await supabase
          .from("customers")
          .select("loyalty_points, total_spend, visit_count, membership_type")
          .eq("id", customerId)
          .maybeSingle();

        const totalSpend = (customer as Record<string, unknown> | null)?.total_spend as number ?? 0;
        const loyaltyPoints = (customer as Record<string, unknown> | null)?.loyalty_points as number ?? session?.loyaltyPoints ?? 0;
        const visitCount = (customer as Record<string, unknown> | null)?.visit_count as number ?? 0;

        // Bookings: join station for name/type
        const today = new Date().toISOString().split("T")[0];
        const { data: bookings, error: bErr } = await supabase
          .from("bookings")
          .select("id, booking_date, start_time, end_time, status, amount, stations(name, type)")
          .eq("customer_id", customerId)
          .order("booking_date", { ascending: false })
          .order("start_time", { ascending: false })
          .limit(50);

        if (bErr) toast.error(bErr.message);
        const bList = (bookings || []) as unknown as Booking[];

        // Detect active booking: booking_date = today AND current time is within start_time..end_time
        const nowTime = new Date();
        const active = bList.find(b => {
          if (b.booking_date !== today) return false;
          if (b.status !== "confirmed" && b.status !== "checked_in") return false;
          const start = combineDateAndTime(b.booking_date, b.start_time);
          const end   = combineDateAndTime(b.booking_date, b.end_time);
          return start <= nowTime && nowTime <= end;
        }) ?? null;
        setActiveBooking(active);

        // Upcoming count (future bookings)
        const upcoming = bList.filter(b => {
          const start = combineDateAndTime(b.booking_date, b.start_time);
          return (b.status === "confirmed" || b.status === "pending") && start > nowTime;
        });

        // Recent completed
        setRecentBookings(bList.filter(b => b.status === "completed").slice(0, 4));

        // Rank by total_spend
        let rank: number | null = null;
        let totalCustomers = 0;
        if (session?.tenantId) {
          const [{ count: above }, { count: total }] = await Promise.all([
            supabase.from("customers").select("id", { count: "exact", head: true })
              .eq("tenant_id", session.tenantId).gt("total_spend", totalSpend),
            supabase.from("customers").select("id", { count: "exact", head: true })
              .eq("tenant_id", session.tenantId),
          ]);
          rank = (above ?? 0) + 1;
          totalCustomers = total ?? 0;
        }

        setStats({ upcomingBookings: upcoming.length, totalSpend, loyaltyPoints, visitCount, rank, totalCustomers });

        // Active offers (not yet used)
        const { data: offerRows } = await supabase
          .from("customer_offer_assignments")
          .select("id, is_used, used_at, customer_offers(id, title, type, value, valid_until)")
          .eq("customer_id", customerId)
          .eq("is_used", false)
          .limit(3);

        const offerList: Offer[] = ((offerRows || []) as unknown as Record<string, unknown>[]).map(r => {
          const co = r.customer_offers as Record<string, unknown>;
          return {
            id: r.id as string,
            title: co?.title as string ?? "Offer",
            type: co?.type as string ?? "",
            value: co?.value as number | null ?? null,
            valid_until: co?.valid_until as string | null ?? null,
            is_used: r.is_used as boolean,
          };
        });
        setOffers(offerList);
      } finally {
        setLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const achievements = computeAchievements(recentBookings, stats?.totalSpend ?? 0, stats?.visitCount ?? 0);
  const earnedCount = achievements.filter(a => a.earned).length;
  const rankLabel = stats?.rank && stats?.totalCustomers ? `#${stats.rank} of ${stats.totalCustomers}` : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Welcome back, {session?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here's your activity at a glance</p>
      </div>

      {/* Active session indicator */}
      {activeBooking && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-400">You're currently playing!</p>
            <p className="text-xs text-muted-foreground">
              {activeBooking.stations?.name ?? "Station"} · {fmtTimeStr(activeBooking.start_time)} – {fmtTimeStr(activeBooking.end_time)}
            </p>
          </div>
          <Activity className="h-5 w-5 text-emerald-400 flex-shrink-0" />
        </div>
      )}

      {/* Stats strip */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={CalendarDays} label="Upcoming"     value={String(stats?.upcomingBookings ?? 0)} sub="bookings"        color="text-blue-400" />
          <StatCard icon={DollarSign}   label="Total Spent"  value={fmtCurrency(stats?.totalSpend ?? 0)}  sub="all time"        color="text-emerald-400" />
          <StatCard icon={Star}         label="Loyalty Pts"  value={String(stats?.loyaltyPoints ?? 0)}    sub="₹1 per point"    color="text-yellow-400" />
          <StatCard icon={TrendingUp}   label="Your Rank"    value={rankLabel}                            sub="by total spend"  color="text-purple-400" />
        </div>
      )}

      {/* Recent + Offers */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
            <Link to="/customer/bookings">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {recentBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.stations?.name ?? "Station"}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(b.booking_date)} · {fmtTimeStr(b.start_time)}–{fmtTimeStr(b.end_time)}
                        {" · "}{durationLabel(b.start_time, b.end_time)}
                      </p>
                    </div>
                    {b.amount != null && (
                      <span className="text-sm font-semibold text-foreground ml-2 flex-shrink-0">
                        {fmtCurrency(b.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Active Offers
              {offers.length > 0 && <Badge variant="secondary" className="h-5 text-xs">{offers.length}</Badge>}
            </CardTitle>
            <Link to="/customer/offers">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : offers.length === 0 ? (
              <div className="text-center py-4">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active offers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {offers.map(o => (
                  <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{o.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.value != null ? `Value: ${o.value}` : ""}
                        {o.valid_until ? ` · Until ${fmtDate(o.valid_until)}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Achievements
            <Badge variant="outline" className="h-5 text-xs">{earnedCount}/{achievements.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-opacity ${
                  a.earned ? "border-border bg-muted/30" : "border-border/40 bg-muted/10 opacity-40"}`}>
                  <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${a.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{a.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visit pattern breakdown */}
      {!loading && (stats?.visitCount ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Visit Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.visitCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total visits</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{fmtCurrency(stats?.totalSpend ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Lifetime spend</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.loyaltyPoints ?? 0}</p>
                <p className="text-xs text-muted-foreground">Loyalty pts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
