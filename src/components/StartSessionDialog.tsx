import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, User, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isMembershipActive } from "@/components/station/StationInfo";
import type { BookingCoupon } from "@/integrations/supabase/types";

// ── Types ──────────────────────────────────────────────────────────────────

type Customer = { id: string; name: string; phone: string | null; membership_type: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (customerId: string, finalRate: number, couponCode: string | null) => Promise<void>;
  customers: Customer[];
  coupons: BookingCoupon[];
  baseRate: number;
  sym: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function applyDiscount(coupon: BookingCoupon, baseRate: number): number {
  switch (coupon.type) {
    case "percent":  return Math.round(baseRate * (1 - coupon.value / 100));
    case "flat":     return Math.max(0, baseRate - coupon.value);
    case "fixed":    return coupon.value;
    default:         return baseRate;
  }
}

function couponLabel(coupon: BookingCoupon, sym: string): string {
  switch (coupon.type) {
    case "percent": return `${coupon.code} — ${coupon.value}% off`;
    case "flat":    return `${coupon.code} — ${sym}${coupon.value} off`;
    case "fixed":   return `${coupon.code} — ${sym}${coupon.value}/hr flat`;
    default:        return coupon.code;
  }
}

function isHappyHour(coupon: BookingCoupon): boolean {
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();

  const validDays: number[] = coupon.happy_hour_days?.length ? coupon.happy_hour_days : [1, 2, 3, 4, 5];
  if (!validDays.includes(day)) return false;

  if (coupon.happy_hour_start && coupon.happy_hour_end) {
    const [sh, sm] = coupon.happy_hour_start.split(":").map(Number);
    const [eh, em] = coupon.happy_hour_end.split(":").map(Number);
    return mins >= sh * 60 + sm && mins < eh * 60 + em;
  }
  return true;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StartSessionDialog({ open, onClose, onConfirm, customers, coupons, baseRate, sym }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [couponCode, setCouponCode] = useState("NONE");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) { setSearch(""); setSelected(null); setCouponCode("NONE"); }
  }, [open]);

  const filtered = customers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || "").includes(q);
  }).slice(0, 10);

  const selectedCoupon = coupons.find(c => c.code === couponCode) || null;
  const finalRate = selectedCoupon ? applyDiscount(selectedCoupon, baseRate) : baseRate;
  const discount = baseRate - finalRate;

  const handleCouponChange = (code: string) => {
    if (code === "NONE") { setCouponCode("NONE"); return; }
    const def = coupons.find(c => c.code === code);
    if (!def) return;
    // Happy-hour validation
    if ((def.happy_hour_start || def.happy_hour_end) && !isHappyHour(def)) {
      const timeRange = def.happy_hour_start && def.happy_hour_end
        ? ` (${def.happy_hour_start}–${def.happy_hour_end})`
        : "";
      toast.error(`${code} is only valid during happy hours${timeRange}`);
      setCouponCode("NONE");
      return;
    }
    if (def.verify_note) toast.warning(def.verify_note);
    setCouponCode(code);
  };

  const handleStart = async () => {
    if (!selected) return;
    setStarting(true);
    try {
      await onConfirm(selected.id, finalRate, couponCode === "NONE" ? null : couponCode);
      onClose();
    } catch {
      toast.error("Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Start Session</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {/* Section 1: Customer selection */}
          {!selected ? (
            <div>
              <p className="text-sm font-medium mb-2">Select Customer</p>
              <Input
                placeholder="Search by name or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <ScrollArea className="h-52 border rounded-lg">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No customers found</p>
                ) : filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 border-b last:border-b-0 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                    {isMembershipActive(c) && (
                      <Badge className="shrink-0 bg-green-500/20 text-green-300 border-green-500/30 text-xs">Member</Badge>
                    )}
                  </button>
                ))}
              </ScrollArea>
            </div>
          ) : (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{selected.name}</p>
                {selected.phone && <p className="text-xs text-muted-foreground">{selected.phone}</p>}
                {isMembershipActive(selected) && (
                  <p className="text-xs text-green-400 mt-0.5">Member — 50% discount will apply</p>
                )}
              </div>
              <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => setSelected(null)}>
                Change
              </Button>
            </div>
          )}

          {/* Section 2: Coupon */}
          {selected && (
            <div>
              <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Apply Coupon
              </p>
              {coupons.length === 0 ? (
                <p className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
                  No coupons configured. Add coupons in Settings → Bookings.
                </p>
              ) : (
                <Select value={couponCode} onValueChange={handleCouponChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No Coupon — full price</SelectItem>
                    {coupons.map(c => (
                      <SelectItem key={c.code} value={c.code}>{couponLabel(c, sym)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Section 3: Price summary */}
          {selected && (
            <div className={cn(
              "rounded-lg p-4 space-y-2 border",
              finalRate === 0 ? "bg-green-500/10 border-green-500/30" : "bg-primary/5 border-primary/20"
            )}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Rate</span>
                <span>{sym}{baseRate}/hr</span>
              </div>
              {couponCode !== "NONE" && discount > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>{couponCode} discount</span>
                  <span>-{sym}{discount}/hr</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-current/10">
                <span>Final Rate</span>
                <span className="text-primary">{finalRate === 0 ? "FREE" : `${sym}${finalRate}/hr`}</span>
              </div>
              {finalRate === 0 && (
                <p className="text-center text-sm text-green-400 font-medium">🎉 This session is completely FREE!</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart} disabled={!selected || starting}>
            {starting ? "Starting…" : "Start Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
