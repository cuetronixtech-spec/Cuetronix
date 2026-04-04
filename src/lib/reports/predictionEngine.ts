/**
 * Client-side heuristic revenue forecasting (ensemble + seasonal + MACD).
 * Pure TypeScript — no external ML.
 */

import {
  format,
  addDays,
  getDay,
  getDate,
  getMonth,
  startOfDay,
  subDays,
  endOfMonth,
  differenceInCalendarDays,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForecastBillInput = {
  created_at: string;
  total_amount: number;
  status: string;
  customer_id: string | null;
  bill_items?: { item_type: string; total_price: number }[];
};

export type EnhancedDailyData = {
  date: string;
  revenue: number;
  productSales: number;
  customerCount: number;
  sessionCount: number;
  dayOfWeek: number;
  month: number;
  weekOfYear: number;
  dayOfMonth: number;
  isWeekend: boolean;
  isMonthStart: boolean;
  isMonthEnd: boolean;
  isHoliday: boolean;
  isSpecialEvent: boolean;
};

export type ConfidenceFactors = {
  dataQuality: number;
  consistency: number;
  trendStability: number;
  seasonalClarity: number;
  dataDiversity: number;
};

export type ModelOutput = {
  name: string;
  forecast: number;
  confidence: number;
  trend: "up" | "down" | "stable";
  confidenceFactors: ConfidenceFactors;
};

export type EnsembleResult = {
  forecast: number;
  confidence: number;
  trend: "up" | "down" | "stable";
  agreement: number;
  modelResults: (ModelOutput & { weight: number })[];
  confidenceFactors: ConfidenceFactors;
};

export type MacdSignal = "bullish" | "bearish" | "neutral";

export type SevenDayPoint = {
  date: string;
  label: string;
  forecast: number;
  low: number;
  high: number;
  isWeekend: boolean;
  isHoliday: boolean;
};

export type BusinessInsightResult = {
  todaySales: number;
  yesterdaySales: number;
  dayOverDayPct: number | null;
  tomorrowForecast: EnsembleResult;
  sevenDay: SevenDayPoint[];
  macd: { signal: MacdSignal; histogram: number };
  monthlyProjectedTotal: number;
  monthlyProgressPct: number;
  daysOfHistory: number;
  netProfit: number;
  profitMarginPct: number;
  expenseToRevenuePct: number;
  brandLabel: string;
};

export type SeasonalFactors = {
  dayFactor: number[];
  monthFactor: number[];
  weekendMult: number;
  weekdayMult: number;
  overallAvg: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function std(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(mean(nums.map(x => (x - m) ** 2)));
}

function iqr(nums: number[]) {
  if (nums.length < 4) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  };
  return q(0.75) - q(0.25);
}

function weekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days = differenceInCalendarDays(startOfDay(d), startOfDay(start));
  return Math.floor(days / 7);
}

function easterSunday(y: number): Date {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function ymd(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Published calendar dates for major Indian festivals (approximate; extend as needed). */
const EXTRA_HOLIDAYS: Record<number, string[]> = {
  2024: ["2024-03-25", "2024-03-29", "2024-04-11", "2024-06-17", "2024-07-21", "2024-08-15", "2024-08-26", "2024-10-02", "2024-11-01", "2024-11-15", "2024-12-25"],
  2025: ["2025-03-14", "2025-03-30", "2025-04-18", "2025-06-07", "2025-07-06", "2025-08-15", "2025-08-16", "2025-10-02", "2025-10-20", "2025-11-05", "2025-12-25"],
  2026: ["2026-03-04", "2026-03-27", "2026-04-21", "2026-05-27", "2026-06-27", "2026-08-15", "2026-08-24", "2026-10-02", "2026-11-08", "2026-11-25", "2026-12-25"],
  2027: ["2027-03-22", "2027-03-31", "2027-04-10", "2027-05-17", "2027-06-16", "2027-08-15", "2027-08-14", "2027-10-02", "2027-10-29", "2027-11-05", "2027-12-25"],
};

export function isHoliday(d: Date): boolean {
  const y = d.getFullYear();
  const m = getMonth(d) + 1;
  const day = getDate(d);
  // Fixed India / universal
  if (m === 1 && day === 1) return true;
  if (m === 1 && day === 26) return true;
  if (m === 8 && day === 15) return true;
  if (m === 10 && day === 2) return true;
  if (m === 12 && day === 25) return true;

  const es = easterSunday(y);
  const gf = subDays(es, 2);
  const em = addDays(es, 1);
  const ds = ymd(d);
  if (ds === ymd(gf) || ds === ymd(em)) return true;

  const extras = EXTRA_HOLIDAYS[y];
  if (extras?.includes(ds)) return true;
  return false;
}

// ─── Build daily series ───────────────────────────────────────────────────────

export function buildDailyFromForecastBills(
  bills: ForecastBillInput[],
  sessionByDay: Record<string, number> = {},
): EnhancedDailyData[] {
  const paid = bills.filter(b => b.status !== "voided");
  type Acc = {
    revenue: number;
    productSales: number;
    customers: Set<string>;
    sessions: number;
  };
  const map: Record<string, Acc> = {};

  for (const b of paid) {
    const day = b.created_at.split("T")[0];
    if (!map[day]) {
      map[day] = {
        revenue: 0,
        productSales: 0,
        customers: new Set(),
        sessions: 0,
      };
    }
    map[day].revenue += Number(b.total_amount);
    if (b.customer_id) map[day].customers.add(b.customer_id);
    const items = b.bill_items ?? [];
    for (const it of items) {
      const t = (it.item_type || "").toLowerCase();
      if (t === "product" || t === "canteen") {
        map[day].productSales += Number(it.total_price);
      }
      if (t === "session" || t === "ps5" || t === "pool" || t === "table") {
        map[day].sessions += 1;
      }
    }
  }

  const dates = Object.keys(map).sort();
  const overallAvg =
    dates.length > 0 ? mean(dates.map(d => map[d].revenue)) : 0;

  const wdMonthAvg: Record<string, number[]> = {};
  for (const dstr of dates) {
    const dt = new Date(dstr + "T12:00:00");
    const dow = getDay(dt);
    const mo = getMonth(dt);
    const key = `${dow}-${mo}`;
    if (!wdMonthAvg[key]) wdMonthAvg[key] = [];
    wdMonthAvg[key].push(map[dstr].revenue);
  }
  const wdMonthMeans = Object.fromEntries(
    Object.entries(wdMonthAvg).map(([k, v]) => [k, mean(v)]),
  );

  return dates.map(dstr => {
    const dt = new Date(dstr + "T12:00:00");
    const dow = getDay(dt);
    const mo = getMonth(dt);
    const key = `${dow}-${mo}`;
    const comboAvg = wdMonthMeans[key] ?? overallAvg;
    const isSpecial = overallAvg > 0 && comboAvg >= overallAvg * 1.5;

    const acc = map[dstr];
    const extSess = sessionByDay[dstr] ?? 0;
    return {
      date: dstr,
      revenue: acc.revenue,
      productSales: acc.productSales,
      customerCount: acc.customers.size,
      sessionCount: Math.max(acc.sessions, extSess),
      dayOfWeek: dow,
      month: mo,
      weekOfYear: weekOfYear(dt),
      dayOfMonth: getDate(dt),
      isWeekend: dow === 0 || dow === 6,
      isMonthStart: getDate(dt) <= 3,
      isMonthEnd: getDate(dt) >= 28,
      isHoliday: isHoliday(dt),
      isSpecialEvent: isSpecial,
    };
  });
}

// ─── Seasonal factors ───────────────────────────────────────────────────────────

export function calculateSeasonalFactors(data: EnhancedDailyData[]): SeasonalFactors {
  const overallAvg = data.length ? mean(data.map(d => d.revenue)) : 1;
  const safeAvg = overallAvg <= 0 ? 1 : overallAvg;

  const dayFactor = Array.from({ length: 7 }, (_, dow) => {
    const xs = data.filter(d => d.dayOfWeek === dow).map(d => d.revenue);
    return xs.length ? mean(xs) / safeAvg : 1;
  });
  const monthFactor = Array.from({ length: 12 }, (_, mo) => {
    const xs = data.filter(d => d.month === mo).map(d => d.revenue);
    return xs.length ? mean(xs) / safeAvg : 1;
  });
  const wend = data.filter(d => d.isWeekend).map(d => d.revenue);
  const wday = data.filter(d => !d.isWeekend).map(d => d.revenue);
  const wendAvg = wend.length ? mean(wend) : safeAvg;
  const wdayAvg = wday.length ? mean(wday) : safeAvg;
  const weekendMult = wdayAvg > 0 ? wendAvg / wdayAvg : 1;
  const weekdayMult = wendAvg > 0 ? wdayAvg / wendAvg : 1;

  return { dayFactor, monthFactor, weekendMult, weekdayMult, overallAvg: safeAvg };
}

function seasonMultForDate(sf: SeasonalFactors, d: Date) {
  const dow = getDay(d);
  const mo = getMonth(d);
  const wk = dow === 0 || dow === 6;
  const df = sf.dayFactor[dow] ?? 1;
  const mf = sf.monthFactor[mo] ?? 1;
  const wf = wk ? sf.weekendMult : sf.weekdayMult;
  return (df + mf + wf) / 3;
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function calculateEnhancedConfidence(input: {
  historyDays: number;
  seasonallyAdjRevenues: number[];
  trendStrength: number;
  seasonalFactorStd: number;
  diversityScore: number;
}): { factors: ConfidenceFactors; score: number } {
  const dq = clamp((input.historyDays / 330) * 100, 0, 100);
  const iq = iqr(input.seasonallyAdjRevenues);
  const med = median(input.seasonallyAdjRevenues);
  const cv = med > 0 ? iq / med : 1;
  let consistency = clamp(100 - cv * 80, 0, 100);
  if (input.seasonallyAdjRevenues.length < 7) consistency *= 0.7;

  const trendStability = clamp(Math.min(1, Math.abs(input.trendStrength)) * 130, 0, 100);
  const seasonalClarity = clamp(input.seasonalFactorStd * 50, 0, 100);
  const dataDiversity = input.diversityScore * 100;

  const raw =
    dq * 0.3 +
    consistency * 0.3 +
    trendStability * 0.2 +
    seasonalClarity * 0.12 +
    dataDiversity * 0.08;

  const score = clamp(raw, 25, 95);
  const factors: ConfidenceFactors = {
    dataQuality: clamp(dq, 0, 100),
    consistency: clamp(consistency, 0, 100),
    trendStability: clamp(trendStability, 0, 100),
    seasonalClarity: clamp(seasonalClarity, 0, 100),
    dataDiversity: clamp(dataDiversity, 0, 100),
  };
  return { factors, score };
}

// ─── Holt linear exponential smoothing ─────────────────────────────────────────

function holtLinear(series: number[], alpha: number, beta: number): { level: number; trend: number } {
  if (series.length === 0) return { level: 0, trend: 0 };
  let level = series[0];
  let trend = series.length > 1 ? series[1] - series[0] : 0;
  for (let i = 1; i < series.length; i++) {
    const x = series[i];
    const prevLevel = level;
    level = alpha * x + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return { level, trend };
}

function olsLinear(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const slope = den > 1e-9 ? num / den : 0;
  const intercept = my - slope * mx;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * xs[i] + intercept;
    ssRes += (ys[i] - pred) ** 2;
  }
  const r2 = ssTot > 1e-9 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2: clamp(r2, 0, 1) };
}

function ema(series: number[], span: number): number[] {
  if (series.length === 0) return [];
  const k = 2 / (span + 1);
  const out: number[] = [series[0]];
  for (let i = 1; i < series.length; i++) {
    out.push(series[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

// ─── Model runners ────────────────────────────────────────────────────────────

type Ctx = {
  data: EnhancedDailyData[];
  sf: SeasonalFactors;
  revenues: number[];
  targetDate: Date;
};

function baseConfidence(ctx: Ctx, trendStrength: number, diversityBonus: number): { factors: ConfidenceFactors; score: number } {
  const adj = ctx.data.map((d, i) => {
    const dt = new Date(d.date + "T12:00:00");
    const inv = 1 / Math.max(0.2, seasonMultForDate(ctx.sf, dt));
    return d.revenue * inv;
  });
  const allF = [...ctx.sf.dayFactor, ...ctx.sf.monthFactor, ctx.sf.weekendMult, ctx.sf.weekdayMult];
  const seasonalFactorStd = std(allF);
  return calculateEnhancedConfidence({
    historyDays: ctx.data.length,
    seasonallyAdjRevenues: adj,
    trendStrength,
    seasonalFactorStd,
    diversityScore: diversityBonus,
  });
}

function trendFromDelta(recent: number, older: number): "up" | "down" | "stable" {
  if (older <= 0) return "stable";
  const ch = (recent - older) / older;
  if (ch > 0.03) return "up";
  if (ch < -0.03) return "down";
  return "stable";
}

function modelHoltWinters(ctx: Ctx): ModelOutput {
  const { revenues, sf, targetDate } = ctx;
  const alpha = 0.35;
  const beta = revenues.length > 10 ? 0.12 : 0.2;
  const { level, trend } = holtLinear(revenues, alpha, beta);
  let fc = level + trend;
  const seas = seasonMultForDate(sf, targetDate);
  fc *= seas;

  const overall = mean(revenues);
  const last7 = revenues.slice(-7);
  const r7 = last7.length ? mean(last7) : overall;
  const surge = overall > 0 && r7 >= overall * 1.1;
  if (surge) fc = fc * 0.6 + r7 * seas * 0.4;

  const tr = trendFromDelta(r7, overall);
  const conf = baseConfidence(ctx, trend / (overall || 1), last7.length >= 3 ? 0.85 : 0.5);
  return {
    name: "Holt-Winters",
    forecast: Math.max(0, fc),
    confidence: conf.score,
    trend: tr,
    confidenceFactors: conf.factors,
  };
}

function modelProphetStyle(ctx: Ctx): ModelOutput {
  const xs = ctx.revenues.map((_, i) => i);
  const { slope, intercept, r2 } = olsLinear(xs, ctx.revenues);
  const nextX = xs.length;
  let fc = slope * nextX + intercept;
  const wk = getDay(targetDate(ctx)) === 0 || getDay(targetDate(ctx)) === 6;
  fc *= wk ? ctx.sf.weekendMult : ctx.sf.weekdayMult;
  fc *= seasonMultForDate(ctx.sf, targetDate(ctx));

  const overall = mean(ctx.revenues);
  const r7 = mean(ctx.revenues.slice(-7));
  if (overall > 0 && r7 >= overall * 1.15) {
    fc = fc * 0.4 + r7 * (wk ? ctx.sf.weekendMult : ctx.sf.weekdayMult) * 0.6;
  }

  const trStrength = slope / (overall || 1);
  const conf = baseConfidence(ctx, trStrength, 0.75);
  let score = conf.score + r2 * 25;
  score = clamp(score, 25, 95);
  return {
    name: "Prophet-Style",
    forecast: Math.max(0, fc),
    confidence: score,
    trend: slope > overall * 0.001 ? "up" : slope < -overall * 0.001 ? "down" : "stable",
    confidenceFactors: conf.factors,
  };
}

/** `ctx.targetDate` must be read for seasonal — use mutable ref via closure */
function targetDate(ctx: Ctx): Date {
  return ctx.targetDate;
}

function modelMovingAvg(ctx: Ctx): ModelOutput {
  const w = ctx.revenues.slice(-7);
  const base = w.length ? mean(w) : 0;
  const fc = base * seasonMultForDate(ctx.sf, ctx.targetDate);
  const half = Math.floor(w.length / 2);
  const first = half > 0 ? mean(w.slice(0, half)) : base;
  const second = half > 0 ? mean(w.slice(half)) : base;
  const tr = trendFromDelta(second, first);
  const iq = iqr(w);
  const bonus = iq < base * 0.5 ? 1 : 0.85;
  const conf = baseConfidence(ctx, (second - first) / (base || 1), bonus);
  return {
    name: "7d Weighted MA",
    forecast: Math.max(0, fc),
    confidence: conf.score,
    trend: tr,
    confidenceFactors: conf.factors,
  };
}

function modelArimaStyle(ctx: Ctx): ModelOutput {
  const r = ctx.revenues;
  if (r.length < 4) {
    const conf = baseConfidence(ctx, 0, 0.4);
    return {
      name: "ARIMA-Style",
      forecast: Math.max(0, mean(r)),
      confidence: conf.score * 0.8,
      trend: "stable",
      confidenceFactors: conf.factors,
    };
  }
  const diff: number[] = [];
  for (let i = 1; i < r.length; i++) diff.push(r[i] - r[i - 1]);
  const weights = mean(r.slice(-7)) >= mean(r) * 1.1 ? [0.5, 0.3, 0.15, 0.05] : [0.4, 0.3, 0.2, 0.1];
  let ar = 0;
  const L = diff.length;
  for (let k = 0; k < 4 && k < L; k++) {
    ar += weights[k] * diff[L - 1 - k];
  }
  const residuals = diff.slice(-5).map((d, i, a) => (i === 0 ? d : d - a[i - 1]));
  const ma = residuals.slice(-2).length ? mean(residuals.slice(-2)) : 0;
  const last = r[r.length - 1];
  const overall = mean(r);
  const r7 = mean(r.slice(-7));
  let baseline = last + ar * 0.6 + ma * 0.4;
  if (overall > 0 && r7 >= overall * 1.1) baseline = baseline * 0.5 + r7 * 0.5;
  const fc = baseline * seasonMultForDate(ctx.sf, ctx.targetDate);
  const fv = std(r);
  const fitBoost = fv > 0 ? clamp(1 - std(diff) / fv, 0, 1) * 15 : 0;
  const conf = baseConfidence(ctx, ar / (fv || 1), 0.7);
  return {
    name: "ARIMA-Style",
    forecast: Math.max(0, fc),
    confidence: clamp(conf.score + fitBoost, 25, 95),
    trend: ar > 0 ? "up" : ar < 0 ? "down" : "stable",
    confidenceFactors: conf.factors,
  };
}

function modelSeasonalDecomp(ctx: Ctx): ModelOutput {
  const r = ctx.revenues;
  const n = r.length;
  if (n < 3) {
    const conf = baseConfidence(ctx, 0, 0.4);
    return {
      name: "Seasonal Decomposition",
      forecast: Math.max(0, mean(r)),
      confidence: conf.score * 0.85,
      trend: "stable",
      confidenceFactors: conf.factors,
    };
  }
  const win = clamp(Math.min(7, Math.floor(n / 4)), 1, 7);
  const trendComp: number[] = [];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - Math.floor(win / 2));
    const hi = Math.min(n - 1, i + Math.floor(win / 2));
    const slice = r.slice(lo, hi + 1);
    trendComp.push(mean(slice));
  }
  const slope = (trendComp[n - 1] - trendComp[0]) / Math.max(1, n - 1);
  const nextTrend = trendComp[n - 1] + slope;
  const d = targetDate(ctx);
  const wkEnd = getDay(d) === 0 || getDay(d) === 6;
  const compound = (ctx.sf.dayFactor[getDay(d)] + ctx.sf.monthFactor[getMonth(d)] + (wkEnd ? ctx.sf.weekendMult : ctx.sf.weekdayMult)) / 3;
  const fc = nextTrend * compound;
  const seasStrength = std(ctx.sf.dayFactor) + std(ctx.sf.monthFactor);
  const conf = baseConfidence(ctx, slope / (mean(r) || 1), 0.75);
  let score = conf.score + clamp(seasStrength * 10, 0, 10);
  score = clamp(score, 25, 95);
  return {
    name: "Seasonal Decomposition",
    forecast: Math.max(0, fc),
    confidence: score,
    trend: slope > 0 ? "up" : slope < 0 ? "down" : "stable",
    confidenceFactors: conf.factors,
  };
}

function modelLstmStyle(ctx: Ctx): ModelOutput {
  const r = ctx.revenues;
  if (r.length < 14) {
    const conf = baseConfidence(ctx, 0, 0.45);
    return {
      name: "Pattern Match",
      forecast: Math.max(0, mean(r.slice(-7))),
      confidence: conf.score * 0.85,
      trend: "stable",
      confidenceFactors: conf.factors,
    };
  }
  const seqLen = 7;
  const cur = r.slice(-seqLen);
  const dist: { d: number; next: number }[] = [];
  for (let i = 0; i <= r.length - seqLen - 1; i++) {
    const cand = r.slice(i, i + seqLen);
    let s = 0;
    for (let j = 0; j < seqLen; j++) s += (cand[j] - cur[j]) ** 2;
    dist.push({ d: Math.sqrt(s), next: r[i + seqLen] });
  }
  const minD = Math.min(...dist.map(x => x.d));
  const close = dist.filter(x => x.d <= minD * 2 || minD === 0);
  let fc = mean(close.map(x => x.next));
  fc *= seasonMultForDate(ctx.sf, ctx.targetDate);
  const patternConf = minD > 0 ? clamp(1 / (1 + minD / (mean(cur) || 1)), 0, 1) : 0.9;
  const conf = baseConfidence(ctx, (cur[seqLen - 1] - cur[0]) / (mean(cur) || 1), patternConf);
  let score = conf.score + patternConf * 20;
  score = clamp(score, 25, 95);
  return {
    name: "Pattern Match",
    forecast: Math.max(0, fc),
    confidence: score,
    trend: trendFromDelta(mean(cur.slice(-3)), mean(cur.slice(0, 3))),
    confidenceFactors: conf.factors,
  };
}

// ─── Ensemble ─────────────────────────────────────────────────────────────────

export function multiModelEnsemble(ctx: Ctx): EnsembleResult {
  const models = [
    modelHoltWinters(ctx),
    modelProphetStyle(ctx),
    modelMovingAvg(ctx),
    modelArimaStyle(ctx),
    modelSeasonalDecomp(ctx),
    modelLstmStyle(ctx),
  ];
  const forecasts = models.map(m => m.forecast);
  const med = median(forecasts.filter(f => f > 0));
  const filtered = models.filter(m => med <= 0 || (m.forecast >= med * 0.1 && m.forecast <= med * 10));
  const useModels = filtered.length ? filtered : models;
  const sumConf = useModels.reduce((s, m) => s + m.confidence, 0);
  const weighted =
    sumConf > 0
      ? useModels.reduce((s, m) => s + (m.forecast * m.confidence) / sumConf, 0)
      : mean(useModels.map(m => m.forecast));

  const fvals = useModels.map(m => m.forecast);
  const cov = std(fvals) / (mean(fvals) || 1);
  let agreement = clamp(100 - cov * 100, 0, 100);
  const band =
    fvals.length > 1
      ? fvals.every(v => Math.abs(v - mean(fvals)) <= mean(fvals) * 0.3)
      : true;
  if (band) agreement = Math.min(100, agreement + 15);

  let conf =
    useModels.reduce((s, m) => s + m.confidence, 0) / useModels.length;
  if (agreement > 85) conf *= 1.15;
  else if (agreement > 70) conf *= 1.1;
  else if (agreement > 55) conf *= 1.05;
  if (ctx.data.length >= 270) conf *= 1.05;
  conf = clamp(conf, 25, 95);

  const votes = { up: 0, down: 0, stable: 0 };
  for (const m of useModels) {
    const w = m.confidence;
    if (m.trend === "up") votes.up += w;
    else if (m.trend === "down") votes.down += w;
    else votes.stable += w;
  }
  let trend: "up" | "down" | "stable" = "stable";
  if (votes.up > votes.down && votes.up > votes.stable) trend = "up";
  else if (votes.down > votes.up && votes.down > votes.stable) trend = "down";

  const modelResults = useModels.map(m => ({
    ...m,
    weight: sumConf > 0 ? m.confidence / sumConf : 1 / useModels.length,
  }));

  const avgFactors: ConfidenceFactors = {
    dataQuality: mean(useModels.map(m => m.confidenceFactors.dataQuality)),
    consistency: mean(useModels.map(m => m.confidenceFactors.consistency)),
    trendStability: mean(useModels.map(m => m.confidenceFactors.trendStability)),
    seasonalClarity: mean(useModels.map(m => m.confidenceFactors.seasonalClarity)),
    dataDiversity: mean(useModels.map(m => m.confidenceFactors.dataDiversity)),
  };

  return {
    forecast: Math.max(0, weighted),
    confidence: conf,
    trend,
    agreement,
    modelResults,
    confidenceFactors: avgFactors,
  };
}

// ─── MACD ─────────────────────────────────────────────────────────────────────

export function calculateMACD(revenues: number[]): { signal: MacdSignal; histogram: number } {
  if (revenues.length < 26) return { signal: "neutral", histogram: 0 };
  const e12 = ema(revenues, 12);
  const e26 = ema(revenues, 26);
  const i = e12.length - 1;
  const macd = e12[i] - e26[i];
  const signal = macd * 0.2;
  const hist = macd - signal;
  if (hist > 1e-6) return { signal: "bullish", histogram: hist };
  if (hist < -1e-6) return { signal: "bearish", histogram: hist };
  return { signal: "neutral", histogram: hist };
}

// ─── 7-day iterative forecast ─────────────────────────────────────────────────

function syntheticRow(dateStr: string, revenue: number, template: EnhancedDailyData): EnhancedDailyData {
  const dt = new Date(dateStr + "T12:00:00");
  const ratio = template.revenue > 0 ? template.productSales / template.revenue : 0;
  const cust = template.customerCount;
  const sess = template.sessionCount;
  return {
    date: dateStr,
    revenue,
    productSales: revenue * ratio,
    customerCount: cust,
    sessionCount: sess,
    dayOfWeek: getDay(dt),
    month: getMonth(dt),
    weekOfYear: weekOfYear(dt),
    dayOfMonth: getDate(dt),
    isWeekend: getDay(dt) === 0 || getDay(dt) === 6,
    isMonthStart: getDate(dt) <= 3,
    isMonthEnd: getDate(dt) >= 28,
    isHoliday: isHoliday(dt),
    isSpecialEvent: template.isSpecialEvent,
  };
}

export function forecastSevenDays(data: EnhancedDailyData[]): SevenDayPoint[] {
  if (data.length === 0) return [];
  const sf = calculateSeasonalFactors(data);
  const template = data[data.length - 1];
  let work = [...data];
  const lastDate = new Date(work[work.length - 1].date + "T12:00:00");
  const outs: SevenDayPoint[] = [];

  for (let h = 1; h <= 7; h++) {
    const target = addDays(lastDate, h);
    const tStr = ymd(target);
    const ctx: Ctx = {
      data: work,
      sf,
      revenues: work.map(d => d.revenue),
      targetDate: target,
    };
    const ens = multiModelEnsemble(ctx);
    const fvals = ens.modelResults.map(m => m.forecast);
    const sd = std(fvals);
    outs.push({
      date: tStr,
      label: format(target, "EEE"),
      forecast: ens.forecast,
      low: Math.max(0, ens.forecast - sd),
      high: ens.forecast + sd,
      isWeekend: getDay(target) === 0 || getDay(target) === 6,
      isHoliday: isHoliday(target),
    });
    work = [...work, syntheticRow(tStr, ens.forecast, template)];
  }
  return outs;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export type ComputeInsightsInput = {
  /** Last up to 365 days of paid business days (sparse ok). */
  dailyHistory: EnhancedDailyData[];
  /** Sum of paid revenue in the selected report range. */
  rangeRevenue: number;
  /** Sum of expenses in the selected report range. */
  rangeExpenses: number;
  /** Calendar-month projection inputs */
  now: Date;
  currentMonthSales: number;
};

export function computeBusinessInsights(input: ComputeInsightsInput): BusinessInsightResult {
  const { dailyHistory, rangeRevenue, rangeExpenses, now, currentMonthSales } = input;
  const data = [...dailyHistory].sort((a, b) => a.date.localeCompare(b.date));
  const revenues = data.map(d => d.revenue);
  const sf = calculateSeasonalFactors(data);

  const todayStr = ymd(startOfDay(now));
  const yestStr = ymd(startOfDay(subDays(now, 1)));
  const todaySales = data.find(d => d.date === todayStr)?.revenue ?? 0;
  const yesterdaySales = data.find(d => d.date === yestStr)?.revenue ?? 0;
  const dayOverDayPct =
    yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : null;

  const tomorrow = addDays(startOfDay(now), 1);
  const tomorrowCtx: Ctx = {
    data,
    sf,
    revenues,
    targetDate: tomorrow,
  };
  const tomorrowForecast = multiModelEnsemble(tomorrowCtx);
  const sevenDay = forecastSevenDays(data);
  const macd = calculateMACD(revenues);

  const dim = getDate(endOfMonth(now));
  const elapsed = getDate(now);
  const projected =
    elapsed > 0 ? (currentMonthSales / elapsed) * dim : currentMonthSales;
  const monthlyProgressPct =
    projected > 0 ? clamp((currentMonthSales / projected) * 100, 0, 100) : 0;

  const netProfit = rangeRevenue - rangeExpenses;
  const profitMarginPct = rangeRevenue > 0 ? (netProfit / rangeRevenue) * 100 : 0;
  const expenseToRevenuePct = rangeRevenue > 0 ? (rangeExpenses / rangeRevenue) * 100 : 0;

  return {
    todaySales,
    yesterdaySales,
    dayOverDayPct,
    tomorrowForecast,
    sevenDay,
    macd,
    monthlyProjectedTotal: projected,
    monthlyProgressPct,
    daysOfHistory: data.length,
    netProfit,
    profitMarginPct,
    expenseToRevenuePct,
    brandLabel: "Cuephoria Quantum AI",
  };
}
