import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Gamepad2, Circle, Target, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StationTimer from "@/components/station/StationTimer";
import StationInfo from "@/components/station/StationInfo";
import { isMembershipActive } from "@/components/station/StationInfo";
import StationActions from "@/components/station/StationActions";
import StartSessionDialog from "@/components/StartSessionDialog";
import EditStationDialog from "@/components/EditStationDialog";

export type ColorScheme = "purple" | "green" | "blue" | "orange" | "cyan";

export type TypeConfig = {
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  colorScheme: ColorScheme;
  billUnit: "hourly" | "15min";
};

export const TYPE_CONFIG: Record<string, TypeConfig> = {
  gaming:  { label: "PlayStation 5 Consoles", shortLabel: "PlayStation 5", icon: Gamepad2, colorScheme: "purple", billUnit: "hourly" },
  pool:    { label: "8-Ball Tables",          shortLabel: "8-Ball Tables", icon: Circle,   colorScheme: "green",  billUnit: "hourly" },
  snooker: { label: "Snooker Tables",         shortLabel: "Snooker",        icon: Circle,   colorScheme: "green",  billUnit: "hourly" },
  darts:   { label: "VR Gaming Stations",     shortLabel: "VR Gaming",      icon: Target,   colorScheme: "blue",   billUnit: "15min"  },
  bowling: { label: "Bowling Lanes",          shortLabel: "Bowling",        icon: Trophy,   colorScheme: "orange", billUnit: "hourly" },
  other:   { label: "Gaming Stations",        shortLabel: "Gaming",         icon: Zap,      colorScheme: "cyan",   billUnit: "hourly" },
};

const AVAILABLE_BG: Record<ColorScheme, string> = {
  purple: "linear-gradient(145deg, #0d0020 0%, #1a0035 40%, #0d0020 100%)",
  green:  "linear-gradient(145deg, #001500 0%, #002800 40%, #001500 100%)",
  blue:   "linear-gradient(145deg, #000d1a 0%, #001530 40%, #050010 100%)",
  orange: "linear-gradient(145deg, #130300 0%, #280800 40%, #130300 100%)",
  cyan:   "linear-gradient(145deg, #00121a 0%, #00202e 40%, #00121a 100%)",
};

const BORDER_COLOR: Record<ColorScheme, string> = {
  purple: "rgba(168,85,247,0.55)",
  green:  "rgba(34,197,94,0.55)",
  blue:   "rgba(6,182,212,0.55)",
  orange: "rgba(249,115,22,0.55)",
  cyan:   "rgba(34,211,238,0.55)",
};

const ICON_COLOR: Record<ColorScheme, string> = {
  purple: "#c084fc", green: "#4ade80", blue: "#67e8f9", orange: "#fb923c", cyan: "#22d3ee",
};

const GLOW: Record<ColorScheme, string> = {
  purple: "0 0 30px rgba(168,85,247,0.25)",
  green:  "0 0 30px rgba(34,197,94,0.25)",
  blue:   "0 0 30px rgba(6,182,212,0.25)",
  orange: "0 0 30px rgba(249,115,22,0.25)",
  cyan:   "0 0 30px rgba(34,211,238,0.25)",
};

type Station = {
  id: string; name: string; type: string; rate_per_hour: number;
  is_active: boolean; is_occupied: boolean; event_enabled?: boolean;
};
type Customer = { id: string; name: string; phone: string | null; membership_type: string };
type Session = { id: string; station_id: string; customer_id: string | null; started_at: string; rate_per_hour: number | null; coupon_code?: string | null };

type Props = {
  station: Station;
  session: Session | null;
  customer: Customer | null;
  customers: Customer[];
  tenantId: string;
  sym: string;
  animDelay: number;
  onRefresh: () => void;
};

export default function StationCard({ station, session, customer, customers, tenantId, sym, animDelay, onRefresh }: Props) {
  const cfg = TYPE_CONFIG[station.type] || TYPE_CONFIG.other;
  const cs = cfg.colorScheme;
  const isOccupied = station.is_occupied;
  const isMember = isMembershipActive(customer);
  const couponCode = session?.coupon_code || null;

  const [eventEnabled, setEventEnabled] = useState(station.event_enabled !== false);
  const [togglingEvent, setTogglingEvent] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  const Icon = cfg.icon;

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleEventEnabled = async () => {
    setTogglingEvent(true);
    const next = !eventEnabled;
    const { error } = await supabase.from("stations").update({ event_enabled: next } as Record<string, unknown>).eq("id", station.id);
    if (error) toast.error(error.message);
    else { setEventEnabled(next); toast.success(next ? "Station is now live on public booking" : "Station removed from public booking"); }
    setTogglingEvent(false);
  };

  const handleStartSession = async (customerId: string, finalRate: number, coupon: string | null) => {
    const { error: sessErr } = await supabase.from("sessions").insert({
      tenant_id: tenantId, station_id: station.id, customer_id: customerId,
      started_at: new Date().toISOString(), rate_per_hour: finalRate,
      coupon_code: coupon, status: "active",
    });
    if (sessErr) throw sessErr;
    await supabase.from("stations").update({ is_occupied: true }).eq("id", station.id);
    toast.success("Session started!");
    onRefresh();
  };

  const handleEndSession = async () => {
    if (!session) return;
    setEndingSession(true);
    await supabase.from("sessions").update({ ended_at: new Date().toISOString(), status: "completed" }).eq("id", session.id);
    await supabase.from("stations").update({ is_occupied: false }).eq("id", station.id);
    toast.success("Session ended — redirecting to POS…");
    onRefresh();
    setTimeout(() => { window.location.href = "/pos"; }, 1500);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("stations").delete().eq("id", station.id);
    if (error) toast.error(error.message);
    else { toast.success("Station deleted"); onRefresh(); }
  };

  // ── Visual helpers ─────────────────────────────────────────────────────────

  const occupiedBorderColor = isMember ? "rgba(34,197,94,0.6)" : "rgba(249,115,22,0.6)";
  const cardBg = isOccupied ? "#0a0a0a" : undefined;
  const cardBorder = isOccupied ? occupiedBorderColor : BORDER_COLOR[cs];
  const cardBoxShadow = isOccupied ? undefined : GLOW[cs];

  const isVR = cs === "blue" && cfg.billUnit === "15min";

  // ── Decorative elements ────────────────────────────────────────────────────

  const PoolDecorations = () => (
    <>
      {["top-1 left-1","top-1 right-1","bottom-1 left-1","bottom-1 right-1"].map(pos => (
        <span key={pos} className={`absolute ${pos} h-2 w-2 rounded-full bg-green-500/40 pointer-events-none`} />
      ))}
      <div className="absolute left-4 right-4 top-1/3 h-px bg-green-500/15 pointer-events-none" />
    </>
  );

  const GamingDecorations = () => (
    <>
      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full pointer-events-none" />
      <div className="absolute left-0 right-0 top-1/4 h-px bg-purple-500/10 pointer-events-none" />
      <span className="absolute bottom-12 left-2 h-1.5 w-1.5 rounded-full bg-purple-400/50 animate-pulse pointer-events-none" />
      <span className="absolute bottom-12 left-5 h-1 w-1 rounded-full bg-purple-400/30 animate-pulse pointer-events-none" style={{ animationDelay: "500ms" }} />
    </>
  );

  const VRDecorations = () => (
    <>
      {/* Corner tech brackets */}
      <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl pointer-events-none" />
      <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br pointer-events-none" />
      {/* Scan lines */}
      <div className="absolute left-6 right-6 top-1/4 h-px bg-cyan-500/10 pointer-events-none" />
      <div className="absolute left-6 right-6 top-3/4 h-px bg-cyan-500/10 pointer-events-none" />
      {/* Pulsing particles */}
      {[[2,8],[3,24],[88,12],[80,5]].map(([b,l],i) => (
        <span key={i} className="absolute rounded-full bg-cyan-400/40 animate-pulse pointer-events-none" style={{ width: 4, height: 4, bottom: b, left: l, animationDelay: `${i * 400}ms` }} />
      ))}
      {/* Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full blur-lg pointer-events-none" />
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: isOccupied ? cardBg : AVAILABLE_BG[cs],
    border: `1px solid ${cardBorder}`,
    boxShadow: cardBoxShadow,
    animationDelay: `${animDelay}ms`,
    animationFillMode: "both",
  };

  // VR: wrap in spinning gradient border when available
  const cardContent = (
    <div
      className={cn(
        "relative rounded-xl p-4 overflow-hidden flex flex-col gap-3 transition-all duration-300 animate-in fade-in-0",
        !station.is_active && "opacity-50"
      )}
      style={isVR && !isOccupied ? undefined : cardStyle}
    >
      {/* Decorative */}
      {!isOccupied && cs === "green" && <PoolDecorations />}
      {!isOccupied && cs === "purple" && <GamingDecorations />}
      {!isOccupied && isVR && <VRDecorations />}

      {/* Membership bar */}
      {isOccupied && (
        <div className={cn("absolute top-0 left-0 right-0 h-0.5", isMember ? "bg-green-500" : "bg-white/10")} />
      )}

      {/* Coupon badge */}
      {isOccupied && couponCode && (
        <div className="absolute top-2 right-2 animate-pulse">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white border border-orange-400">{couponCode}</span>
        </div>
      )}

      {/* Header row: icon, name, status, edit/delete */}
      <div className="flex items-start gap-2 relative z-10">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: ICON_COLOR[cs] }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate" style={{ color: ICON_COLOR[cs] }}>{station.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {isOccupied ? (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs h-4 px-1 animate-pulse">Occupied</Badge>
            ) : (
              <Badge className="text-xs h-4 px-1" style={{ background: `${BORDER_COLOR[cs]}33`, color: ICON_COLOR[cs], border: `1px solid ${BORDER_COLOR[cs]}` }}>Available</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/40 hover:text-white/80" disabled={isOccupied} onClick={() => setEditOpen(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/40 hover:text-red-400" disabled={isOccupied} onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Public booking toggle */}
      <div className="flex items-center gap-2 relative z-10 py-1 border-t border-white/5">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", eventEnabled ? "bg-green-400" : "bg-red-400")} />
        <span className="text-xs text-white/50 flex-1 truncate">
          {eventEnabled ? "Live on public booking" : "Disabled on public booking"}
        </span>
        <Switch checked={eventEnabled} onCheckedChange={toggleEventEnabled} disabled={togglingEvent} className="scale-75 origin-right" />
      </div>

      {/* Session content */}
      {isOccupied && session && (
        <div className="relative z-10 space-y-2">
          <StationInfo
            customer={customer}
            rate={Number(session.rate_per_hour) || station.rate_per_hour}
            stationType={station.type}
            sym={sym}
          />
          <StationTimer
            stationId={station.id}
            stationType={station.type}
            isMember={isMember}
            sym={sym}
            initialRate={Number(session.rate_per_hour) || station.rate_per_hour}
            initialStartedAt={session.started_at}
            initialCouponCode={couponCode}
          />
        </div>
      )}

      {/* Action button */}
      <div className="relative z-10 mt-auto">
        <StationActions
          isOccupied={isOccupied}
          stationType={station.type}
          colorScheme={cs}
          hasCustomers={customers.length > 0}
          onStartSession={() => setStartOpen(true)}
          onEndSession={handleEndSession}
          endingSession={endingSession}
        />
      </div>
    </div>
  );

  // VR available: spinning gradient border wrapper
  const renderedCard = (isVR && !isOccupied) ? (
    <div className="relative p-[2px] rounded-xl animate-in fade-in-0" style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}>
      <div
        className="absolute inset-0 rounded-xl animate-spin [animation-duration:4s]"
        style={{ background: "conic-gradient(from 0deg, #06b6d4, #8b5cf6, #22d3ee, #0ea5e9, #8b5cf6, #06b6d4)" }}
      />
      <div className="relative rounded-[10px] overflow-hidden" style={{ background: AVAILABLE_BG[cs], boxShadow: GLOW[cs] }}>
        {cardContent}
      </div>
    </div>
  ) : cardContent;

  return (
    <>
      {renderedCard}

      <StartSessionDialog
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onConfirm={handleStartSession}
        customers={customers}
        baseRate={station.rate_per_hour}
        sym={sym}
      />

      <EditStationDialog
        station={editOpen ? station : null}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); onRefresh(); }}
        sym={sym}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Station?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{station.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
