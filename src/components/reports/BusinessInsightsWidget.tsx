import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Info, Activity, Target, Brain,
} from "lucide-react";
import type { BusinessInsightResult } from "@/lib/reports/predictionEngine";

function TrendIcon({ t }: { t: "up" | "down" | "stable" }) {
  if (t === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (t === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function MacdBadge({ signal }: { signal: string }) {
  const cls =
    signal === "bullish"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : signal === "bearish"
        ? "bg-red-500/15 text-red-400 border-red-500/30"
        : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>
      MACD: {signal}
    </Badge>
  );
}

export function BusinessInsightsWidget({
  insights, sym, loading,
}: {
  insights: BusinessInsightResult | null;
  sym: string;
  loading: boolean;
}) {
  const confTooltip = useMemo(
    () =>
      [
        ["Data Quality (30%)", "How many days of history are in the model (caps at about 12 months)."],
        ["Consistency (30%)", "How stable daily revenue is after seasonal adjustment — lower swings score higher."],
        ["Trend Stability (20%)", "How strong and consistent the directional trend in revenue is."],
        ["Seasonal Clarity (12%)", "How distinct weekday, weekend, and monthly patterns are in your data."],
        ["Data Diversity (8%)", "Whether product sales, customers, and session signals are all present in daily totals."],
      ] as const,
    [],
  );

  if (loading || !insights) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const ens = insights.tomorrowForecast;
  const factors = ens.confidenceFactors;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-primary/25 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-400" />
              {insights.brandLabel}
            </CardTitle>
            <MacdBadge signal={insights.macd.signal} />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Forecast uses up to 365 days of historical data for accuracy (independent of the report date range).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border/60 bg-card/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today</p>
              <p className="text-lg font-bold text-emerald-400">{sym}{insights.todaySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Yesterday</p>
              <p className="text-lg font-bold">{sym}{insights.yesterdaySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              {insights.dayOverDayPct != null && (
                <p className={`text-xs font-medium mt-0.5 ${insights.dayOverDayPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {insights.dayOverDayPct >= 0 ? "▲" : "▼"} {Math.abs(insights.dayOverDayPct).toFixed(1)}% vs yesterday
                </p>
              )}
            </div>
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tomorrow (ensemble)</p>
                <div className="flex items-center gap-1">
                  <TrendIcon t={ens.trend} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs text-xs">
                      <p className="font-semibold mb-1">Confidence ~{ens.confidence.toFixed(0)}%</p>
                      <ul className="space-y-1.5 list-none">
                        {confTooltip.map(([title, body]) => (
                          <li key={title}>
                            <span className="text-violet-300">{title}</span>
                            <span className="text-muted-foreground"> — {body}</span>
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <p className="text-2xl font-bold text-violet-300 mt-1">{sym}{ens.forecast.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                <Badge variant="secondary" className="font-normal">Confidence {ens.confidence.toFixed(0)}%</Badge>
                <Badge variant="secondary" className="font-normal">Agreement {ens.agreement.toFixed(0)}%</Badge>
                <Badge variant="secondary" className="font-normal">{insights.daysOfHistory} days history</Badge>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3.5 w-3.5 text-cyan-400" />
                <p className="text-xs font-medium">Projected month-end revenue (pace)</p>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Based on average daily sales so far this calendar month — not a manual target.</p>
              <p className="text-xl font-bold">{sym}{insights.monthlyProjectedTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-cyan-500/80 rounded-full transition-all"
                  style={{ width: `${insights.monthlyProgressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{insights.monthlyProgressPct.toFixed(1)}% of projected total so far</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-3.5 w-3.5 text-orange-400" />
                <p className="text-xs font-medium">Range P&amp;L (selected period)</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">Net profit</p>
                  <p className={`font-semibold ${insights.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {sym}{insights.netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Margin</p>
                  <p className="font-semibold">{insights.profitMarginPct.toFixed(1)}%</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground">Expense / revenue</p>
                  <p className="font-semibold">{insights.expenseToRevenuePct.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">Confidence factor scores</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
              {(
                [
                  ["Quality", factors.dataQuality],
                  ["Consistency", factors.consistency],
                  ["Trend", factors.trendStability],
                  ["Seasonal", factors.seasonalClarity],
                  ["Diversity", factors.dataDiversity],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded border border-border/50 px-2 py-1.5 bg-muted/20">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="float-right font-mono font-semibold">{v.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">All model forecasts</summary>
            <div className="mt-2 space-y-1 border border-border/40 rounded-md p-2 max-h-40 overflow-y-auto">
              {ens.modelResults.map(m => (
                <div key={m.name} className="flex justify-between gap-2 font-mono text-[10px]">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">w {(m.weight * 100).toFixed(1)}%</span>
                  <span>{sym}{m.forecast.toFixed(0)}</span>
                  <span className="text-violet-400">{m.confidence.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export function SevenDayForecastChart({ insights, sym }: { insights: BusinessInsightResult | null; sym: string }) {
  if (!insights?.sevenDay.length) return null;
  const data = insights.sevenDay.map(d => ({
    ...d,
    name: d.label,
  }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">7-day revenue forecast</CardTitle>
        <p className="text-[11px] text-muted-foreground">Weekend days tinted; holidays marked.</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8d96b3" }} />
            <YAxis tick={{ fontSize: 10, fill: "#8d96b3" }} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <RTooltip
              contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              formatter={(value: number, name: string) => {
                const label = name === "forecast" ? "Forecast" : name === "high" ? "Upper band" : name === "low" ? "Lower band" : name;
                if (typeof value === "number") return [`${sym}${value.toLocaleString("en-IN")}`, label];
                return [value, label];
              }}
            />
            <Line type="monotone" dataKey="high" stroke="#a78bfa" strokeDasharray="4 4" dot={false} strokeOpacity={0.35} name="high" />
            <Line type="monotone" dataKey="low" stroke="#a78bfa" strokeDasharray="4 4" dot={false} strokeOpacity={0.35} name="low" />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#a78bfa"
              strokeWidth={2}
              name="forecast"
              dot={(props: { cx?: number; cy?: number; payload?: { isHoliday?: boolean; isWeekend?: boolean } }) => {
                const { cx, cy, payload } = props;
                if (cx == null || cy == null) return null;
                const r = payload?.isHoliday ? 5 : payload?.isWeekend ? 4 : 3;
                let fill = "#a78bfa";
                if (payload?.isHoliday) fill = "#f97316";
                else if (payload?.isWeekend) fill = "#38bdf8";
                return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={payload?.isHoliday ? "#fff" : "none"} strokeWidth={1} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-2">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> Weekday</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Weekend</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Holiday</span>
        </div>
      </CardContent>
    </Card>
  );
}
