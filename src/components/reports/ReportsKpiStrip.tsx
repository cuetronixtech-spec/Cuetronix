import type { ElementType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Banknote, Smartphone, CreditCard, Landmark, SplitSquareHorizontal, Gift,
  Gamepad2, Disc3, Package, CircleDollarSign, TrendingUp, TrendingDown,
} from "lucide-react";
import type { KpiStripMetrics } from "@/hooks/useReports";

function pct(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function Delta({ current, prior }: { current: number; prior: number }) {
  const d = pct(current, prior);
  if (d === null) return <span className="text-[10px] text-muted-foreground">no prior data</span>;
  const pos = d >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${pos ? "text-emerald-400" : "text-red-400"}`}>
      {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pos ? "+" : ""}{d.toFixed(1)}%
    </span>
  );
}

type IconT = ElementType;

export function ReportsKpiStrip({ cur, prev, sym }: { cur: KpiStripMetrics; prev: KpiStripMetrics; sym: string }) {
  const rows: { label: string; icon: IconT; color: string; cur: number; prev: number; sub?: string }[] = [
    { label: "Cash Sales", icon: Banknote, color: "text-emerald-400", cur: cur.cashSales, prev: prev.cashSales },
    { label: "UPI / Online", icon: Smartphone, color: "text-cyan-400", cur: cur.upiSales, prev: prev.upiSales },
    { label: "Credit", icon: Landmark, color: "text-orange-400", cur: cur.creditSales, prev: prev.creditSales },
    { label: "Razorpay", icon: CreditCard, color: "text-indigo-400", cur: cur.razorpaySales, prev: prev.razorpaySales },
    {
      label: "Split Payments",
      icon: SplitSquareHorizontal,
      color: "text-yellow-400",
      cur: cur.splitTotal,
      prev: prev.splitTotal,
      sub: cur.splitTotal > 0 ? `${sym}${cur.splitCashSub.toFixed(0)} cash + ${sym}${cur.splitUpiSub.toFixed(0)} UPI` : undefined,
    },
    {
      label: "Complimentary",
      icon: Gift,
      color: "text-pink-400",
      cur: cur.complimentaryValue,
      prev: prev.complimentaryValue,
      sub: `${cur.complimentaryCount} bills · ${cur.complimentaryItems} items`,
    },
    { label: "PS5 / Console", icon: Gamepad2, color: "text-violet-400", cur: cur.ps5Revenue, prev: prev.ps5Revenue },
    { label: "Pool / 8-ball", icon: Disc3, color: "text-sky-400", cur: cur.poolRevenue, prev: prev.poolRevenue },
    { label: "Product Sales", icon: Package, color: "text-amber-400", cur: cur.productSales, prev: prev.productSales },
    { label: "Total (paid)", icon: CircleDollarSign, color: "text-emerald-300", cur: cur.totalPaidSales, prev: prev.totalPaidSales },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {rows.map(r => (
        <Card key={r.label}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-start justify-between gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">{r.label}</span>
              <r.icon className={`h-3.5 w-3.5 shrink-0 ${r.color}`} />
            </div>
            <p className="text-lg font-bold leading-tight">
              {sym}{r.cur.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            {r.sub && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{r.sub}</p>}
            <div className="mt-1">
              <Delta current={r.cur} prior={r.prev} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
