import { useState, useEffect, useRef } from "react";
import { TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  stationId: string;
  stationType: string;
  isMember: boolean;
  sym: string;
  initialRate?: number;
  initialStartedAt?: string;
  couponLabel?: string | null;  // e.g. "HH99" shown when coupon was applied
  originalRate?: number;        // base rate before coupon (for "saving" display)
};

function calcCost(elapsedMs: number, rate: number, stationType: string, isMember: boolean): number {
  if (rate === 0) return 0;
  const elapsedMins = elapsedMs / 60000;
  let raw: number;
  if (stationType === "darts") {
    raw = Math.ceil(elapsedMins / 15) * rate;
  } else {
    raw = Math.ceil((elapsedMins / 60) * rate);
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

export default function StationTimer({ stationId, stationType, isMember, sym, initialRate = 0, initialStartedAt, couponLabel, originalRate }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [sessionRate, setSessionRate] = useState(initialRate);
  const startTimeRef = useRef<number>(initialStartedAt ? new Date(initialStartedAt).getTime() : Date.now());

  // Fetch authoritative session start_time and rate on mount
  useEffect(() => {
    supabase
      .from("sessions")
      .select("id, started_at, rate_per_hour")
      .eq("station_id", stationId)
      .eq("status", "active")
      .single()
      .then(({ data }) => {
        if (!data) return;
        startTimeRef.current = new Date(data.started_at).getTime();
        const rate = Number(data.rate_per_hour) || 0;
        setSessionRate(rate);
      });
  }, [stationId]);

  useEffect(() => {
    const tick = () => setElapsed(Date.now() - startTimeRef.current);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cost = calcCost(elapsed, sessionRate, stationType, isMember);
  const hasDiscount = couponLabel && originalRate && originalRate > sessionRate;
  const saving = hasDiscount ? originalRate - sessionRate : 0;

  return (
    <div className="space-y-2">
      {/* Timer */}
      <div className="bg-black/80 rounded-lg p-3 text-center border border-white/10">
        <p className="font-mono text-3xl font-bold tracking-wider text-white">{fmtElapsed(elapsed)}</p>
        <p className="text-sm text-white/70 mt-1">
          Current Cost:{" "}
          <span className="font-bold text-white">{sym}{cost.toLocaleString()}</span>
          {couponLabel && (
            <span className="ml-2 text-xs text-orange-400">[{couponLabel}]</span>
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
          {saving > 0 && <p className="text-xs text-orange-400/80 mt-0.5">Saving {sym}{saving}/hr</p>}
        </div>
      ) : (
        <div className="rounded-lg p-2.5 border border-purple-500/20 bg-purple-500/10">
          <p className="text-xs text-purple-300/70 mb-0.5">Current Rate</p>
          <p className="text-sm font-semibold text-purple-300">
            {sym}{sessionRate}/{stationType === "darts" ? "15min" : "hr"}
          </p>
        </div>
      )}
    </div>
  );
}
