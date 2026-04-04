import type { Bill } from "@/hooks/useReports";

export type KpiStripMetrics = {
  cashSales: number;
  upiSales: number;
  creditSales: number;
  razorpaySales: number;
  splitTotal: number;
  splitCashSub: number;
  splitUpiSub: number;
  complimentaryCount: number;
  complimentaryItems: number;
  complimentaryValue: number;
  ps5Revenue: number;
  poolRevenue: number;
  productSales: number;
  totalPaidSales: number;
};

function pb(b: Record<string, unknown>): Record<string, number> {
  const raw = b.payment_breakdown;
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function normType(t: string) {
  return (t || "").toLowerCase();
}

function isPs5Item(t: string) {
  const x = normType(t);
  return x.includes("ps5") || x === "console";
}

function isPoolItem(t: string) {
  const x = normType(t);
  return x.includes("pool") || x.includes("8-ball") || x.includes("eight");
}

function isProductItem(t: string) {
  const x = normType(t);
  return x === "product" || x.includes("canteen") || x.includes("food") || x.includes("drink");
}

/** Paid, non-complimentary bills (excludes void). */
export function isPaidSaleBill(b: Bill): boolean {
  if (b.status === "voided") return false;
  if (b.status === "complimentary" || b.payment_method === "complimentary") return false;
  return true;
}

/** Compute PRD KPI strip from bills in a period. */
export function computeKpiStripFromBills(bills: Bill[]): KpiStripMetrics {
  const z: KpiStripMetrics = {
    cashSales: 0,
    upiSales: 0,
    creditSales: 0,
    razorpaySales: 0,
    splitTotal: 0,
    splitCashSub: 0,
    splitUpiSub: 0,
    complimentaryCount: 0,
    complimentaryItems: 0,
    complimentaryValue: 0,
    ps5Revenue: 0,
    poolRevenue: 0,
    productSales: 0,
    totalPaidSales: 0,
  };

  for (const b of bills) {
    const total = Number(b.total_amount);
    const br = pb(b as unknown as Record<string, unknown>);
    const isComp = b.status === "complimentary" || b.payment_method === "complimentary";

    if (isComp && b.status !== "voided") {
      z.complimentaryCount += 1;
      z.complimentaryValue += total;
      const items = b.bill_items ?? [];
      z.complimentaryItems += items.reduce((s, it) => s + Number(it.qty), 0);
      continue;
    }

    if (!isPaidSaleBill(b)) continue;

    z.totalPaidSales += total;

    const raz = (b as unknown as { gateway_payment_id?: string | null }).gateway_payment_id;
    if (raz) z.razorpaySales += total;
    else if (b.payment_method === "cash") z.cashSales += total;
    else if (b.payment_method === "credit") z.creditSales += total;
    else if (b.payment_method === "split") {
      z.splitTotal += total;
      const c = Number(br.cash) || 0;
      const u = Number(br.online) || Number(br.upi) || 0;
      z.splitCashSub += c;
      z.splitUpiSub += u;
      z.cashSales += c;
      z.upiSales += u;
    } else if (b.payment_method === "online" || b.payment_method === "card") {
      z.upiSales += total;
    }

    for (const it of b.bill_items ?? []) {
      const amt = Number(it.total_price);
      const t = it.item_type;
      if (isPs5Item(t)) z.ps5Revenue += amt;
      else if (isPoolItem(t)) z.poolRevenue += amt;
      else if (isProductItem(t)) z.productSales += amt;
    }
  }

  return z;
}
