import { useState, useEffect, useRef } from "react";
import { TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  stationId: string;
  stationType: string;
  isMember: boolean;
  sym: string;
  /** Initial session data from parent; component will re-fetch for accuracy */
  initialRate?: number;
  initialStartedAt?: string;
  initialCouponCode?: string | null;
};

function calcCost(elapsedMs: number, rate: number, stationType: string, isMember: boolean): number {
  if (rate === 0) return 0;
  const elapsedMins = elapsedMs / 60000;
  let raw: number;
  if (stationType === "darts") {
    raw = Math.ceil(elapsedMins / 15) * rate;
  } else {
    const elapsedHours = elapsedMins / 60;
    raw = Math.ceil(elapsedHours * rate);
  }
  return isMember ? Math.ceil(raw * 0.5) : raw;
}

function fmtElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StationTimer({ stationId, stationType, isMember, sym, initialRate = 0, initialStartedAt, initialCouponCode }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [sessionRate, setSessionRate] = useState(initialRate);
  const [originalRate, setOriginalRate] = useState(initialRate);
  const [couponCode, setCouponCode] = useState<string | null>(initialCouponCode || null);
  const startTimeRef = useRef<number>(initialStartedAt ? new Date(initialStartedAt).getTime() : Date.now());

  // Fetch authoritative session data on mount
  useEffect(() => {
    supabase
      .from("sessions")
      .select("id, started_at, rate_per_hour, coupon_code")
      .eq("station_id", stationId)
      .eq("status", "active")
      .single()
      .then(({ data }) => {
        if (!data) return;
        startTimeRef.current = new Date(data.started_at).getTime();
        const rate = Number(data.rate_per_hour) || 0;
        setSessionRate(rate);
        const cc = (data as Record<string, unknown>).coupon_code as string | null;
        setCouponCode(cc || null);
        setOriginalRate(cc && rate > 0 ? rate : initialRate);
      });
  }, [stationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick every second
  useEffect(() => {
    const tick = () => setElapsed(Date.now() - startTimeRef.current);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cost = calcCost(elapsed, sessionRate, stationType, isMember);
  const savingPerHr = originalRate - sessionRate;
  const hasDiscount = couponCode && savingPerHr > 0;

  return (
    <div className="space-y-2">
      {/* Timer display */}
      <div className="bg-black/80 rounded-lg p-3 text-center border border-white/10">
        <p className="font-mono text-3xl font-bold tracking-wider text-white">{fmtElapsed(elapsed)}</p>
        <p className="text-sm text-white/70 mt-1">
          Current Cost: <span className="font-bold text-white">{sym}{cost.toLocaleString()}</span>
          {couponCode && sessionRate !== originalRate && (
            <span className="ml-2 text-xs text-white/40">
              @ {sym}{sessionRate}/hr
              {` `}
              <span className="line-through text-white/30">{sym}{originalRate}/hr</span>
            </span>
          )}
        </p>
      </div>

      {/* Rate info panel */}
      {hasDiscount ? (
        <div className="rounded-lg p-3 border border-orange-500/30 bg-orange-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-medium text-orange-300 uppercase tracking-wide">Discounted Rate</span>
            {sessionRate === 0 && (
              <span className="ml-auto text-xs font-bold px-1.5 py-0.5 bg-orange-500 text-white rounded">FREE</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-white/30 line-through">{sym}{originalRate}/hr</span>
            <span className="text-lg font-bold text-orange-400">{sessionRate === 0 ? "FREE" : `${sym}${sessionRate}/hr`}</span>
          </div>
          {savingPerHr > 0 && (
            <p className="text-xs text-orange-400/80 mt-0.5">Saving {sym}{savingPerHr}/hr</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg p-2.5 border border-purple-500/20 bg-purple-500/10">
          <p className="text-xs text-purple-300/70 mb-0.5">Current Rate</p>
          <p className="text-sm font-semibold text-purple-300">{sym}{sessionRate}/{stationType === "darts" ? "15min" : "hr"}</p>
        </div>
      )}
    </div>
  );
}
