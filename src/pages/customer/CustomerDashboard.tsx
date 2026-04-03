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
  rank: number | null;
  totalCustomers: number;
};

type Booking = {
  id: string;
  station_name: string;
  station_type: string;
  start_time: string;
  end_time: string;
  status: string;
  amount: number | null;
  booking_date: string;
};

type Offer = {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  value: number;
  expiry_date: string | null;
  promo_code: string | null;
  status: string;
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}
function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function computeAchievements(bookings: Booking[], totalSpend: number): Achievement[] {
  const completedCount = bookings.filter(b => b.status === "completed").length;
  const totalMinutes = bookings.filter(b => b.status === "completed").reduce((acc, b) => {
    if (!b.start_time || !b.end_time) return acc;
    return acc + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000;
  }, 0);

  return [
    {
      id: "first_booking",
      label: "First Booking",
      description: "Made your first reservation",
      icon: Gamepad2,
      color: "text-blue-400",
      earned: completedCount >= 1,
    },
    {
      id: "ten_hour_club",
      label: "10-Hour Club",
      description: "Played for 10+ total hours",
      icon: Clock,
      color: "text-emerald-400",
      earned: totalMinutes >= 600,
    },
    {
      id: "regular",
      label: "Regular Player",
      description: "Completed 5 sessions",
      icon: Flame,
      color: "text-orange-400",
      earned: completedCount >= 5,
    },
    {
      id: "vip_spender",
      label: "VIP Spender",
      description: `Spent ${fmtCurrency(5000)}+`,
      icon: Star,
      color: "text-yellow-400",
      earned: totalSpend >= 5000,
    },
    {
      id: "loyal_fan",
      label: "Loyal Fan",
      description: "Completed 10 sessions",
      icon: Trophy,
      color: "text-purple-400",
      earned: completedCount >= 10,
    },
    {
      id: "high_roller",
      label: "High Roller",
      description: `Spent ${fmtCurrency(20000)}+`,
      icon: Award,
      color: "text-pink-400",
      earned: totalSpend >= 20000,
    },
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
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    const load = async () => {
      setLoading(true);
      try {
        // Load customer row for fresh loyalty + spend
        const { data: customer } = await supabase
          .from("customers")
          .select("loyalty_points, total_spent")
          .eq("id", customerId)
          .maybeSingle();

        // Load all bookings for this customer
        const { data: bookings, error: bErr } = await supabase
          .from("bookings")
          .select("id, station_name, station_type, start_time, end_time, status, amount, booking_date")
          .eq("customer_id", customerId)
          .order("start_time", { ascending: false });
        if (bErr) toast.error(bErr.message);
        const bList = (bookings || []) as Booking[];
        setAllBookings(bList);

        // Detect active session (booking whose window overlaps right now)
        const now = new Date();
        const active = bList.find(b => {
          if (b.status !== "confirmed" && b.status !== "active") return false;
          const start = new Date(b.start_time);
          const end = new Date(b.end_time);
          return start <= now && now <= end;
        }) ?? null;
        setActiveBooking(active);

        // Upcoming count
        const upcomingCount = bList.filter(b => {
          return (b.status === "confirmed" || b.status === "pending") && new Date(b.start_time) > now;
        }).length;

        // Total spend (exclude complimentary)
        const totalSpend = (customer?.total_spent as number | null) ?? 0;

        // Rank
        let rank: number | null = null;
        let totalCustomers = 0;
        if (session?.tenantId) {
          const { count } = await supabase
            .from("customers")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", session.tenantId)
            .gt("total_spent", totalSpend);
          rank = (count ?? 0) + 1;

          const { count: total } = await supabase
            .from("customers")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", session.tenantId);
          totalCustomers = total ?? 0;
        }

        setStats({
          upcomingBookings: upcomingCount,
          totalSpend,
          loyaltyPoints: (customer?.loyalty_points as number | null) ?? session?.loyaltyPoints ?? 0,
          rank,
          totalCustomers,
        });

        // Active offers (assigned or viewed)
        const { data: offerRows } = await supabase
          .from("customer_offer_assignments")
          .select("id, status, promo_code, customer_offers(id, title, description, offer_type, value, expiry_date)")
          .eq("customer_id", customerId)
          .in("status", ["assigned", "viewed"])
          .order("assigned_at", { ascending: false })
          .limit(3);

        const offerList: Offer[] = (offerRows || []).map((r: Record<string, unknown>) => {
          const co = r.customer_offers as Record<string, unknown>;
          return {
            id: r.id as string,
            title: co?.title as string ?? "Offer",
            description: co?.description as string | null ?? null,
            offer_type: co?.offer_type as string ?? "",
            value: co?.value as number ?? 0,
            expiry_date: co?.expiry_date as string | null ?? null,
            promo_code: r.promo_code as string | null ?? null,
            status: r.status as string,
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

  const recentCompleted = allBookings.filter(b => b.status === "completed").slice(0, 4);
  const achievements = computeAchievements(allBookings, stats?.totalSpend ?? 0);
  const earnedCount = achievements.filter(a => a.earned).length;

  const rankLabel = stats?.rank && stats?.totalCustomers
    ? `#${stats.rank} of ${stats.totalCustomers}`
    : "—";

  return (
    <div className="space-y-6">
      {/* Welcome */}
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
              {activeBooking.station_name} · {fmtTime(activeBooking.start_time)} – {fmtTime(activeBooking.end_time)}
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
          <StatCard icon={CalendarDays} label="Upcoming" value={String(stats?.upcomingBookings ?? 0)} sub="bookings" color="text-blue-400" />
          <StatCard icon={DollarSign} label="Total Spent" value={fmtCurrency(stats?.totalSpend ?? 0)} sub="all time" color="text-emerald-400" />
          <StatCard icon={Star} label="Loyalty Pts" value={String(stats?.loyaltyPoints ?? 0)} sub="₹1 per point" color="text-yellow-400" />
          <StatCard icon={TrendingUp} label="Your Rank" value={rankLabel} sub="by total spend" color="text-purple-400" />
        </div>
      )}

      {/* Recent bookings + Offers row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent completed */}
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
            ) : recentCompleted.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {recentCompleted.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.station_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(b.booking_date || b.start_time)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
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

        {/* Offers snippet */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Active Offers
              {offers.length > 0 && (
                <Badge variant="secondary" className="h-5 text-xs">{offers.length}</Badge>
              )}
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
                        {o.offer_type === "percentage_discount" ? `${o.value}% off` :
                          o.offer_type === "flat_discount" ? `₹${o.value} off` :
                          o.offer_type === "free_hours" ? `${o.value}h free` : o.offer_type}
                        {o.expiry_date ? ` · Expires ${fmtDate(o.expiry_date)}` : ""}
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
                <div
                  key={a.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-opacity ${
                    a.earned
                      ? "border-border bg-muted/30"
                      : "border-border/40 bg-muted/10 opacity-40"
                  }`}
                >
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

      {/* Activity breakdown (day-of-week) */}
      {!loading && allBookings.filter(b => b.status === "completed").length > 0 && (
        <ActivityBreakdown bookings={allBookings.filter(b => b.status === "completed")} />
      )}
    </div>
  );
}

// ─── Activity Breakdown ───────────────────────────────────────────────────────

function ActivityBreakdown({ bookings }: { bookings: Booking[] }) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SLOTS = [
    { label: "Morning", range: "6am–12pm", test: (h: number) => h >= 6 && h < 12 },
    { label: "Afternoon", range: "12pm–6pm", test: (h: number) => h >= 12 && h < 18 },
    { label: "Evening", range: "6pm–12am", test: (h: number) => h >= 18 || h < 6 },
  ];

  const dayCounts = Array(7).fill(0);
  bookings.forEach(b => { dayCounts[new Date(b.start_time).getDay()]++; });
  const maxDay = Math.max(...dayCounts, 1);

  const slotCounts = SLOTS.map(s => ({
    ...s,
    count: bookings.filter(b => s.test(new Date(b.start_time).getHours())).length,
  }));
  const maxSlot = Math.max(...slotCounts.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Activity Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Day of week */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Most active days</p>
          <div className="flex gap-1 items-end h-12">
            {DAYS.map((d, i) => (
              <div key={d} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-primary/70"
                  style={{ height: `${(dayCounts[i] / maxDay) * 40 + 2}px` }}
                />
                <span className="text-[9px] text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Preferred time slots</p>
          <div className="space-y-1.5">
            {slotCounts.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs w-20 text-muted-foreground shrink-0">{s.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(s.count / maxSlot) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
