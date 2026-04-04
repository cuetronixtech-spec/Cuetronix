import { useState, useMemo } from "react";
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
  Download, Search, Filter, ChevronDown, Minus, BarChart3, Users,
} from "lucide-react";
import { format } from "date-fns";
import type { DateRange as DRP } from "react-day-picker";
import {
  useReports, presetToRange, DATE_PRESETS,
  type DatePreset, type DateRange, type Bill, type Session, type Booking,
} from "@/hooks/useReports";

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

// ─── Bills Tab ────────────────────────────────────────────────────────────────

type BillSort = "date" | "total" | "subtotal" | "discount" | "customer";

function BillsTab({ bills, loading, sym, onExport }: {
  bills: Bill[]; loading: boolean; sym: string; onExport: () => void;
}) {
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [sort, setSort] = useState<BillSort>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const payMethods = useMemo(() => {
    const s = new Set(bills.map(b => b.payment_method));
    return Array.from(s);
  }, [bills]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bills
      .filter(b => {
        const matchSearch = !q ||
          (b.bill_number ?? "").toLowerCase().includes(q) ||
          (b.customers?.name ?? "").toLowerCase().includes(q) ||
          (b.customers?.phone ?? "").includes(q);
        const matchPay = payFilter === "all" || b.payment_method === payFilter;
        return matchSearch && matchPay;
      })
      .sort((a, b) => {
        let va: string | number, vb: string | number;
        if (sort === "date")     { va = a.created_at; vb = b.created_at; }
        else if (sort === "total")    { va = Number(a.total_amount);    vb = Number(b.total_amount); }
        else if (sort === "subtotal") { va = Number(a.subtotal);        vb = Number(b.subtotal); }
        else if (sort === "discount") { va = Number(a.discount_amount); vb = Number(b.discount_amount); }
        else { va = a.customers?.name ?? ""; vb = b.customers?.name ?? ""; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [bills, search, payFilter, sort, sortDir]);

  const toggleSort = (s: BillSort) => {
    if (sort === s) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(s); setSortDir(s === "date" ? "desc" : "desc"); }
  };

  const SortIndicator = ({ s }: { s: BillSort }) =>
    sort === s ? (
      <span className="ml-0.5 text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : null;

  if (loading) return <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search bill, customer, phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-56" />
        </div>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Payment method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {payMethods.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} bill{filtered.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No bills found for this period</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort("date")}>Date/Time<SortIndicator s="date" /></TableHead>
                <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort("customer")}>Customer<SortIndicator s="customer" /></TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs cursor-pointer select-none text-right" onClick={() => toggleSort("subtotal")}>Subtotal<SortIndicator s="subtotal" /></TableHead>
                <TableHead className="text-xs cursor-pointer select-none text-right" onClick={() => toggleSort("discount")}>Discount<SortIndicator s="discount" /></TableHead>
                <TableHead className="text-xs cursor-pointer select-none text-right" onClick={() => toggleSort("total")}>Total<SortIndicator s="total" /></TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(bill => (
                <>
                  <TableRow
                    key={bill.id}
                    className="cursor-pointer hover:bg-muted/20"
                    onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}
                  >
                    <TableCell className="text-sm">
                      <div className="font-mono text-xs text-muted-foreground">{bill.bill_number ?? bill.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(bill.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{bill.customers?.name ?? "—"}</div>
                      {bill.customers?.phone && <div className="text-xs text-muted-foreground">{bill.customers.phone}</div>}
                    </TableCell>
                    <TableCell><PayBadge method={bill.payment_method} /></TableCell>
                    <TableCell className="text-right text-sm">{sym}{Number(bill.subtotal).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right text-sm text-orange-400">
                      {Number(bill.discount_amount) > 0 ? `−${sym}${Number(bill.discount_amount).toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{sym}{Number(bill.total_amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${bill.status === "voided" ? "text-red-400 border-red-400/30" : bill.status === "complimentary" ? "text-pink-400 border-pink-400/30" : "text-emerald-400 border-emerald-400/30"}`}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded === bill.id ? "rotate-180" : ""}`} />
                    </TableCell>
                  </TableRow>

                  {/* Expanded line items */}
                  {expanded === bill.id && (
                    <TableRow key={`${bill.id}-items`} className="bg-muted/10">
                      <TableCell colSpan={8} className="p-0">
                        <div className="px-4 py-3 border-t border-border/30">
                          {bill.bill_items && bill.bill_items.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b border-border/30">
                                  <th className="text-left py-1 font-medium">Item</th>
                                  <th className="text-left py-1 font-medium">Type</th>
                                  <th className="text-center py-1 font-medium">Qty</th>
                                  <th className="text-right py-1 font-medium">Unit Price</th>
                                  <th className="text-right py-1 font-medium">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bill.bill_items.map(item => (
                                  <tr key={item.id} className="border-b border-border/20 last:border-0">
                                    <td className="py-1 font-medium">{item.name}</td>
                                    <td className="py-1 text-muted-foreground capitalize">{item.item_type}</td>
                                    <td className="py-1 text-center">{item.qty}</td>
                                    <td className="py-1 text-right">{sym}{Number(item.unit_price).toLocaleString("en-IN")}</td>
                                    <td className="py-1 text-right font-semibold">{sym}{Number(item.total_price).toLocaleString("en-IN")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No line items recorded</p>
                          )}
                          {(bill.loyalty_points_earned > 0 || bill.loyalty_points_used > 0) && (
                            <div className="flex gap-4 mt-2 pt-2 border-t border-border/20 text-xs text-muted-foreground">
                              {bill.loyalty_points_earned > 0 && <span>+{bill.loyalty_points_earned} pts earned</span>}
                              {bill.loyalty_points_used > 0 && <span>−{bill.loyalty_points_used} pts redeemed</span>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab({ sessions, loading, sym, onExport }: {
  sessions: Session[]; loading: boolean; sym: string; onExport: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.stations?.name ?? "").toLowerCase().includes(q);
  });

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search station…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-48" />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No sessions in this period</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Station</TableHead>
                <TableHead className="text-xs">Started</TableHead>
                <TableHead className="text-xs">Ended</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs text-right">Rate/hr</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{s.stations?.name ?? "—"}</div>
                    {s.stations?.type && <div className="text-xs text-muted-foreground capitalize">{s.stations.type}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.started_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.ended_at ? new Date(s.ended_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" }) : <span className="text-emerald-400 text-xs">Active</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.duration_mins != null ? `${s.duration_mins}m` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {s.rate_per_hour != null ? `${sym}${Number(s.rate_per_hour).toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${s.status === "completed" ? "text-emerald-400 border-emerald-400/30" : s.status === "active" ? "text-blue-400 border-blue-400/30" : "text-muted-foreground"}`}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {s.total_amount != null ? `${sym}${Number(s.total_amount).toLocaleString("en-IN")}` : "—"}
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
          <Download className="h-3.5 w-3.5" /> Export CSV
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
                <TableHead className="text-xs">Status</TableHead>
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
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_BOOKING[b.status] ?? "text-muted-foreground"}`}>
                      {b.status}
                    </Badge>
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

function DailyRevenueTab({ data, sym, loading }: {
  data: { date: string; revenue: number; bills: number }[];
  sym: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-64" />;
  if (!data.length) return <p className="text-center py-12 text-muted-foreground">No data for this period</p>;

  const total = data.reduce((s, d) => s + d.revenue, 0);
  const peak = data.reduce((m, d) => d.revenue > m.revenue ? d : m, data[0]);

  const chartData = data.map(d => ({
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    revenue: d.revenue,
    bills: d.bills,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-400">{sym}{total.toLocaleString("en-IN")}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Peak Day</p>
          <p className="text-xl font-bold text-foreground">
            {new Date(peak.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
          <p className="text-xs text-emerald-400">{sym}{peak.revenue.toLocaleString("en-IN")}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Avg Daily Revenue</p>
          <p className="text-xl font-bold text-foreground">{sym}{Math.round(total / data.length).toLocaleString("en-IN")}</p>
        </CardContent></Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8d96b3" }}
                angle={-45}
                textAnchor="end"
                interval={Math.max(0, Math.floor(chartData.length / 12) - 1)}
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
            {[...data].reverse().map(d => (
              <TableRow key={d.date}>
                <TableCell className="font-medium text-sm">
                  {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-sm">{d.bills}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-400">{sym}{d.revenue.toLocaleString("en-IN")}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/20">
              <TableCell>Total</TableCell>
              <TableCell className="text-center">{data.reduce((s, d) => s + d.bills, 0)}</TableCell>
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

  const { loading, bills, sessions, bookings, metrics, prevMetrics, exportBills, exportSessions, exportBookings } =
    useReports(tenantId, range);

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

      {/* KPI strip */}
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
      <Tabs defaultValue="bills">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-4">
          <BillsTab bills={bills} loading={loading} sym={sym} onExport={() => exportBills(sym)} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <SessionsTab sessions={sessions} loading={loading} sym={sym} onExport={exportSessions} />
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <BookingsTab bookings={bookings} loading={loading} sym={sym} onExport={exportBookings} />
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <DailyRevenueTab data={metrics.dailyRevenue} sym={sym} loading={loading} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsTab breakdown={metrics.paymentBreakdown} totalRevenue={metrics.totalRevenue} sym={sym} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
