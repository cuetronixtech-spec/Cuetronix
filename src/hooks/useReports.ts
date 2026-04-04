import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays, subMonths, format, differenceInCalendarDays,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePreset =
  | "today" | "yesterday" | "this_week" | "this_month"
  | "last_month" | "last_3_months" | "this_year" | "all_time" | "custom";

export type DateRange = { from: Date; to: Date };

export type BillItem = {
  id: string;
  bill_id: string;
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
  customers: { name: string; phone: string | null } | null;
  bill_items: BillItem[];
};

export type Session = {
  id: string;
  station_id: string;
  customer_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  rate_per_hour: number | null;
  total_amount: number | null;
  status: string;
  stations: { name: string; type: string } | null;
};

export type Booking = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  amount: number;
  payment_status: string;
  stations: { name: string; type: string } | null;
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

// ─── Date range helpers ───────────────────────────────────────────────────────

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today",         label: "Today" },
  { key: "yesterday",     label: "Yesterday" },
  { key: "this_week",     label: "This Week" },
  { key: "this_month",    label: "This Month" },
  { key: "last_month",    label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "this_year",     label: "This Year" },
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
    case "all_time":      return { from: new Date("2020-01-01"),                to: endOfDay(now) };
    default:              return { from: startOfMonth(now),                     to: endOfMonth(now) };
  }
}

/** Compute the preceding period of the same length for comparison */
function priorPeriod(range: DateRange): DateRange {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  return {
    from: startOfDay(subDays(range.from, days)),
    to:   endOfDay(subDays(range.to, days)),
  };
}

// ─── CSV export helpers ───────────────────────────────────────────────────────

function csvRow(cells: (string | number | null | undefined)[]) {
  return cells.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",");
}

function downloadCsv(rows: string[], filename: string) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReports(tenantId: string | undefined, range: DateRange) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [prevBills, setPrevBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    setLoading(true);

    const from = range.from.toISOString();
    const to   = range.to.toISOString();
    const prior = priorPeriod(range);
    const priorFrom = prior.from.toISOString();
    const priorTo   = prior.to.toISOString();

    // bookings use DATE type
    const fromDate = format(range.from, "yyyy-MM-dd");
    const toDate   = format(range.to,   "yyyy-MM-dd");

    Promise.all([
      // Bills + items + customer
      supabase
        .from("bills")
        .select("id, bill_number, customer_id, subtotal, discount_amount, discount_type, total_amount, tax_amount, payment_method, payment_breakdown, loyalty_points_used, loyalty_points_earned, status, comp_note, created_at, customers(name, phone), bill_items(id, bill_id, item_type, name, qty, unit_price, discount, total_price)")
        .eq("tenant_id", tenantId)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false }),

      // Sessions + station
      supabase
        .from("sessions")
        .select("id, station_id, customer_id, started_at, ended_at, duration_mins, rate_per_hour, total_amount, status, stations(name, type)")
        .eq("tenant_id", tenantId)
        .gte("started_at", from)
        .lte("started_at", to)
        .order("started_at", { ascending: false }),

      // Bookings + station
      supabase
        .from("bookings")
        .select("id, booking_date, start_time, end_time, customer_name, customer_phone, status, amount, payment_status, stations(name, type)")
        .eq("tenant_id", tenantId)
        .gte("booking_date", fromDate)
        .lte("booking_date", toDate)
        .order("booking_date", { ascending: false }),

      // Prior-period bills for comparison (summary only — no items needed)
      supabase
        .from("bills")
        .select("id, total_amount, status, payment_method, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", priorFrom)
        .lte("created_at", priorTo),
    ]).then(([bRes, sRes, bkRes, prevRes]) => {
      if (cancelled) return;
      setBills((bRes.data ?? []) as unknown as Bill[]);
      setSessions((sRes.data ?? []) as unknown as Session[]);
      setBookings((bkRes.data ?? []) as unknown as Booking[]);
      setPrevBills((prevRes.data ?? []) as unknown as Bill[]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, range.from.toISOString(), range.to.toISOString()]);

  // ── Derived metrics ──────────────────────────────────────────────────────────

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

    // Daily revenue
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

    // Payment breakdown
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

  // ── Period-over-period deltas ────────────────────────────────────────────────

  const prevMetrics = useMemo((): PrevMetrics => {
    const paid = prevBills.filter(b => b.status !== "voided");
    const totalRevenue = paid.reduce((s, b) => s + Number(b.total_amount), 0);
    const totalBills   = paid.length;
    return {
      totalRevenue,
      totalBills,
      avgBillValue: totalBills > 0 ? totalRevenue / totalBills : 0,
      totalSessions: 0, // prev session count not fetched (low priority)
    };
  }, [prevBills]);

  // ── Export helpers ───────────────────────────────────────────────────────────

  const exportBills = useCallback((currencySymbol: string) => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = csvRow(["Bill #", "Date", "Customer", "Phone", "Payment Method", "Status",
      "Item Name", "Item Type", "Qty", "Unit Price", "Line Discount", "Line Total",
      "Bill Subtotal", "Bill Discount", "Bill Total"]);

    const rows: string[] = [header];
    bills.forEach(b => {
      if (b.bill_items && b.bill_items.length > 0) {
        b.bill_items.forEach(item => {
          rows.push(csvRow([
            b.bill_number ?? b.id.slice(0, 8),
            new Date(b.created_at).toLocaleString(),
            b.customers?.name ?? "",
            b.customers?.phone ?? "",
            b.payment_method,
            b.status,
            item.name, item.item_type, item.qty, item.unit_price, item.discount, item.total_price,
            b.subtotal, b.discount_amount, b.total_amount,
          ]));
        });
      } else {
        rows.push(csvRow([
          b.bill_number ?? b.id.slice(0, 8),
          new Date(b.created_at).toLocaleString(),
          b.customers?.name ?? "", b.customers?.phone ?? "",
          b.payment_method, b.status,
          "(no items)", "", "", "", "", "",
          b.subtotal, b.discount_amount, b.total_amount,
        ]));
      }
    });
    downloadCsv(rows, `Bills_Report_${dateStr}.csv`);
  }, [bills]);

  const exportSessions = useCallback(() => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = csvRow(["Session ID", "Station", "Station Type", "Started At", "Ended At", "Duration (mins)", "Rate/hr", "Total Amount", "Status"]);
    const rows = [
      header,
      ...sessions.map(s => csvRow([
        s.id.slice(0, 8),
        s.stations?.name ?? s.station_id,   // ← station name resolved
        s.stations?.type ?? "",
        new Date(s.started_at).toLocaleString(),
        s.ended_at ? new Date(s.ended_at).toLocaleString() : "",
        s.duration_mins ?? "",
        s.rate_per_hour ?? "",
        s.total_amount ?? "",
        s.status,
      ])),
    ];
    downloadCsv(rows, `Sessions_Report_${dateStr}.csv`);
  }, [sessions]);

  const exportBookings = useCallback(() => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const header = csvRow(["Date", "Start", "End", "Station", "Customer", "Phone", "Status", "Amount", "Payment Status"]);
    const rows = [
      header,
      ...bookings.map(b => csvRow([
        b.booking_date, b.start_time, b.end_time,
        b.stations?.name ?? "",
        b.customer_name, b.customer_phone,
        b.status, b.amount, b.payment_status,
      ])),
    ];
    downloadCsv(rows, `Bookings_Report_${dateStr}.csv`);
  }, [bookings]);

  return {
    loading, bills, sessions, bookings, metrics, prevMetrics,
    exportBills, exportSessions, exportBookings,
  };
}
