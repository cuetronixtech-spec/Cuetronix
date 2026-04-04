import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  TrendingUp, TrendingDown, Users, Monitor, ShoppingCart, Package,
  PlayCircle, BarChart3, User, Clock, AlertTriangle, Sparkles, X,
  Pencil, Trash2, Plus, Minus, ChevronLeft, ChevronRight,
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Check,
  ChevronsUpDown, Calendar, Download, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Types ─────────────────────────────────────────────────────────────────────

type BillFull = {
  id: string; tenant_id: string; bill_number: string | null;
  customer_id: string | null; subtotal: number; discount_amount: number;
  discount_type: string | null; tax_amount: number; total_amount: number;
  payment_method: string; payment_breakdown: Record<string, number>;
  loyalty_points_used: number; loyalty_points_earned: number;
  status: string; gateway_payment_id: string | null; created_at: string;
  customers: { id: string; name: string; phone: string | null; email: string | null } | null;
};

type BillItemRow = {
  id?: string; bill_id?: string; product_id: string | null;
  item_type: string; name: string; qty: number;
  unit_price: number; discount: number; total_price: number;
};

type SessionFull = {
  id: string; station_id: string; customer_id: string | null;
  started_at: string; ended_at: string | null; status: string;
  stations: { name: string } | null;
  customers: { name: string } | null;
};

type ProductBasic = {
  id: string; name: string; stock: number; track_stock: boolean;
  price: number; cost_price: number | null; low_stock_threshold: number; is_active: boolean;
};

type CustomerBasic = {
  id: string; name: string; phone: string | null; email: string | null;
  referral_code: string | null; loyalty_points: number; total_spend: number;
  visit_count: number; created_at: string;
};

type ExpenseRow = {
  id: string; category: string; description: string; amount: number;
  date: string; payment_mode: string; vendor_name: string | null;
  notes: string | null; created_at: string;
};

type VaultRow = { balance: number; currency: string };
type VaultTxnRow = {
  id: string; type: string; amount: number; balance_after: number;
  note: string | null; created_at: string;
};

type DateRange = { start: Date; end: Date };
type ChartPeriod = "hourly" | "daily" | "weekly" | "monthly";

type DashboardStats = {
  totalSales: number; salesChange: number;
  activeSessions: number; totalStations: number;
  totalCustomers: number; newToday: number;
  criticalCount: number; criticalNames: string[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(sym: string, n: number) {
  return `${sym}${Number(n).toLocaleString("en-IN")}`;
}

function startOf(unit: "day" | "week" | "month" | "year", d = new Date()) {
  const r = new Date(d);
  if (unit === "day") { r.setHours(0, 0, 0, 0); return r; }
  if (unit === "week") { r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); return r; }
  if (unit === "month") { r.setDate(1); r.setHours(0, 0, 0, 0); return r; }
  r.setMonth(0, 1); r.setHours(0, 0, 0, 0); return r;
}

function subUnit(unit: "day" | "week" | "month" | "year", n: number, d = new Date()) {
  const r = new Date(d);
  if (unit === "day") r.setDate(r.getDate() - n);
  else if (unit === "week") r.setDate(r.getDate() - n * 7);
  else if (unit === "month") r.setMonth(r.getMonth() - n);
  else r.setFullYear(r.getFullYear() - n);
  return r;
}

function sameDay(a: Date, b = new Date()) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(dateStr: string, start: Date, end: Date) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Banners ───────────────────────────────────────────────────────────────────

function TrialBanner() {
  const { config } = useTenant();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !config) return null;
  const trialEndsAt = config.trial_ends_at ? new Date(config.trial_ends_at) : null;
  if (config.subscription_status !== "trialing" || !trialEndsAt) return null;
  const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return null;
  const soon = daysLeft <= 3;
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 mb-6 ${soon ? "bg-orange-500/10 border-orange-500/40 text-orange-300" : "bg-primary/10 border-primary/30 text-primary"}`}>
      <div className="flex items-center gap-3">
        {soon ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <p className="text-sm font-medium">
          {soon
            ? `⚠️ Trial expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}! Upgrade now.`
            : `14-day free trial active — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining (ends ${trialEndsAt.toLocaleDateString()})`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant={soon ? "default" : "outline"} className={soon ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : ""} onClick={() => navigate("/subscription")}>
          Upgrade Plan
        </Button>
        {!soon && <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 p-1"><X className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  );
}

function WelcomeBanner({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  const { config } = useTenant();
  const trialEndsAt = config?.trial_ends_at ? new Date(config.trial_ends_at) : null;
  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Welcome to Cuetronix, {name}! 🎉</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your club workspace is ready. Your 14-day free trial has started
            {trialEndsAt && ` and runs until ${trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Head to <strong>Settings</strong> to configure stations, billing, and more.</p>
        </div>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 shrink-0"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ─── StatCardSection ───────────────────────────────────────────────────────────

function StatCardSection({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
  const { config } = useTenant();
  const sym = config?.currency_symbol || "₹";
  const changeColor = stats.salesChange >= 0 ? "text-green-500" : "text-red-500";
  const ChangeIcon = stats.salesChange >= 0 ? TrendingUp : TrendingDown;
  const cards = [
    {
      title: "Total Sales", value: fmtCurrency(sym, stats.totalSales),
      sub: (
        <span className={cn("flex items-center gap-1 text-xs mt-0.5", changeColor)}>
          <ChangeIcon className="h-3 w-3" />{Math.abs(stats.salesChange).toFixed(1)}% from last period
        </span>
      ),
      icon: DollarSign, color: "text-green-400",
    },
    {
      title: "Active Sessions", value: String(stats.activeSessions),
      sub: <span className="text-xs text-muted-foreground mt-0.5">{stats.totalStations} stations available</span>,
      icon: Monitor, color: "text-blue-400",
    },
    {
      title: "Customers", value: String(stats.totalCustomers),
      sub: <span className="text-xs text-muted-foreground mt-0.5">{stats.newToday} new member{stats.newToday !== 1 ? "s" : ""} today</span>,
      icon: Users, color: "text-purple-400",
    },
    {
      title: "Critical Inventory", value: String(stats.criticalCount),
      sub: stats.criticalCount > 0
        ? <span className="text-xs text-orange-400 mt-0.5 truncate block">{stats.criticalNames.slice(0, 2).join(", ")}{stats.criticalNames.length > 2 ? ` +${stats.criticalNames.length - 2}` : ""}</span>
        : <span className="text-xs text-muted-foreground mt-0.5">All stock levels OK</span>,
      icon: Package, color: "text-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <Card key={c.title} className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <><p className="text-2xl font-bold">{c.value}</p>{c.sub}</>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── ActionButtonSection ───────────────────────────────────────────────────────

function ActionButtonSection({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const actions = [
    { label: "Gaming Sessions", short: "Sessions", icon: PlayCircle, color: "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20", to: "/stations" },
    { label: "New Sale", short: "Sale", icon: ShoppingCart, color: "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20", to: "/pos" },
    { label: "Add Customer", short: "Customer", icon: User, color: "text-green-500 bg-green-500/10 hover:bg-green-500/20 border-green-500/20", to: "/customers" },
    { label: "Manage Inventory", short: "Inventory", icon: Package, color: "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20", to: "/products" },
    ...(isAdmin ? [{ label: "View Reports", short: "Reports", icon: BarChart3, color: "text-pink-500 bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20", to: "/reports" }] : []),
  ];
  return (
    <div className={`grid gap-3 mb-6 ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}>
      {actions.map(a => (
        <button
          key={a.to} onClick={() => navigate(a.to)}
          className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors", a.color)}
        >
          <a.icon className="h-5 w-5" />
          <span className="text-xs font-medium text-center">{isMobile ? a.short : a.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── SalesChart ────────────────────────────────────────────────────────────────

function buildChartData(period: ChartPeriod, selectedYear: number | null, bills: BillFull[], expenses: ExpenseRow[]): { label: string; sales: number; expenses: number; withdrawals: number }[] {
  const now = new Date();
  const year = selectedYear || now.getFullYear();
  const nonComp = bills.filter(b => b.status !== "complimentary" && b.status !== "voided");

  if (period === "hourly") {
    const todayExp = expenses.filter(e => sameDay(new Date(e.date)));
    const totalTodayExp = todayExp.reduce((s, e) => s + Number(e.amount), 0);
    const totalTodayWd = todayExp.filter(e => e.category === "withdrawal").reduce((s, e) => s + Number(e.amount), 0);
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}:00`,
      sales: nonComp.filter(b => sameDay(new Date(b.created_at)) && new Date(b.created_at).getHours() === h).reduce((s, b) => s + Number(b.total_amount), 0),
      expenses: totalTodayExp / 24,
      withdrawals: totalTodayWd / 24,
    }));
  }

  if (period === "daily") {
    const wStart = startOf("week");
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(wStart); day.setDate(day.getDate() + i);
      const dayExps = expenses.filter(e => sameDay(new Date(e.date), day));
      return {
        label: DAYS[day.getDay()],
        sales: nonComp.filter(b => sameDay(new Date(b.created_at), day)).reduce((s, b) => s + Number(b.total_amount), 0),
        expenses: dayExps.reduce((s, e) => s + Number(e.amount), 0),
        withdrawals: dayExps.filter(e => e.category === "withdrawal").reduce((s, e) => s + Number(e.amount), 0),
      };
    });
  }

  if (period === "weekly") {
    const mStart = startOf("month");
    const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0);
    const weeks: { label: string; sales: number; expenses: number; withdrawals: number }[] = [];
    let ws = new Date(mStart), wn = 1;
    while (ws <= mEnd) {
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      if (we > mEnd) we.setTime(mEnd.getTime());
      const wExps = expenses.filter(e => { const d = new Date(e.date); return d >= ws && d <= we; });
      weeks.push({
        label: `Week ${wn}`,
        sales: nonComp.filter(b => { const d = new Date(b.created_at); return d >= ws && d <= we; }).reduce((s, b) => s + Number(b.total_amount), 0),
        expenses: wExps.reduce((s, e) => s + Number(e.amount), 0),
        withdrawals: wExps.filter(e => e.category === "withdrawal").reduce((s, e) => s + Number(e.amount), 0),
      });
      ws = new Date(ws); ws.setDate(ws.getDate() + 7); wn++;
    }
    return weeks;
  }

  // monthly
  return Array.from({ length: 12 }, (_, m) => {
    const ms = new Date(year, m, 1), me = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const mExps = expenses.filter(e => { const d = new Date(e.date); return d >= ms && d <= me; });
    return {
      label: MONTHS[m],
      sales: nonComp.filter(b => { const d = new Date(b.created_at); return d >= ms && d <= me; }).reduce((s, b) => s + Number(b.total_amount), 0),
      expenses: mExps.reduce((s, e) => s + Number(e.amount), 0),
      withdrawals: mExps.filter(e => e.category === "withdrawal").reduce((s, e) => s + Number(e.amount), 0),
    };
  });
}

function SalesChart({ bills, expenses, chartPeriod, setChartPeriod }: {
  bills: BillFull[]; expenses: ExpenseRow[];
  chartPeriod: ChartPeriod; setChartPeriod: (p: ChartPeriod) => void;
}) {
  const { config } = useTenant();
  const sym = config?.currency_symbol || "₹";
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const years = Array.from(new Set(bills.map(b => new Date(b.created_at).getFullYear()))).sort((a, b) => b - a);
  const chartData = buildChartData(chartPeriod, selectedYear, bills, expenses);
  const fmtTick = (v: number) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;

  return (
    <Card className="border-border/50 mb-6">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 pb-3">
        <CardTitle className="text-base">Sales Overview</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedYear?.toString() || "all"} onValueChange={v => setSelectedYear(v === "all" ? null : parseInt(v))}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex bg-muted p-0.5 rounded-lg gap-0.5">
            {(["hourly", "daily", "weekly", "monthly"] as const).map(p => (
              <button
                key={p} onClick={() => setChartPeriod(p)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize",
                  chartPeriod === p ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmtTick} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number, name: string) => [`${sym}${Number(v).toLocaleString("en-IN")}`, name]} />
            <Legend />
            <Line type="monotone" dataKey="sales" name="Sales" stroke="#9b87f5" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── ActiveSessions ────────────────────────────────────────────────────────────

function ActiveSessionsWidget({ sessions }: { sessions: SessionFull[] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const elapsed = (s: string) => {
    const ms = now - new Date(s).getTime();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Active Sessions <Badge variant="secondary">{sessions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active sessions</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{s.stations?.name || "Unknown Station"}</p>
                  <p className="text-xs text-muted-foreground">{s.customers?.name || "Walk-in"}</p>
                </div>
                <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10 text-xs">
                  <Clock className="h-3 w-3 mr-1" />{elapsed(s.started_at)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AddItemDialog ─────────────────────────────────────────────────────────────

function AddItemDialog({ open, onClose, onAdd, products }: {
  open: boolean; onClose: () => void; onAdd: (item: BillItemRow) => void; products: ProductBasic[];
}) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<ProductBasic | null>(null);
  const [qty, setQty] = useState(1);
  const { config } = useTenant();
  const sym = config?.currency_symbol || "₹";
  const filtered = products.filter(p => p.is_active && p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (!sel) return;
    onAdd({ product_id: sel.id, item_type: "product", name: sel.name, unit_price: sel.price, qty, discount: 0, total_price: sel.price * qty });
    setSearch(""); setSel(null); setQty(1); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          <ScrollArea className="h-48 border rounded-lg">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No products found</p>
            ) : filtered.map(p => (
              <button key={p.id} onClick={() => setSel(p)} className={cn("w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 border-b last:border-b-0", sel?.id === p.id && "bg-primary/10")}>
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.track_stock && <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>}
                </div>
                <span className="text-sm font-medium text-primary">{sym}{p.price}</span>
              </button>
            ))}
          </ScrollArea>
          {sel && (
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Qty:</Label>
              <div className="flex items-center gap-2 border rounded-lg p-1">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-1 rounded hover:bg-muted"><Minus className="h-3 w-3" /></button>
                <span className="w-8 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(q => sel.track_stock ? Math.min(sel.stock, q + 1) : q + 1)} className="p-1 rounded hover:bg-muted"><Plus className="h-3 w-3" /></button>
              </div>
              <p className="text-sm text-muted-foreground ml-auto">Total: {sym}{(sel.price * qty).toLocaleString()}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!sel}>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditBillDialog ────────────────────────────────────────────────────────────

function EditBillDialog({ bill, open, onClose, onSaved, tenantId, sym, products }: {
  bill: BillFull | null; open: boolean; onClose: () => void;
  onSaved: () => void; tenantId: string; sym: string; products: ProductBasic[];
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<BillItemRow[]>([]);
  const [customer, setCustomer] = useState<CustomerBasic | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<CustomerBasic[]>([]);
  const [custPopover, setCustPopover] = useState(false);
  const [discAmt, setDiscAmt] = useState("0");
  const [discType, setDiscType] = useState<"flat" | "percent">("flat");
  const [loyaltyUsed, setLoyaltyUsed] = useState("0");
  const [payMethod, setPayMethod] = useState("cash");
  const [splitCash, setSplitCash] = useState("0");
  const [splitUpi, setSplitUpi] = useState("0");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !bill) return;
    supabase.from("bill_items").select("*").eq("bill_id", bill.id).then(({ data }) => {
      setItems((data || []).map(i => ({ id: i.id, bill_id: i.bill_id, product_id: i.product_id, item_type: i.item_type, name: i.name, qty: i.qty, unit_price: i.unit_price, discount: i.discount, total_price: i.total_price })));
    });
    setDiscAmt(String(bill.discount_amount || 0));
    setDiscType((bill.discount_type as "flat" | "percent") || "flat");
    setLoyaltyUsed(String(bill.loyalty_points_used || 0));
    setPayMethod(bill.payment_method || "cash");
    setSplitCash(String(bill.payment_breakdown?.cash || 0));
    setSplitUpi(String(bill.payment_breakdown?.online || 0));
    if (bill.customer_id) {
      supabase.from("customers").select("id, name, phone, email, referral_code, loyalty_points, total_spend, visit_count, created_at").eq("id", bill.customer_id).single().then(({ data }) => {
        if (data) setCustomer(data as CustomerBasic);
      });
    } else {
      setCustomer(null);
    }
  }, [open, bill]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!custSearch.trim() || !custPopover) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const q = custSearch.trim();
      const { data } = await supabase.from("customers")
        .select("id, name, phone, email, referral_code, loyalty_points, total_spend, visit_count, created_at")
        .eq("tenant_id", tenantId)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setCustResults((data || []) as CustomerBasic[]);
    }, 300);
  }, [custSearch, custPopover, tenantId]);

  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const computedDisc = discType === "percent" ? subtotal * (parseFloat(discAmt) || 0) / 100 : parseFloat(discAmt) || 0;
  const loyPts = parseFloat(loyaltyUsed) || 0;
  const total = Math.max(0, subtotal - computedDisc - loyPts);
  const maxLoyalty = customer?.loyalty_points || 0;
  const splitSum = parseFloat(splitCash) + parseFloat(splitUpi);
  const splitValid = payMethod !== "split" || Math.abs(splitSum - total) < 0.01;

  const updateItem = (idx: number, field: keyof BillItemRow, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === "qty" || field === "unit_price") item.total_price = Number(item.unit_price) * Number(item.qty) - Number(item.discount);
      next[idx] = item;
      return next;
    });
  };

  const handleSave = async () => {
    if (!bill || !tenantId) return;
    if (!splitValid) { toast.error("Split amounts must equal total"); return; }
    setSaving(true);
    const payBreakdown = payMethod === "split" ? { cash: parseFloat(splitCash), online: parseFloat(splitUpi) } : {};
    const { error: bErr } = await supabase.from("bills").update({
      customer_id: customer?.id || null, subtotal,
      discount_amount: computedDisc, discount_type: discType,
      loyalty_points_used: loyPts,
      payment_method: payMethod, payment_breakdown: payBreakdown, total_amount: total,
    }).eq("id", bill.id);
    if (bErr) { toast.error(bErr.message); setSaving(false); return; }

    await supabase.from("bill_items").delete().eq("bill_id", bill.id);
    if (items.length > 0) {
      const { error: iErr } = await supabase.from("bill_items").insert(items.map(i => ({
        tenant_id: tenantId, bill_id: bill.id, product_id: i.product_id,
        item_type: i.item_type, name: i.name, qty: i.qty,
        unit_price: i.unit_price, discount: i.discount, total_price: i.total_price,
      })));
      if (iErr) { toast.error(iErr.message); setSaving(false); return; }
    }

    if (customer?.id) {
      const loyaltyEarned = Math.floor(total / 100);
      const { data: cust } = await supabase.from("customers").select("loyalty_points, total_spend").eq("id", customer.id).single();
      if (cust) {
        const newPts = Math.max(0, (cust.loyalty_points || 0) - (bill.loyalty_points_earned || 0) + loyaltyEarned - (loyPts - (bill.loyalty_points_used || 0)));
        await supabase.from("customers").update({
          loyalty_points: newPts,
          total_spend: Math.max(0, (cust.total_spend || 0) + total - Number(bill.total_amount)),
        }).eq("id", customer.id);
      }
    }

    // Audit log
    await supabase.from("bill_edit_audits").insert({ tenant_id: tenantId, bill_id: bill.id, edited_by: user?.id, changes: {}, reason: null }).catch(() => {});

    toast.success("Bill updated");
    setSaving(false); onSaved(); onClose();
  };

  if (!bill) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o && !addItemOpen) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Bill</DialogTitle></DialogHeader>

          {/* Header row */}
          <div className="grid grid-cols-3 gap-4 pb-4 border-b">
    <div>
              <p className="text-xs text-muted-foreground">Bill ID</p>
              <p className="font-mono text-sm mt-1 font-medium">{bill.bill_number || bill.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Customer</p>
              <Popover open={custPopover} onOpenChange={setCustPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full h-8 text-xs justify-between">
                    <span className="truncate">{customer ? customer.name : "Walk-in"}</span>
                    <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0">
                  <Command>
                    <CommandInput placeholder="Search by name, phone…" value={custSearch} onValueChange={setCustSearch} />
                    <CommandList>
                      <CommandEmpty>No customer found</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="walk-in" onSelect={() => { setCustomer(null); setCustPopover(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", !customer ? "opacity-100" : "opacity-0")} /> Walk-in
                        </CommandItem>
                        {custResults.map(c => (
                          <CommandItem key={c.id} value={c.id} onSelect={() => { setCustomer(c); setCustSearch(c.name); setCustPopover(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", customer?.id === c.id ? "opacity-100" : "opacity-0")} />
                            <div><p className="text-sm">{c.name}</p>{c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}</div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="text-sm mt-2">{new Date(bill.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddItemOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground w-24">Type</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Price</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground w-20">Total</th>
                    <th className="w-8 p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted-foreground py-6 text-sm">No items</td></tr>
                  ) : items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="p-1.5">
                        <Input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} className="h-7 text-xs" />
                      </td>
                      <td className="p-1.5">
                        <Select value={item.item_type} onValueChange={v => updateItem(idx, "item_type", v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="session">Session</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-1.5">
                        <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right" />
                      </td>
                      <td className="p-1.5">
                        <Input type="number" min="1" value={item.qty} onChange={e => updateItem(idx, "qty", parseInt(e.target.value) || 1)} className="h-7 text-xs text-right" />
                      </td>
                      <td className="p-1.5 text-right text-xs font-medium">{sym}{item.total_price.toLocaleString()}</td>
                      <td className="p-1.5">
                        <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80 p-0.5">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <div>
              <Label className="text-xs">Discount</Label>
              <div className="flex gap-1 mt-1">
                <Input type="number" min="0" value={discAmt} onChange={e => setDiscAmt(e.target.value)} className="h-7 text-xs" />
                <Select value={discType} onValueChange={v => setDiscType(v as "flat" | "percent")}>
                  <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">₹</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Loyalty Points Used</Label>
              <Input type="number" min="0" max={maxLoyalty} value={loyaltyUsed}
                onChange={e => setLoyaltyUsed(String(Math.min(maxLoyalty, parseInt(e.target.value) || 0)))}
                className="h-7 text-xs mt-1" disabled={!customer} />
              {customer && <p className="text-xs text-muted-foreground mt-0.5">Available: {customer.loyalty_points}</p>}
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "online", "credit", "card", "split"].map(m => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Split payment */}
          {payMethod === "split" && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-xs">Cash</Label>
                <Input type="number" min="0" step="0.01" value={splitCash}
                  onChange={e => { setSplitCash(e.target.value); setSplitUpi(String(Math.max(0, total - (parseFloat(e.target.value) || 0)))); }}
                  className="h-7 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">UPI / Online</Label>
                <Input type="number" min="0" step="0.01" value={splitUpi}
                  onChange={e => { setSplitUpi(e.target.value); setSplitCash(String(Math.max(0, total - (parseFloat(e.target.value) || 0)))); }}
                  className="h-7 text-xs mt-1" />
              </div>
              {!splitValid && (
                <p className="col-span-2 text-xs text-destructive">Sum ({sym}{splitSum.toFixed(2)}) must equal total ({sym}{total.toFixed(2)})</p>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="space-y-1 border-t pt-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{sym}{subtotal.toLocaleString()}</span></div>
            {computedDisc > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount ({discType === "percent" ? `${discAmt}%` : `${sym}${discAmt}`})</span>
                <span>-{sym}{computedDisc.toFixed(2)}</span>
              </div>
            )}
            {loyPts > 0 && (
              <div className="flex justify-between text-sm text-orange-500">
                <span>Loyalty Points ({loyPts} pts)</span><span>-{sym}{loyPts}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>Total</span><span className="text-primary">{sym}{total.toLocaleString()}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AddItemDialog open={addItemOpen} onClose={() => setAddItemOpen(false)} onAdd={item => setItems(p => [...p, item])} products={products} />
    </>
  );
}

// ─── RecentTransactions ────────────────────────────────────────────────────────

function RecentTransactions({ bills, activeSessions, onRefresh, tenantId, sym, products }: {
  bills: BillFull[]; activeSessions: SessionFull[]; onRefresh: () => void;
  tenantId: string; sym: string; products: ProductBasic[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBillData, setDeleteBillData] = useState<BillFull | null>(null);
  const [editBill, setEditBill] = useState<BillFull | null>(null);
  const perPage = Math.max(5, activeSessions.length);

  const filtered = bills
    .filter(b => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return b.id.slice(0, 8).includes(q) || (b.bill_number || "").toLowerCase().includes(q) ||
        (b.customers?.name || "").toLowerCase().includes(q) ||
        (b.customers?.phone || "").toLowerCase().includes(q) ||
        (b.customers?.email || "").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async () => {
    if (!deleteId || !deleteBillData) return;
    const { data: items } = await supabase.from("bill_items").select("*").eq("bill_id", deleteId);
    for (const item of items || []) {
      if (item.product_id && item.item_type === "product") {
        const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
        if (prod) await supabase.from("products").update({ stock: prod.stock + item.qty }).eq("id", item.product_id);
      }
    }
    if (deleteBillData.customer_id) {
      const { data: cust } = await supabase.from("customers").select("loyalty_points, total_spend, visit_count").eq("id", deleteBillData.customer_id).single();
      if (cust) {
        await supabase.from("customers").update({
          loyalty_points: Math.max(0, (cust.loyalty_points || 0) - (deleteBillData.loyalty_points_earned || 0) + (deleteBillData.loyalty_points_used || 0)),
          total_spend: Math.max(0, (cust.total_spend || 0) - Number(deleteBillData.total_amount)),
          visit_count: Math.max(0, (cust.visit_count || 1) - 1),
        }).eq("id", deleteBillData.customer_id);
      }
    }
    await supabase.from("bill_items").delete().eq("bill_id", deleteId);
    const { error } = await supabase.from("bills").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success("Transaction deleted"); onRefresh(); }
    setDeleteId(null); setDeleteBillData(null);
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <div className="relative mt-2">
            <svg className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input placeholder="Search bills, customers…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 pl-8 text-xs" />
          </div>
            </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {paginated.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No transactions found</p>
            ) : (
              <div className="space-y-1.5">
                {paginated.map(b => {
                  const isComp = b.status === "complimentary";
                  const isRazorpay = !!b.gateway_payment_id;
                  return (
                    <div key={b.id} className={cn("flex items-center justify-between p-2 rounded-lg", isComp ? "bg-orange-500/10" : isRazorpay ? "bg-indigo-500/10" : "bg-muted/50")}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{b.customers?.name || "Walk-in"}</span>
                          {isComp && <Badge className="bg-orange-500 text-white text-xs px-1 py-0 h-4 rounded">Comp</Badge>}
                          {isRazorpay && <Badge className="bg-indigo-500 text-white text-xs px-1 py-0 h-4 rounded">Razorpay</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · #{b.bill_number || b.id.slice(0, 8)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-semibold mr-1">{sym}{Number(b.total_amount).toLocaleString()}</span>
                        <button onClick={() => setEditBill(b)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => { setDeleteId(b.id); setDeleteBillData(b); }} className="p-1 text-muted-foreground hover:text-destructive rounded">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
            </CardContent>
          </Card>

      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) { setDeleteId(null); setDeleteBillData(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the sale, update inventory, and adjust customer loyalty points. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditBillDialog bill={editBill} open={!!editBill} onClose={() => setEditBill(null)} onSaved={() => { setEditBill(null); onRefresh(); }} tenantId={tenantId} sym={sym} products={products} />
    </>
  );
}

// ─── Analytics Charts ──────────────────────────────────────────────────────────

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  if (den < 1e-9) return null;
  return num / den;
}

function correlationLabel(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.7) return r >= 0 ? "Strong positive correlation" : "Strong negative correlation";
  if (a >= 0.4) return r >= 0 ? "Moderate positive correlation" : "Moderate negative correlation";
  if (a >= 0.2) return r >= 0 ? "Weak positive correlation" : "Weak negative correlation";
  return "Little linear correlation";
}

function CustomerSpendingCorrelation({ customers }: { customers: CustomerBasic[] }) {
  const { config } = useTenant();
  const sym = config?.currency_symbol || "₹";
  const data = customers.map(c => ({ x: c.visit_count, y: Number(c.total_spend), name: c.name }));
  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const R = pearsonCorrelation(xs, ys);
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Visit Frequency vs. Spend</CardTitle>
        {R != null && (
          <p className="text-xs text-muted-foreground mt-1">
            R = {R.toFixed(2)} — {correlationLabel(R)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="x" name="Visits" type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Visits", position: "insideBottom", offset: -10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis dataKey="y" name="Spend" type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number, name: string) => [name === "Spend" ? `${sym}${Number(v).toLocaleString()}` : v, name]} />
            <Scatter data={data} fill="#9b87f5" opacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function HourlyRevenueDistribution({ bills }: { bills: BillFull[] }) {
  const { config } = useTenant();
  const sym = config?.currency_symbol || "₹";
  const nonComp = bills.filter(b => b.status !== "complimentary" && b.status !== "voided");
  const data = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    revenue: nonComp.filter(b => new Date(b.created_at).getHours() === h).reduce((s, b) => s + Number(b.total_amount), 0),
  }));
  return (
    <Card className="border-border/50">
      <CardHeader><CardTitle className="text-sm">Revenue by Hour of Day</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${sym}${Number(v).toLocaleString()}`, "Revenue"]} />
            <Bar dataKey="revenue" fill="#9b87f5" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ProductPerformance({ billItems, sym }: { billItems: BillItemRow[]; sym: string }) {
  const rev: Record<string, { name: string; revenue: number; units: number }> = {};
  billItems.filter(i => i.item_type === "product").forEach(i => {
    const key = i.product_id || i.name;
    if (!rev[key]) rev[key] = { name: i.name, revenue: 0, units: 0 };
    rev[key].revenue += i.total_price; rev[key].units += i.qty;
  });
  const data = Object.values(rev).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  return (
    <Card className="border-border/50">
      <CardHeader><CardTitle className="text-sm">Top Products by Revenue</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No product sales data</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={55} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${sym}${Number(v).toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#9b87f5" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerActivityChart({ customers }: { customers: CustomerBasic[] }) {
  const monthMap: Record<string, number> = {};
  customers.forEach(c => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const data = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: MONTHS[d.getMonth()], new: monthMap[key] || 0 };
  });
  return (
    <Card className="border-border/50">
      <CardHeader><CardTitle className="text-sm">New Customer Activity (12 months)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="new" name="New Customers" fill="#22c55e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ProductInventoryChart({ products }: { products: ProductBasic[] }) {
  const tracked = products.filter(p => p.is_active && p.track_stock).sort((a, b) => a.stock - b.stock).slice(0, 15);
  return (
    <Card className="border-border/50">
      <CardHeader><CardTitle className="text-sm">Inventory Levels</CardTitle></CardHeader>
      <CardContent>
        {tracked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tracked products</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tracked.map(p => ({ name: p.name, stock: p.stock, threshold: p.low_stock_threshold }))} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={65} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="stock" name="Stock" fill="#9b87f5" radius={[0, 3, 3, 0]} />
              <Bar dataKey="threshold" name="Threshold" fill="#ef4444" radius={[0, 3, 3, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Expense Components ────────────────────────────────────────────────────────

function ExpenseDateFilter({ dateRange, onChange, expenses, sym }: {
  dateRange: DateRange | null; onChange: (r: DateRange | null) => void;
  expenses: ExpenseRow[]; sym: string;
}) {
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const presets = [
    { label: "Today", fn: () => { const d = new Date(); const s = startOf("day", d); const e = new Date(d.setHours(23, 59, 59, 999)); onChange({ start: s, end: e }); } },
    { label: "This Week", fn: () => { const s = startOf("week"); const e = new Date(s); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); onChange({ start: s, end: e }); } },
    { label: "This Month", fn: () => { const s = startOf("month"); const e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999); onChange({ start: s, end: e }); } },
    { label: "This Year", fn: () => { const s = startOf("year"); const e = new Date(s.getFullYear(), 11, 31, 23, 59, 59, 999); onChange({ start: s, end: e }); } },
  ];

  const filteredExp = dateRange ? expenses.filter(e => isBetween(e.date, dateRange.start, dateRange.end)) : expenses;

  const exportCSV = () => {
    if (filteredExp.length === 0) { toast.error("No expenses to export"); return; }
    const rows = [
      ["Date", "Description", "Category", "Amount", "Payment Mode", "Vendor", "Notes"],
      ...filteredExp.map(e => [e.date, e.description, e.category, String(e.amount), e.payment_mode, e.vendor_name || "", e.notes || ""]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().split("T")[0];
    a.download = dateRange
      ? `expenses_${dateRange.start.toISOString().split("T")[0]}_to_${dateRange.end.toISOString().split("T")[0]}.csv`
      : `expenses_all_${today}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1 md:mt-0">
      {presets.map(p => (
        <Button key={p.label} size="sm" variant="outline" className="h-7 text-xs" onClick={p.fn}>{p.label}</Button>
      ))}
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCustom(!showCustom)}>
        <Calendar className="h-3 w-3 mr-1" />Custom
      </Button>
      {dateRange && (
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onChange(null)}>
          <X className="h-3 w-3 mr-1" />Clear
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCSV}>
        <Download className="h-3 w-3 mr-1" />Export CSV
      </Button>
      {showCustom && (
        <div className="w-full flex items-center gap-2 mt-1">
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-7 text-xs w-36" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-7 text-xs w-36" />
          <Button size="sm" className="h-7 text-xs" onClick={() => {
            if (!customStart || !customEnd) return;
            onChange({ start: new Date(customStart), end: new Date(customEnd + "T23:59:59") });
            setShowCustom(false);
          }}>Apply</Button>
      </div>
      )}
    </div>
  );
}

function BusinessSummarySection({ bills, expenses, dateRange, sym }: {
  bills: BillFull[]; expenses: ExpenseRow[]; dateRange: DateRange | null; sym: string;
}) {
  const filteredBills = bills.filter(b => {
    if (b.status === "complimentary" || b.status === "voided") return false;
    return !dateRange || isBetween(b.created_at, dateRange.start, dateRange.end);
  });
  const filteredExp = dateRange ? expenses.filter(e => isBetween(e.date, dateRange.start, dateRange.end)) : expenses;

  const grossIncome = filteredBills.reduce((s, b) => s + Number(b.total_amount), 0);
  const withdrawals = filteredExp.filter(e => e.category === "withdrawal").reduce((s, e) => s + Number(e.amount), 0);
  const opExpenses = filteredExp.filter(e => e.category !== "withdrawal").reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = grossIncome - opExpenses;
  const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;
  const moneyInBank = netProfit - withdrawals;
  const marginLabel = profitMargin >= 30 ? "Healthy" : profitMargin >= 15 ? "Average" : "Low";
  const marginColor = profitMargin >= 30 ? "text-green-500" : profitMargin >= 15 ? "text-orange-500" : "text-red-500";

  const cards = [
    { label: "Gross Income", value: fmtCurrency(sym, grossIncome), color: "text-green-500" },
    { label: "Operating Expenses", value: fmtCurrency(sym, opExpenses), color: "text-red-500" },
    { label: "Net Profit", value: fmtCurrency(sym, netProfit), color: netProfit >= 0 ? "text-green-500" : "text-red-500" },
    {
      label: "Profit Margin", value: `${profitMargin.toFixed(1)}%`, color: marginColor,
      extra: (<div className="mt-1"><Progress value={Math.min(100, Math.max(0, profitMargin))} className="h-1.5" /><p className={`text-xs mt-0.5 ${marginColor}`}>{marginLabel}</p></div>),
    },
    { label: "Withdrawals", value: fmtCurrency(sym, withdrawals), color: "text-orange-500" },
    { label: "Money in Bank", value: fmtCurrency(sym, moneyInBank), color: moneyInBank >= 0 ? "text-blue-500" : "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map(c => (
        <Card key={c.label} className="border-border/50">
          <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">{c.label}</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            {"extra" in c && c.extra}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExpenseList({ expenses, dateRange, selectedCategory, onSelectCategory, sym }: {
  expenses: ExpenseRow[]; dateRange: DateRange | null;
  selectedCategory: string | null; onSelectCategory: (c: string | null) => void; sym: string;
}) {
  const filtered = expenses
    .filter(e => {
      if (dateRange && !isBetween(e.date, dateRange.start, dateRange.end)) return false;
      if (selectedCategory && e.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const catCounts = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
        <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onSelectCategory(null)}
            className={cn("px-2.5 py-1 rounded-full text-xs border transition-colors", !selectedCategory ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
          >All</button>
          {Object.entries(catCounts).map(([cat, count]) => (
            <button key={cat} onClick={() => onSelectCategory(cat === selectedCategory ? null : cat)}
              className={cn("px-2.5 py-1 rounded-full text-xs border transition-colors capitalize", selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
              {cat} ({count})
            </button>
          ))}
        </div>
          </CardHeader>
          <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No expenses{dateRange ? " in this date range" : ""}</p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleDateString()} · <span className="capitalize">{e.category}</span>
                    {e.vendor_name && ` · ${e.vendor_name}`}
                  </p>
                      </div>
                <p className="font-semibold text-sm shrink-0 ml-4 text-red-500">-{sym}{Number(e.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
  );
}

// ─── VaultTab ──────────────────────────────────────────────────────────────────

function VaultTab({ tenantId, sym }: { tenantId: string; sym: string }) {
  const { user } = useAuth();
  const [vault, setVault] = useState<VaultRow | null>(null);
  const [txns, setTxns] = useState<VaultTxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const todayInflow = txns.filter(t => sameDay(new Date(t.created_at)) && (t.type === "deposit" || t.type === "bill_receipt")).reduce((s, t) => s + t.amount, 0);
  const todayOutflow = txns.filter(t => sameDay(new Date(t.created_at)) && (t.type === "withdrawal" || t.type === "expense")).reduce((s, t) => s + t.amount, 0);

  const load = useCallback(async () => {
    setLoading(true);
    const [vRes, tRes] = await Promise.all([
      supabase.from("cash_vault").select("balance, currency").eq("tenant_id", tenantId).single(),
      supabase.from("cash_vault_transactions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100),
    ]);
    setVault(vRes.data || null);
    setTxns((tRes.data || []) as VaultTxnRow[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const recordTx = async (type: "deposit" | "withdrawal") => {
    if (!amount || !vault) return;
    const amt = parseFloat(amount);
    if (amt <= 0) { toast.error("Amount must be positive"); return; }
    if (type === "withdrawal" && amt > vault.balance) { toast.error("Insufficient vault balance"); return; }
    setSaving(true);
    const newBal = type === "deposit" ? vault.balance + amt : vault.balance - amt;
    const { error: txErr } = await supabase.from("cash_vault_transactions").insert({ tenant_id: tenantId, type, amount: amt, balance_after: newBal, note: note.trim() || null, created_by: user?.id });
    if (txErr) { toast.error(txErr.message); setSaving(false); return; }
    await supabase.from("cash_vault").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
    toast.success(type === "deposit" ? "Cash added to vault" : "Bank deposit recorded");
    setSaving(false); setAmount(""); setNote(""); setAddOpen(false); setDepositOpen(false);
    load();
  };

  const deleteTx = async (tx: VaultTxnRow) => {
    if (!vault) return;
    const revBal = (tx.type === "deposit" || tx.type === "bill_receipt") ? vault.balance - tx.amount : vault.balance + tx.amount;
    await supabase.from("cash_vault_transactions").delete().eq("id", tx.id);
    await supabase.from("cash_vault").update({ balance: revBal }).eq("tenant_id", tenantId);
    toast.success("Transaction deleted"); load();
  };

  const initVault = async () => {
    setInitLoading(true);
    const { error } = await supabase.from("cash_vault").insert({ tenant_id: tenantId, balance: 0, currency: "INR" });
    if (error) toast.error(error.message); else { toast.success("Vault initialized"); load(); }
    setInitLoading(false);
  };

  if (!loading && vault === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Wallet className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Cash vault not initialized</p>
        <Button onClick={initVault} disabled={initLoading}><Plus className="h-4 w-4 mr-2" />Initialize Cash Vault</Button>
      </div>
    );
  }

  const vaultBal = vault?.balance || 0;

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><CardTitle className="text-sm text-muted-foreground">Vault Balance</CardTitle></div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-28" /> : (
              <p className={`text-3xl font-bold ${vaultBal < 0 ? "text-red-500" : "text-primary"}`}>{sym}{vaultBal.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Inflow</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-500">+{sym}{todayInflow.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Outflow</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">-{sym}{todayOutflow.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button onClick={() => { setAmount(""); setNote(""); setAddOpen(true); }}><ArrowDownCircle className="h-4 w-4 mr-2" />Add Cash</Button>
        <Button variant="outline" onClick={() => { setAmount(""); setNote(""); setDepositOpen(true); }}><ArrowUpCircle className="h-4 w-4 mr-2 text-orange-500" />Bank Deposit</Button>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        {vaultBal < 0 && <Button variant="destructive" onClick={() => setFixOpen(true)}>Fix Balance</Button>}
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : txns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-1.5">
              {txns.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                  <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", { "bg-green-100 text-green-700": t.type === "deposit" || t.type === "bill_receipt", "bg-red-100 text-red-700": t.type === "withdrawal" || t.type === "expense" })} variant="secondary">
                        {t.type.replace(/_/g, " ")}
                      </Badge>
                      {t.note && <span className="text-xs text-muted-foreground truncate">{t.note}</span>}
                  </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${t.type === "deposit" || t.type === "bill_receipt" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "deposit" || t.type === "bill_receipt" ? "+" : "-"}{sym}{t.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Bal: {sym}{t.balance_after.toLocaleString()}</p>
                  </div>
                    <button onClick={() => deleteTx(t)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                      <Trash2 className="h-3 w-3" />
                    </button>
                </div>
                  </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Add Cash Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Cash</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Amount ({sym}) *</Label><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5" placeholder="0.00" /></div>
            <div><Label>Note / Reason</Label><Input value={note} onChange={e => setNote(e.target.value)} className="mt-1.5" placeholder="Optional" /></div>
            {vault && <p className="text-sm text-muted-foreground">Current balance: {sym}{vault.balance.toLocaleString()}</p>}
      </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => recordTx("deposit")} disabled={saving}>{saving ? "Saving…" : "Add Cash"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Bank Deposit</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Amount ({sym}) *</Label><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5" placeholder="0.00" /></div>
            <div><Label>Note</Label><Input value={note} onChange={e => setNote(e.target.value)} className="mt-1.5" placeholder="Bank name / reference" /></div>
            {vault && <p className="text-sm text-muted-foreground">Available: {sym}{vault.balance.toLocaleString()}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button onClick={() => recordTx("withdrawal")} disabled={saving}>{saving ? "Saving…" : "Record Deposit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Balance */}
      <AlertDialog open={fixOpen} onOpenChange={setFixOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fix Vault Balance?</AlertDialogTitle>
            <AlertDialogDescription>This will reset the current vault balance to ₹0. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await supabase.from("cash_vault").update({ balance: 0 }).eq("tenant_id", tenantId); toast.success("Balance reset to 0"); setFixOpen(false); load(); }}>
              Reset to 0
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, appMeta } = useAuth();
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [dashTab, setDashTab] = useState("overview");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bills, setBills] = useState<BillFull[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionFull[]>([]);
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<CustomerBasic[]>([]);
  const [products, setProducts] = useState<ProductBasic[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [billItems, setBillItems] = useState<BillItemRow[]>([]);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ?? config?.tenant_name ?? "there";
  const isAdmin = appMeta?.role === "admin";

  useEffect(() => {
    if (searchParams.get("welcome") === "1") { setShowWelcome(true); setSearchParams({}, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const [bRes, sRes, stRes, cRes, pRes, eRes] = await Promise.all([
      supabase.from("bills").select("id, tenant_id, bill_number, customer_id, subtotal, discount_amount, discount_type, tax_amount, total_amount, payment_method, payment_breakdown, loyalty_points_used, loyalty_points_earned, status, gateway_payment_id, created_at, customers(id, name, phone, email)")
        .eq("tenant_id", tenantId).gte("created_at", yearAgo.toISOString()).order("created_at", { ascending: false }).limit(500),
      supabase.from("sessions").select("id, station_id, customer_id, started_at, ended_at, status, stations(name), customers(name)").eq("tenant_id", tenantId).eq("status", "active"),
      supabase.from("stations").select("id, name").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("customers").select("id, name, phone, email, referral_code, loyalty_points, total_spend, visit_count, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, stock, track_stock, price, cost_price, low_stock_threshold, is_active").eq("tenant_id", tenantId),
      supabase.from("expenses").select("id, category, description, amount, date, payment_mode, vendor_name, notes, created_at").eq("tenant_id", tenantId).order("date", { ascending: false }),
    ]);
    setBills((bRes.data || []) as unknown as BillFull[]);
    setActiveSessions((sRes.data || []) as unknown as SessionFull[]);
    setStations(stRes.data || []);
    setCustomers((cRes.data || []) as CustomerBasic[]);
    setProducts((pRes.data || []) as ProductBasic[]);
    setExpenses((eRes.data || []) as ExpenseRow[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Lazy-load bill items for analytics
  useEffect(() => {
    if (dashTab === "analytics" && !analyticsLoaded && tenantId) {
      supabase.from("bill_items").select("id, bill_id, product_id, item_type, name, qty, unit_price, discount, total_price")
        .eq("tenant_id", tenantId).limit(2000).then(({ data }) => {
          setBillItems((data || []) as BillItemRow[]);
          setAnalyticsLoaded(true);
        });
    }
  }, [dashTab, analyticsLoaded, tenantId]);

  // ── Compute dashboard stats ────────────────────────────────────────────────
  const nonComp = bills.filter(b => b.status !== "complimentary" && b.status !== "voided");
  const getBills = (start: Date, end: Date) => nonComp.filter(b => { const d = new Date(b.created_at); return d >= start && d <= end; });

  let pStart: Date, pEnd: Date, prevStart: Date, prevEnd: Date;
  const now = new Date();
  switch (chartPeriod) {
    case "hourly":
      pStart = startOf("day"); pEnd = new Date();
      prevStart = startOf("day", subUnit("day", 1)); prevEnd = new Date(prevStart); prevEnd.setHours(23, 59, 59, 999);
      break;
    case "daily":
      pStart = startOf("week"); pEnd = new Date(pStart); pEnd.setDate(pEnd.getDate() + 6); pEnd.setHours(23, 59, 59, 999);
      prevStart = subUnit("week", 1, startOf("week")); prevEnd = new Date(prevStart); prevEnd.setDate(prevEnd.getDate() + 6); prevEnd.setHours(23, 59, 59, 999);
      break;
    case "weekly":
      pStart = startOf("month"); pEnd = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = startOf("month", subUnit("month", 1, now)); prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    default: // monthly
      pStart = startOf("year"); pEnd = new Date(pStart.getFullYear(), 11, 31, 23, 59, 59, 999);
      prevStart = startOf("year", subUnit("year", 1, now)); prevEnd = new Date(prevStart.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const currentSales = getBills(pStart, pEnd).reduce((s, b) => s + Number(b.total_amount), 0);
  const prevSales = getBills(prevStart, prevEnd).reduce((s, b) => s + Number(b.total_amount), 0);
  const salesChange = prevSales > 0 ? ((currentSales - prevSales) / prevSales) * 100 : 0;
  const criticalProducts = products.filter(p => p.is_active && p.track_stock && p.stock <= 1);

  const dashboardStats: DashboardStats = {
    totalSales: currentSales, salesChange,
    activeSessions: activeSessions.length, totalStations: stations.length,
    totalCustomers: customers.length,
    newToday: customers.filter(c => new Date(c.created_at) >= startOf("day")).length,
    criticalCount: criticalProducts.length, criticalNames: criticalProducts.map(p => p.name),
  };

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    { id: "expenses", label: "Expenses" },
    { id: "cash", label: "Vault" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your club's performance"
        actions={
          config?.subscription_status === "trialing" && config.trial_ends_at ? (
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">
              <Clock className="h-3 w-3 mr-1" />Trial active
            </Badge>
          ) : undefined
        }
      />

      {showWelcome && <WelcomeBanner name={displayName} onDismiss={() => setShowWelcome(false)} />}
      <TrialBanner />

      {/* Tab bar */}
      <div className="flex items-start gap-3 flex-wrap mb-6">
        <div className="flex bg-muted p-1 rounded-xl gap-0.5 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id} onClick={() => setDashTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                dashTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {dashTab === "expenses" && (
          <ExpenseDateFilter dateRange={dateRange} onChange={r => { setDateRange(r); setSelectedCategory(null); }} expenses={expenses} sym={sym} />
        )}
      </div>

      {/* Overview Tab */}
      {dashTab === "overview" && (
        <div>
          <StatCardSection stats={dashboardStats} loading={loading} />
          <ActionButtonSection isAdmin={isAdmin} />
          <SalesChart bills={bills} expenses={expenses} chartPeriod={chartPeriod} setChartPeriod={setChartPeriod} />
          <div className="grid md:grid-cols-2 gap-6">
            <ActiveSessionsWidget sessions={activeSessions} />
            <RecentTransactions bills={bills} activeSessions={activeSessions} onRefresh={loadData} tenantId={tenantId || ""} sym={sym} products={products} />
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {dashTab === "analytics" && (
        <div className="grid md:grid-cols-2 gap-6">
          <CustomerSpendingCorrelation customers={customers} />
          <HourlyRevenueDistribution bills={bills} />
          <ProductPerformance billItems={billItems} sym={sym} />
          <CustomerActivityChart customers={customers} />
          <ProductInventoryChart products={products} />
        </div>
      )}

      {/* Expenses Tab */}
      {dashTab === "expenses" && (
        <div>
          <BusinessSummarySection bills={bills} expenses={expenses} dateRange={dateRange} sym={sym} />
          <ExpenseList expenses={expenses} dateRange={dateRange} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} sym={sym} />
        </div>
      )}

      {/* Vault Tab */}
      {dashTab === "cash" && tenantId && (
        <VaultTab tenantId={tenantId} sym={sym} />
      )}
    </div>
  );
}
