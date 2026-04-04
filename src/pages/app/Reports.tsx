import { useState, useMemo } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, Clock, CalendarDays,
  Download, Search, ChevronDown, Minus, BarChart3, Users, Sparkles,
} from "lucide-react";
import type { DateRange as DRP } from "react-day-picker";
import {
  useReports, presetToRange, DATE_PRESETS,
  type DatePreset, type DateRange, type Booking,
} from "@/hooks/useReports";
import { buildDailyFromForecastBills, computeBusinessInsights } from "@/lib/reports/predictionEngine";
import { BusinessInsightsWidget, SevenDayForecastChart } from "@/components/reports/BusinessInsightsWidget";
import {
  ReportsHourlyRevenue, GamingRevenueTargetCard, TopCustomersReport,
  CanteenProfitWidget, SummaryPaymentBar, BusinessSummaryCompact,
} from "@/components/reports/ReportsSummaryPanels";
import { ReportsKpiStrip } from "@/components/reports/ReportsKpiStrip";
import { ReportsBillsTab } from "@/components/reports/ReportsBillsTab";
import { ReportsCustomersTab } from "@/components/reports/ReportsCustomersTab";
import { ReportsSessionsTab } from "@/components/reports/ReportsSessionsTab";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function DeltaBadge({ current, prior }: { current: number; prior: number }) {
  const delta = pct(current, prior);
  if (delta === null) return null;
  const positive = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  card: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  online: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  upi: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  credit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  complimentary: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  split: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function PayBadge({ method }: { method: string }) {
  const cls = PAYMENT_COLORS[method.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-xs capitalize ${cls}`}>
      {method.replace(/_/g, " ")}
    </Badge>
  );
}

const STATUS_BOOKING: Record<string, string> = {
  pending:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  confirmed:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  checked_in: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed:  "bg-muted text-muted-foreground",
  cancelled:  "bg-red-500/10 text-red-400 border-red-500/20",
  no_show:    "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function fmtTimeStr(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m}${hr >= 12 ? "pm" : "am"}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, current, prior,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color: string; current: number; prior: number;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        <div className="mt-1.5">
          {prior > 0
            ? <DeltaBadge current={current} prior={prior} />
            : <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-2.5 w-2.5" /> prior period</span>
          }
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Date range selector ──────────────────────────────────────────────────────

function DateRangeSelector({
  preset, onPreset, range, onCustomRange,
}: {
  preset: DatePreset;
  onPreset: (p: DatePreset) => void;
  range: DateRange;
  onCustomRange: (r: DateRange) => void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const [calRange, setCalRange] = useState<DRP | undefined>({
    from: range.from, to: range.to,
  });

  const applyCustom = () => {
    if (calRange?.from && calRange?.to) {
      onCustomRange({ from: calRange.from, to: calRange.to });
      setCalOpen(false);
    }
  };

  const rangeLabel = preset === "custom"
    ? `${format(range.from, "dd MMM")} – ${format(range.to, "dd MMM yyyy")}`
    : DATE_PRESETS.find(p => p.key === preset)?.label ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      <div className="flex flex-wrap gap-1">
        {DATE_PRESETS.filter(p => p.key !== "custom").map(p => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              preset === p.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date picker */}
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 gap-1.5 text-xs ${preset === "custom" ? "border-primary text-primary" : ""}`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {preset === "custom" ? rangeLabel : "Custom"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={calRange}
            onSelect={setCalRange}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button variant="ghost" size="sm" onClick={() => setCalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={applyCustom} disabled={!calRange?.from || !calRange?.to}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

function BookingsTab({ bookings, loading, sym, onExport }: {
  bookings: Booking[]; loading: boolean; sym: string; onExport: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.customer_name.toLowerCase().includes(q) ||
      b.customer_phone.includes(q) ||
      (b.stations?.name ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = bookings.length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;
  const completed = bookings.filter(b => b.status === "completed").length;
  const revenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.amount ?? 0), 0);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Booking KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Bookings",    value: total,                                color: "text-blue-400" },
          { label: "Cancellation Rate", value: `${total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0}%`, color: "text-red-400" },
          { label: "Completion Rate",   value: `${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%`, color: "text-emerald-400" },
          { label: "Booking Revenue",   value: `${sym}${revenue.toLocaleString("en-IN")}`, color: "text-purple-400" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Customer, phone, station…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-52" />
        </div>
        <div className="flex gap-1">
          {["all", "pending", "confirmed", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 ml-auto" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No bookings in this period</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Time Slot</TableHead>
                <TableHead className="text-xs">Station</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm">
                    {new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtTimeStr(b.start_time)} – {fmtTimeStr(b.end_time)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{b.stations?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div>{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{b.customer_email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_BOOKING[b.status] ?? "text-muted-foreground"}`}>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {b.gateway_order_id ? "Online / gateway" : b.payment_mode === "online" ? "Online" : "Venue"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {sym}{Number(b.amount ?? 0).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Daily Revenue Tab ────────────────────────────────────────────────────────

function DailyRevenueTab({ trend, sym, loading, bucketHint }: {
  trend: { label: string; revenue: number; bills: number; key: string }[];
  sym: string;
  loading: boolean;
  bucketHint: string;
}) {
  if (loading) return <Skeleton className="h-64" />;
  if (!trend.length) return <p className="text-center py-12 text-muted-foreground">No data for this period</p>;

  const total = trend.reduce((s, d) => s + d.revenue, 0);
  const peak = trend.reduce((m, d) => d.revenue > m.revenue ? d : m, trend[0]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{bucketHint}</p>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-400">{sym}{total.toLocaleString("en-IN")}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Peak bucket</p>
          <p className="text-xl font-bold text-foreground">{peak.label}</p>
          <p className="text-xs text-emerald-400">{sym}{peak.revenue.toLocaleString("en-IN")}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Avg per bucket</p>
          <p className="text-xl font-bold text-foreground">{sym}{Math.round(total / trend.length).toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8d96b3" }}
                angle={-45}
                textAnchor="end"
                interval={Math.max(0, Math.floor(trend.length / 12) - 1)}
              />
              <YAxis tick={{ fontSize: 10, fill: "#8d96b3" }} tickFormatter={v => `${sym}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
              <Tooltip
                contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`${sym}${value.toLocaleString("en-IN")}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs text-center">Bills</TableHead>
              <TableHead className="text-xs text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...trend].reverse().map(d => (
              <TableRow key={d.key}>
                <TableCell className="font-medium text-sm">{d.label}</TableCell>
                <TableCell className="text-center text-muted-foreground text-sm">{d.bills}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-400">{sym}{d.revenue.toLocaleString("en-IN")}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/20">
              <TableCell>Total</TableCell>
              <TableCell className="text-center">{trend.reduce((s, d) => s + d.bills, 0)}</TableCell>
              <TableCell className="text-right text-emerald-400">{sym}{total.toLocaleString("en-IN")}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ breakdown, totalRevenue, sym, loading }: {
  breakdown: { method: string; amount: number; count: number }[];
  totalRevenue: number;
  sym: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-48" />;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Revenue by Payment Method</CardTitle></CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data</p>
          ) : (
            <div className="space-y-4">
              {breakdown.map(({ method, amount, count }) => {
                const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium capitalize flex items-center gap-2">
                        <PayBadge method={method} />
                        <span className="text-muted-foreground text-xs">{count} bill{count !== 1 ? "s" : ""}</span>
                      </span>
                      <span className="font-semibold">{sym}{amount.toLocaleString("en-IN")} <span className="text-muted-foreground text-xs">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [preset, setPreset] = useState<DatePreset>("this_month");
  const [range, setRange] = useState<DateRange>(() => presetToRange("this_month"));

  const handlePreset = (p: DatePreset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetToRange(p));
  };

  const handleCustomRange = (r: DateRange) => {
    setPreset("custom");
    setRange(r);
  };

  const {
    loading, bills, sessions, bookings, metrics, prevMetrics,
    forecastBills, sessionByDay, rangeExpenseTotal, currentMonthSales,
    kpiStrip, kpiStripPrev,
    businessSummary, trendChartData, canteenProfitRows, customerReportRows,
    refetch,
    exportBills, exportSessions, exportBookings, exportCustomers,
  } = useReports(tenantId, range);

  const rangeDays = differenceInCalendarDays(range.to, range.from) + 1;
  const trendBucketHint =
    rangeDays <= 60
      ? "Chart and table use daily buckets for the selected range."
      : rangeDays <= 180
        ? "Chart and table group revenue by ISO week (aligned to global range, not rolling from today)."
        : "Chart and table group revenue by calendar month.";

  const insights = useMemo(() => {
    if (!tenantId) return null;
    const daily = buildDailyFromForecastBills(forecastBills, sessionByDay);
    return computeBusinessInsights({
      dailyHistory: daily,
      rangeRevenue: metrics.totalRevenue,
      rangeExpenses: rangeExpenseTotal,
      now: new Date(),
      currentMonthSales,
    });
  }, [tenantId, forecastBills, sessionByDay, metrics.totalRevenue, rangeExpenseTotal, currentMonthSales]);

  const monthlyRevenueTarget = useMemo(() => {
    const ext = config?.extended_config;
    if (!ext || typeof ext !== "object") return null;
    const v = (ext as Record<string, unknown>).monthly_revenue_target;
    return typeof v === "number" && v > 0 ? v : null;
  }, [config?.extended_config]);

  const rangeLabel = `${format(range.from, "dd MMM")} – ${format(range.to, "dd MMM yyyy")}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Analytics and insights for your club"
        actions={
          <div className="text-xs text-muted-foreground hidden md:block">
            {rangeLabel}
          </div>
        }
      />

      {/* Date range selector */}
      <DateRangeSelector
        preset={preset}
        onPreset={handlePreset}
        range={range}
        onCustomRange={handleCustomRange}
      />

      <ReportsKpiStrip cur={kpiStrip} prev={kpiStripPrev} sym={sym} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign}   label="Revenue"       color="text-emerald-400"
          value={`${sym}${metrics.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          current={metrics.totalRevenue}   prior={prevMetrics.totalRevenue} />
        <KpiCard icon={Receipt}      label="Bills"         color="text-blue-400"
          value={String(metrics.totalBills)}
          current={metrics.totalBills}     prior={prevMetrics.totalBills} />
        <KpiCard icon={TrendingUp}   label="Avg Bill"      color="text-orange-400"
          value={`${sym}${metrics.avgBillValue.toFixed(0)}`}
          current={metrics.avgBillValue}   prior={prevMetrics.avgBillValue} />
        <KpiCard icon={Clock}        label="Sessions"      color="text-purple-400"
          value={String(metrics.completedSessions)}
          sub={`${metrics.totalSessions} total`}
          current={metrics.completedSessions} prior={0} />
        <KpiCard icon={CalendarDays} label="Bookings"      color="text-cyan-400"
          value={String(metrics.totalBookings)}
          sub={`${metrics.cancellationRate.toFixed(0)}% cancelled`}
          current={metrics.totalBookings} prior={0} />
        <KpiCard icon={Users}        label="Discounts"     color="text-yellow-400"
          value={`${sym}${metrics.totalDiscount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub={`${metrics.compCount} comp`}
          current={0} prior={0} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="summary" className="gap-1"><Sparkles className="h-3 w-3" /> Summary</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <BusinessInsightsWidget insights={insights} sym={sym} loading={loading} />
          <BusinessSummaryCompact block={businessSummary} sym={sym} />
          <div className="grid lg:grid-cols-2 gap-4">
            <SummaryPaymentBar breakdown={metrics.paymentBreakdown} totalRevenue={metrics.totalRevenue} sym={sym} />
            <SevenDayForecastChart insights={insights} sym={sym} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ReportsHourlyRevenue bills={bills} sym={sym} />
            <GamingRevenueTargetCard bills={bills} sym={sym} monthlyTarget={monthlyRevenueTarget} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <CanteenProfitWidget rows={canteenProfitRows} sym={sym} />
            <TopCustomersReport bills={bills} sym={sym} />
          </div>
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <ReportsBillsTab
            bills={bills}
            loading={loading}
            sym={sym}
            config={config ?? null}
            onExport={() => exportBills(sym)}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <ReportsCustomersTab
            rows={customerReportRows}
            loading={loading}
            sym={sym}
            onExport={exportCustomers}
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <ReportsSessionsTab
            sessions={sessions}
            loading={loading}
            sym={sym}
            onExport={exportSessions}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <BookingsTab bookings={bookings} loading={loading} sym={sym} onExport={exportBookings} />
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <DailyRevenueTab trend={trendChartData} sym={sym} loading={loading} bucketHint={trendBucketHint} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsTab breakdown={metrics.paymentBreakdown} totalRevenue={metrics.totalRevenue} sym={sym} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
