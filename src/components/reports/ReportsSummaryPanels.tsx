import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { Bill, CanteenProfitRow, BusinessSummaryBlock } from "@/hooks/useReports";

function normItemType(t: string) {
  return (t || "").toLowerCase();
}

/** Hour of day revenue for already range-filtered bills. */
export function ReportsHourlyRevenue({ bills, sym }: { bills: Bill[]; sym: string }) {
  const data = useMemo(() => {
    const paid = bills.filter(b => b.status !== "voided" && b.status !== "complimentary" && b.payment_method !== "complimentary");
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      revenue: paid
        .filter(b => new Date(b.created_at).getHours() === h)
        .reduce((s, b) => s + Number(b.total_amount), 0),
    }));
  }, [bills]);

  const peak = data.reduce((m, d) => (d.revenue > m.revenue ? d : m), data[0]);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Revenue by hour (this report range)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#8d96b3" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#8d96b3" }} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip
              contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${sym}${v.toLocaleString("en-IN")}`, "Revenue"]}
            />
            <Bar dataKey="revenue" fill="#06b6d4" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-1">
          Peak hour: {peak?.hour ?? "—"}
          {peak && peak.revenue > 0 ? ` (${sym}${peak.revenue.toLocaleString("en-IN")})` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

export function GamingRevenueTargetCard({
  bills, sym, monthlyTarget,
}: {
  bills: Bill[];
  sym: string;
  monthlyTarget: number | null;
}) {
  const { ps5, pool, challenges, canteen, total } = useMemo(() => {
    const paid = bills.filter(b => b.status !== "voided");
    let ps5 = 0, pool = 0, challenges = 0, canteen = 0;
    for (const b of paid) {
      for (const it of b.bill_items ?? []) {
        const t = normItemType(it.item_type);
        const amt = Number(it.total_price);
        if (t.includes("ps5") || t === "console") ps5 += amt;
        else if (t.includes("pool") || t.includes("8-ball") || t.includes("eight")) pool += amt;
        else if (t.includes("challenge") || t.includes("metashot") || t.includes("tournament")) challenges += amt;
        else if (t === "product" || t.includes("canteen") || t.includes("food") || t.includes("drink")) canteen += amt;
      }
    }
    return { ps5, pool, challenges, canteen, total: ps5 + pool + challenges + canteen };
  }, [bills]);

  if (!monthlyTarget || monthlyTarget <= 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Gaming & canteen mix</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Set a monthly revenue target under Settings → General to show progress against goal.
        </CardContent>
      </Card>
    );
  }

  const pct = monthlyTarget > 0 ? Math.min(100, (total / monthlyTarget) * 100) : 0;
  const rows = [
    { label: "PS5 / console", value: ps5, fill: "#7c3aed" },
    { label: "Pool / 8-ball", value: pool, fill: "#0ea5e9" },
    { label: "Challenges", value: challenges, fill: "#f97316" },
    { label: "Canteen / products", value: canteen, fill: "#22c55e" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Gaming & canteen (range) vs monthly target</CardTitle>
        <p className="text-[11px] text-muted-foreground">Progress uses item types in bills; target from Settings.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Share of {sym}{monthlyTarget.toLocaleString("en-IN")} target</span>
            <span className="font-semibold">{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="space-y-2 max-h-36 overflow-y-auto text-xs">
          {rows.map(r => (
            <div key={r.label} className="flex justify-between gap-2">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: r.fill }} />{r.label}</span>
              <span className="font-mono">{sym}{r.value.toLocaleString("en-IN")}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold border-t border-border/50 pt-2 mt-1">
            <span>Total tagged</span>
            <span>{sym}{total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CanteenProfitWidget({ rows, sym }: { rows: CanteenProfitRow[]; sym: string }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Canteen & retail margin</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No product line items in this range.</p></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Canteen & retail margin</CardTitle>
        <p className="text-[11px] text-muted-foreground">Per-product revenue and estimated margin (cost from catalog).</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
          {rows.map(r => {
            const mPct = r.revenue > 0 ? (r.margin / r.revenue) * 100 : 0;
            return (
              <div key={r.key} className="flex flex-col gap-0.5 border-b border-border/30 pb-2">
                <div className="flex justify-between font-medium"><span className="truncate pr-2">{r.name}</span></div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Rev {sym}{r.revenue.toLocaleString("en-IN")}</span>
                  <span>Margin {sym}{r.margin.toLocaleString("en-IN")} ({mPct.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryPaymentBar({ breakdown, totalRevenue, sym }: {
  breakdown: { method: string; amount: number; count: number }[];
  totalRevenue: number;
  sym: string;
}) {
  if (breakdown.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Payment mix (range)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={breakdown.map(d => ({ ...d, pct: totalRevenue > 0 ? (d.amount / totalRevenue) * 100 : 0 }))} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="method" tick={{ fontSize: 10, fill: "#8d96b3" }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#8d96b3" }} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip
              contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name: string) => (name === "amount" ? [`${sym}${value.toLocaleString("en-IN")}`, "Amount"] : [value, name])}
            />
            <Bar dataKey="amount" fill="#7c3aed" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function BusinessSummaryCompact({ block, sym }: { block: BusinessSummaryBlock; sym: string }) {
  const { financial: f, operational: o, customer: c } = block;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Business summary (range)</CardTitle></CardHeader>
      <CardContent className="grid sm:grid-cols-3 gap-4 text-xs">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">Financial</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>Avg bill <span className="text-foreground">{sym}{f.avgBill.toFixed(0)}</span></li>
            <li>Discounts <span className="text-orange-400">{sym}{f.totalDiscounts.toLocaleString("en-IN")}</span></li>
            <li>Cash {f.cashPct.toFixed(0)}% · UPI {f.upiPct.toFixed(0)}% · Comp {f.compPct.toFixed(0)}%</li>
            <li>Best day <span className="text-emerald-400">{f.highestRevenueDay ? new Date(f.highestRevenueDay + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span> ({sym}{f.highestRevenueAmount.toLocaleString("en-IN")})</li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-foreground">Operational</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>Transactions <span className="text-foreground">{o.totalTransactions}</span></li>
            <li>Sessions <span className="text-foreground">{o.sessionsActiveOrDone}</span> · Avg {o.avgSessionMins.toFixed(0)}m</li>
            <li>Peak hour <span className="text-foreground">{o.peakHour != null ? `${o.peakHour}:00` : "—"}</span></li>
            <li>Top product <span className="text-foreground">{o.topProduct ?? "—"}</span> · Units {o.unitsSold}</li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-foreground">Customers</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>Spenders <span className="text-foreground">{c.customersInRange}</span></li>
            <li>Premium/VIP <span className="text-foreground">{c.members}</span> ({c.membershipRate.toFixed(0)}% of new sign-ups)</li>
            <li>Avg spend / spender <span className="text-foreground">{sym}{c.avgSpendPerCustomer.toFixed(0)}</span></li>
            <li>Loyalty +{c.loyaltyEarned} / −{c.loyaltyUsed}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopCustomersReport({ bills, sym }: { bills: Bill[]; sym: string }) {
  const rows = useMemo(() => {
    const paid = bills.filter(b => b.status !== "voided");
    const m: Record<string, { name: string; orders: number; spend: number }> = {};
    for (const b of paid) {
      const id = b.customer_id ?? "_walkin";
      const name = b.customers?.name ?? "Walk-in";
      if (!m[id]) m[id] = { name, orders: 0, spend: 0 };
      m[id].orders += 1;
      m[id].spend += Number(b.total_amount);
    }
    return Object.values(m).sort((a, b) => b.spend - a.spend).slice(0, 12);
  }, [bills]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Top customers (this range)</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customer-linked bills in this period.</p>
        ) : (
          <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {rows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex justify-between gap-2 border-b border-border/30 pb-2">
                <span className="truncate">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {r.name}
                  <span className="text-xs text-muted-foreground ml-1">({r.orders} bills)</span>
                </span>
                <span className="font-semibold text-emerald-400 shrink-0">{sym}{r.spend.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
