import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays, subMonths, subYears, format, differenceInCalendarDays,
  startOfISOWeek, getISOWeek, startOfMonth as sMonth,
} from "date-fns";
import type { ForecastBillInput } from "@/lib/reports/predictionEngine";
import { computeKpiStripFromBills, isPaidSaleBill } from "@/lib/reports/kpiFromBills";
import { downloadXlsxSheet } from "@/lib/reports/xlsxExport";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePreset =
  | "today" | "yesterday" | "this_week" | "this_month"
  | "last_month" | "last_3_months" | "this_year" | "last_year" | "all_time" | "custom";

export type DateRange = { from: Date; to: Date };

export type BillItem = {
  id: string;
  bill_id: string;
  product_id: string | null;
  item_type: string;
  name: string;
  qty: number;
  unit_price: number;
  discount: number;
  total_price: number;
};

export type Bill = {
  id: string;
  bill_number: string | null;
  customer_id: string | null;
  gateway_payment_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_type: string | null;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  payment_breakdown: Record<string, number>;
  loyalty_points_used: number;
  loyalty_points_earned: number;
  status: string;
  comp_note: string | null;
  created_at: string;
  customers: { name: string; phone: string | null; email: string | null } | null;
  bill_items: BillItem[];
};

export type Session = {
  id: string;
  station_id: string;
  customer_id: string | null;
  bill_id: string | null;
  coupon_code: string | null;
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  rate_per_hour: number | null;
  total_amount: number | null;
  status: string;
  stations: { name: string; type: string } | null;
  customers: { name: string } | null;
  bills: { discount_amount: number } | null;
};

export type Booking = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: string;
  amount: number;
  payment_status: string;
  payment_mode: string;
  coupon_code: string | null;
  discount_amount: number;
  gateway_order_id: string | null;
  stations: { name: string; type: string } | null;
};

export type ReportCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  membership_type: string;
  loyalty_points: number;
  created_at: string;
};

export type CustomerReportRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  membership_type: string;
  loyalty_points: number;
  joined_at: string;
  total_spent_range: number;
  play_time_mins: number;
};

export type CanteenProfitRow = {
  key: string;
  name: string;
  revenue: number;
  cost: number;
  margin: number;
};

export type SummaryMetrics = {
  totalRevenue: number;
  totalBills: number;
  avgBillValue: number;
  totalDiscount: number;
  totalSessions: number;
  completedSessions: number;
  totalBookings: number;
  bookingRevenue: number;
  cancellationRate: number;
  completionRate: number;
  compCount: number;
  compValue: number;
  topPaymentMethod: string;
  dailyRevenue: { date: string; revenue: number; bills: number }[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
};

export type PrevMetrics = {
  totalRevenue: number;
  totalBills: number;
  avgBillValue: number;
  totalSessions: number;
};

export type BusinessSummaryBlock = {
  financial: {
    totalRevenue: number;
    avgBill: number;
    totalDiscounts: number;
    cashPct: number;
    upiPct: number;
    compPct: number;
    highestRevenueDay: string | null;
    highestRevenueAmount: number;
  };
  operational: {
    totalTransactions: number;
    sessionsActiveOrDone: number;
    avgSessionMins: number;
    peakHour: number | null;
    topProduct: string | null;
    unitsSold: number;
  };
  customer: {
    customersInRange: number;
    members: number;
    membershipRate: number;
    avgSpendPerCustomer: number;
    loyaltyEarned: number;
    loyaltyUsed: number;
  };
};

// Re-export KPI type
export type { KpiStripMetrics } from "@/lib/reports/kpiFromBills";

// ─── Date presets ─────────────────────────────────────────────────────────────

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today",         label: "Today" },
  { key: "yesterday",     label: "Yesterday" },
  { key: "this_week",     label: "This Week" },
  { key: "this_month",    label: "This Month" },
  { key: "last_month",    label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "this_year",     label: "This Year" },
  { key: "last_year",     label: "Last Year" },
  { key: "all_time",      label: "All Time" },
  { key: "custom",        label: "Custom" },
];

export function presetToRange(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":         return { from: startOfDay(now),                      to: endOfDay(now) };
    case "yesterday":     return { from: startOfDay(subDays(now, 1)),           to: endOfDay(subDays(now, 1)) };
    case "this_week":     return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":    return { from: startOfMonth(now),                     to: endOfMonth(now) };
    case "last_month":    return { from: startOfMonth(subMonths(now, 1)),        to: endOfMonth(subMonths(now, 1)) };
    case "last_3_months": return { from: startOfMonth(subMonths(now, 2)),        to: endOfMonth(now) };
    case "this_year":     return { from: startOfYear(now),                      to: endOfYear(now) };
    case "last_year": {
      const ly = subYears(now, 1);
      return { from: startOfYear(ly), to: endOfYear(ly) };
    }
    case "all_time":      return { from: new Date("2020-01-01"),                to: endOfDay(now) };
    default:              return { from: startOfMonth(now),                     to: endOfMonth(now) };
  }
}

function priorPeriod(range: DateRange): DateRange {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  return {
    from: startOfDay(subDays(range.from, days)),
    to:   endOfDay(subDays(range.to, days)),
  };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const PAGE = 1000;

const BILL_SELECT =
  "id, bill_number, customer_id, gateway_payment_id, subtotal, discount_amount, discount_type, total_amount, tax_amount, payment_method, payment_breakdown, loyalty_points_used, loyalty_points_earned, status, comp_note, created_at, customers(name, phone, email), bill_items(id, bill_id, product_id, item_type, name, qty, unit_price, discount, total_price)";

async function fetchBillsForRange(tenantId: string, fromIso: string, toIso: string): Promise<Bill[]> {
  const rows: Bill[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("bills")
      .select(BILL_SELECT)
      .eq("tenant_id", tenantId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) break;
    const batch = (data ?? []) as unknown as Bill[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

async function fetchForecastBills(tenantId: string): Promise<ForecastBillInput[]> {
  const from = startOfDay(subDays(new Date(), 364)).toISOString();
  const rows: ForecastBillInput[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("bills")
      .select("created_at, total_amount, status, customer_id, bill_items(item_type, total_price)")
      .eq("tenant_id", tenantId)
      .gte("created_at", from)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) break;
    const batch = (data ?? []) as unknown as ForecastBillInput[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

async function fetchSessionCountsByDay(tenantId: string): Promise<Record<string, number>> {
  const from = startOfDay(subDays(new Date(), 364)).toISOString();
  const counts: Record<string, number> = {};
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("sessions")
      .select("started_at")
      .eq("tenant_id", tenantId)
      .gte("started_at", from)
      .order("started_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) break;
    const batch = data ?? [];
    for (const row of batch) {
      const day = (row as { started_at: string }).started_at.split("T")[0];
      counts[day] = (counts[day] || 0) + 1;
    }
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return counts;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReports(tenantId: string | undefined, range: DateRange) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [prevPeriodBills, setPrevPeriodBills] = useState<Bill[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reportCustomers, setReportCustomers] = useState<ReportCustomer[]>([]);
  const [productCosts, setProductCosts] = useState<{ id: string; name: string; cost_price: number | null; price: number }[]>([]);
  const [forecastBills, setForecastBills] = useState<ForecastBillInput[]>([]);
  const [sessionByDay, setSessionByDay] = useState<Record<string, number>>({});
  const [rangeExpenseTotal, setRangeExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadNonce, setLoadNonce] = useState(0);

  const refetch = useCallback(() => setLoadNonce(n => n + 1), []);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const from = range.from.toISOString();
    const to   = range.to.toISOString();
    const prior = priorPeriod(range);
    const priorFrom = prior.from.toISOString();
    const priorTo   = prior.to.toISOString();

    const fromDate = format(range.from, "yyyy-MM-dd");
    const toDate   = format(range.to,   "yyyy-MM-dd");

    void (async () => {
      const [
        bList, prevBList, sRes, bkRes, expRes, fcBills, sessMap, custRes, prodRes,
      ] = await Promise.all([
        fetchBillsForRange(tenantId, from, to),
        fetchBillsForRange(tenantId, priorFrom, priorTo),
        supabase
          .from("sessions")
          .select("id, station_id, customer_id, bill_id, coupon_code, started_at, ended_at, duration_mins, rate_per_hour, total_amount, status, stations(name, type), customers(name), bills(discount_amount)")
          .eq("tenant_id", tenantId)
          .gte("started_at", from)
          .lte("started_at", to)
          .order("started_at", { ascending: false }),

        supabase
          .from("bookings")
          .select("id, booking_date, start_time, end_time, customer_name, customer_phone, customer_email, status, amount, payment_status, payment_mode, coupon_code, discount_amount, gateway_order_id, stations(name, type)")
          .eq("tenant_id", tenantId)
          .gte("booking_date", fromDate)
          .lte("booking_date", toDate)
          .order("booking_date", { ascending: false }),

        supabase
          .from("expenses")
          .select("amount")
          .eq("tenant_id", tenantId)
          .gte("date", fromDate)
          .lte("date", toDate),

        fetchForecastBills(tenantId),
        fetchSessionCountsByDay(tenantId),

        supabase
          .from("customers")
          .select("id, name, phone, email, membership_type, loyalty_points, created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", from)
          .lte("created_at", to)
          .order("created_at", { ascending: false }),

        supabase
          .from("products")
          .select("id, name, cost_price, price")
          .eq("tenant_id", tenantId)
          .eq("is_active", true),
      ]);

      if (cancelled) return;

      setBills(bList);
      setPrevPeriodBills(prevBList);
      setSessions((sRes.data ?? []) as unknown as Session[]);
      setBookings((bkRes.data ?? []) as unknown as Booking[]);
      setReportCustomers((custRes.data ?? []) as unknown as ReportCustomer[]);
      setProductCosts((prodRes.data ?? []) as typeof productCosts);
      setForecastBills(fcBills);
      setSessionByDay(sessMap);

      const expRows = (expRes.data ?? []) as { amount: number }[];
      setRangeExpenseTotal(expRows.reduce((s, e) => s + Number(e.amount), 0));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, range.from.toISOString(), range.to.toISOString(), loadNonce]);

  const metrics = useMemo((): SummaryMetrics => {
    const paid = bills.filter(b => b.status !== "voided");

    const totalRevenue = paid.reduce((s, b) => s + Number(b.total_amount), 0);
    const totalBills   = paid.length;
    const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;
    const totalDiscount = paid.reduce((s, b) => s + Number(b.discount_amount ?? 0), 0);

    const completedSessions = sessions.filter(s => s.status === "completed").length;

    const paidBookings = bookings.filter(b => b.status !== "cancelled");
    const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
    const bookingRevenue = paidBookings.reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const cancellationRate = bookings.length > 0 ? (cancelledBookings / bookings.length) * 100 : 0;
    const completedBookings = bookings.filter(b => b.status === "completed").length;
    const completionRate = bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0;

    const comp = paid.filter(b => b.status === "complimentary" || b.payment_method === "complimentary");
    const compCount = comp.length;
    const compValue = comp.reduce((s, b) => s + Number(b.total_amount), 0);

    const dayMap: Record<string, { revenue: number; bills: number }> = {};
    paid.forEach(b => {
      const d = b.created_at.split("T")[0];
      if (!dayMap[d]) dayMap[d] = { revenue: 0, bills: 0 };
      dayMap[d].revenue += Number(b.total_amount);
      dayMap[d].bills++;
    });
    const dailyRevenue = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const pmMap: Record<string, { amount: number; count: number }> = {};
    paid.forEach(b => {
      const m = b.payment_method;
      if (!pmMap[m]) pmMap[m] = { amount: 0, count: 0 };
      pmMap[m].amount += Number(b.total_amount);
      pmMap[m].count++;
    });
    const paymentBreakdown = Object.entries(pmMap)
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount);

    const topPaymentMethod = paymentBreakdown[0]?.method ?? "—";

    return {
      totalRevenue, totalBills, avgBillValue, totalDiscount,
      totalSessions: sessions.length, completedSessions,
      totalBookings: bookings.length, bookingRevenue,
      cancellationRate, completionRate,
      compCount, compValue, topPaymentMethod,
      dailyRevenue, paymentBreakdown,
    };
  }, [bills, sessions, bookings]);

  const prevMetrics = useMemo((): PrevMetrics => {
    const paid = prevPeriodBills.filter(b => b.status !== "voided");
    const totalRevenue = paid.reduce((s, b) => s + Number(b.total_amount), 0);
    const totalBills   = paid.length;
    return {
      totalRevenue,
      totalBills,
      avgBillValue: totalBills > 0 ? totalRevenue / totalBills : 0,
      totalSessions: 0,
    };
  }, [prevPeriodBills]);

  const kpiStrip = useMemo(() => computeKpiStripFromBills(bills), [bills]);
  const kpiStripPrev = useMemo(() => computeKpiStripFromBills(prevPeriodBills), [prevPeriodBills]);

  const customerReportRows = useMemo((): CustomerReportRow[] => {
    return reportCustomers.map(c => {
      const total_spent_range = bills
        .filter(b => b.customer_id === c.id && isPaidSaleBill(b))
        .reduce((s, b) => s + Number(b.total_amount), 0);
      const play_time_mins = sessions
        .filter(s => s.customer_id === c.id)
        .reduce((s, x) => s + (x.duration_mins ?? 0), 0);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        membership_type: c.membership_type,
        loyalty_points: c.loyalty_points,
        joined_at: c.created_at,
        total_spent_range,
        play_time_mins,
      };
    });
  }, [reportCustomers, bills, sessions]);

  const canteenProfitRows = useMemo((): CanteenProfitRow[] => {
    const costMap = Object.fromEntries(productCosts.map(p => [p.id, p]));
    const acc: Record<string, CanteenProfitRow> = {};
    for (const b of bills) {
      if (b.status === "voided") continue;
      for (const it of b.bill_items ?? []) {
        if ((it.item_type || "").toLowerCase() !== "product" || !it.product_id) continue;
        const pid = it.product_id;
        const name = costMap[pid]?.name ?? it.name;
        const unitCost = Number(costMap[pid]?.cost_price ?? 0);
        const qty = Number(it.qty) || 0;
        const rev = Number(it.total_price);
        const cost = unitCost * qty;
        if (!acc[pid]) acc[pid] = { key: pid, name, revenue: 0, cost: 0, margin: 0 };
        acc[pid].revenue += rev;
        acc[pid].cost += cost;
      }
    }
    return Object.values(acc)
      .map(r => ({ ...r, margin: r.revenue - r.cost }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [bills, productCosts]);

  const businessSummary = useMemo((): BusinessSummaryBlock => {
    const paid = bills.filter(b => isPaidSaleBill(b));
    const totalRev = paid.reduce((s, b) => s + Number(b.total_amount), 0);
    const k = computeKpiStripFromBills(bills);

    let hiDay: string | null = null;
    let hiAmt = 0;
    const dm: Record<string, number> = {};
    paid.forEach(b => {
      const d = b.created_at.split("T")[0];
      dm[d] = (dm[d] || 0) + Number(b.total_amount);
    });
    Object.entries(dm).forEach(([d, v]) => {
      if (v > hiAmt) { hiAmt = v; hiDay = d; }
    });

    const hourBuckets = Array(24).fill(0);
    paid.forEach(b => {
      hourBuckets[new Date(b.created_at).getHours()] += Number(b.total_amount);
    });
    const peakHour = hourBuckets.reduce((best, v, h) => (v > hourBuckets[best] ? h : best), 0);
    const peakHourVal = Math.max(...hourBuckets);
    const peakHourFinal = peakHourVal > 0 ? peakHour : null;

    const prodRev: Record<string, { name: string; rev: number; units: number }> = {};
    paid.forEach(b => {
      (b.bill_items ?? []).forEach(it => {
        if ((it.item_type || "").toLowerCase() !== "product") return;
        const key = it.product_id || it.name;
        if (!prodRev[key]) prodRev[key] = { name: it.name, rev: 0, units: 0 };
        prodRev[key].rev += Number(it.total_price);
        prodRev[key].units += Number(it.qty);
      });
    });
    const topEntry = Object.values(prodRev).sort((a, b) => b.rev - a.rev)[0];

    const sessionDurations = sessions.filter(s => (s.duration_mins ?? 0) > 0);
    const avgSess = sessionDurations.length > 0
      ? sessionDurations.reduce((s, x) => s + (x.duration_mins || 0), 0) / sessionDurations.length
      : 0;

    const custIds = new Set(paid.map(b => b.customer_id).filter(Boolean) as string[]);
    const members = reportCustomers.filter(c => c.membership_type === "premium" || c.membership_type === "vip").length;

    const loyaltyEarned = paid.reduce((s, b) => s + (b.loyalty_points_earned || 0), 0);
    const loyaltyUsed = paid.reduce((s, b) => s + (b.loyalty_points_used || 0), 0);

    return {
      financial: {
        totalRevenue: totalRev,
        avgBill: paid.length ? totalRev / paid.length : 0,
        totalDiscounts: paid.reduce((s, b) => s + Number(b.discount_amount), 0),
        cashPct: totalRev > 0 ? (k.cashSales / totalRev) * 100 : 0,
        upiPct: totalRev > 0 ? (k.upiSales / totalRev) * 100 : 0,
        compPct: totalRev + k.complimentaryValue > 0 ? (k.complimentaryValue / (totalRev + k.complimentaryValue)) * 100 : 0,
        highestRevenueDay: hiDay,
        highestRevenueAmount: hiAmt,
      },
      operational: {
        totalTransactions: paid.length,
        sessionsActiveOrDone: sessions.length,
        avgSessionMins: avgSess,
        peakHour: peakHourFinal,
        topProduct: topEntry?.name ?? null,
        unitsSold: Object.values(prodRev).reduce((s, x) => s + x.units, 0),
      },
      customer: {
        customersInRange: custIds.size,
        members,
        membershipRate: reportCustomers.length > 0 ? (members / reportCustomers.length) * 100 : 0,
        avgSpendPerCustomer: custIds.size > 0 ? totalRev / custIds.size : 0,
        loyaltyEarned,
        loyaltyUsed,
      },
    };
  }, [bills, sessions, reportCustomers]);

  const trendChartData = useMemo(() => {
    const paid = bills.filter(b => b.status !== "voided");
    const days = differenceInCalendarDays(range.to, range.from) + 1;
    if (days <= 60) {
      const m: Record<string, { revenue: number; bills: number }> = {};
      paid.forEach(b => {
        const d = b.created_at.split("T")[0];
        if (!m[d]) m[d] = { revenue: 0, bills: 0 };
        m[d].revenue += Number(b.total_amount);
        m[d].bills += 1;
      });
      const keys = Object.keys(m).sort();
      return keys.map(k => ({
        label: new Date(k + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: m[k].revenue,
        bills: m[k].bills,
        key: k,
      }));
    }
    if (days <= 180) {
      const m: Record<string, { revenue: number; bills: number }> = {};
      paid.forEach(b => {
        const d = new Date(b.created_at);
        const ws = format(startOfISOWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
        if (!m[ws]) m[ws] = { revenue: 0, bills: 0 };
        m[ws].revenue += Number(b.total_amount);
        m[ws].bills += 1;
      });
      return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
        label: `W${getISOWeek(new Date(k + "T12:00:00"))}`,
        revenue: v.revenue,
        bills: v.bills,
        key: k,
      }));
    }
    const m: Record<string, { revenue: number; bills: number }> = {};
    paid.forEach(b => {
      const d = new Date(b.created_at);
      const mk = format(sMonth(d), "yyyy-MM");
      if (!m[mk]) m[mk] = { revenue: 0, bills: 0 };
      m[mk].revenue += Number(b.total_amount);
      m[mk].bills += 1;
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
      label: new Date(k + "-01T12:00:00").toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      revenue: v.revenue,
      bills: v.bills,
      key: k,
    }));
  }, [bills, range.from, range.to]);

  const exportBills = useCallback((_sym: string) => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = ["Bill #", "Date", "Customer", "Phone", "Email", "Payment Method", "Status",
      "Item Name", "Item Type", "Qty", "Unit Price", "Line Discount", "Line Total",
      "Bill Subtotal", "Bill Discount", "Bill Total", "Loyalty Used", "Loyalty Earned", "Comp Note"];
    const rows: (string | number | null | undefined)[][] = [header];
    bills.forEach(b => {
      const base = [
        b.bill_number ?? b.id.slice(0, 8),
        new Date(b.created_at).toLocaleString(),
        b.customers?.name ?? "",
        b.customers?.phone ?? "",
        b.customers?.email ?? "",
        b.payment_method,
        b.status,
      ];
      if (b.bill_items && b.bill_items.length > 0) {
        b.bill_items.forEach(item => {
          rows.push([
            ...base,
            item.name, item.item_type, item.qty, item.unit_price, item.discount, item.total_price,
            b.subtotal, b.discount_amount, b.total_amount, b.loyalty_points_used, b.loyalty_points_earned, b.comp_note ?? "",
          ]);
        });
      } else {
        rows.push([
          ...base,
          "(no items)", "", "", "", "", "",
          b.subtotal, b.discount_amount, b.total_amount, b.loyalty_points_used, b.loyalty_points_earned, b.comp_note ?? "",
        ]);
      }
    });
    downloadXlsxSheet(rows, "Bills", `Bills_Report_${dateStr}.xlsx`);
  }, [bills]);

  const exportSessions = useCallback(() => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = ["Session ID", "Station", "Type", "Customer", "Coupon", "Discount", "Started", "Ended", "Duration (m)", "Rate/hr", "Amount", "Status"];
    const rows: (string | number | null | undefined)[][] = [
      header,
      ...sessions.map(s => [
        s.id,
        s.stations?.name ?? s.station_id,
        s.stations?.type ?? "",
        s.customers?.name ?? "",
        s.coupon_code ?? "",
        s.bills?.discount_amount ?? "",
        new Date(s.started_at).toLocaleString(),
        s.ended_at ? new Date(s.ended_at).toLocaleString() : "",
        s.duration_mins ?? "",
        s.rate_per_hour ?? "",
        s.total_amount ?? "",
        s.status,
      ]),
    ];
    downloadXlsxSheet(rows, "Sessions", `Sessions_Report_${dateStr}.xlsx`);
  }, [sessions]);

  const exportBookings = useCallback(() => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = ["Date", "Slot Start", "Slot End", "Station", "Customer", "Phone", "Email", "Status", "Amount", "Payment", "Mode / Source", "Coupon", "Discount"];
    const rows: (string | number | null | undefined)[][] = [
      header,
      ...bookings.map(b => [
        b.booking_date,
        b.start_time,
        b.end_time,
        b.stations?.name ?? "",
        b.customer_name,
        b.customer_phone,
        b.customer_email ?? "",
        b.status,
        b.amount,
        b.payment_status,
        b.payment_mode,
        b.coupon_code ?? "",
        b.discount_amount ?? "",
      ]),
    ];
    downloadXlsxSheet(rows, "Bookings", `Bookings_Report_${dateStr}.xlsx`);
  }, [bookings]);

  const exportCustomers = useCallback(() => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = ["Name", "Phone", "Email", "Membership", "Total Spent (range)", "Play Time (mins)", "Loyalty Points", "Joined On"];
    const rows: (string | number | null | undefined)[][] = [
      header,
      ...customerReportRows.map(c => [
        c.name,
        c.phone ?? "",
        c.email ?? "",
        c.membership_type,
        c.total_spent_range,
        c.play_time_mins,
        c.loyalty_points,
        new Date(c.joined_at).toLocaleString(),
      ]),
    ];
    downloadXlsxSheet(rows, "Customers", `Customers_Report_${dateStr}.xlsx`);
  }, [customerReportRows]);

  const currentMonthSales = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return forecastBills
      .filter(b => b.status !== "voided")
      .filter(b => {
        const t = new Date(b.created_at);
        return t >= start && t <= end;
      })
      .reduce((s, b) => s + Number(b.total_amount), 0);
  }, [forecastBills]);

  return {
    loading, bills, sessions, bookings, metrics, prevMetrics,
    prevPeriodBills,
    forecastBills, sessionByDay, rangeExpenseTotal, currentMonthSales,
    reportCustomers, customerReportRows, canteenProfitRows,
    kpiStrip, kpiStripPrev,
    businessSummary, trendChartData,
    refetch,
    exportBills, exportSessions, exportBookings, exportCustomers,
  };
}
