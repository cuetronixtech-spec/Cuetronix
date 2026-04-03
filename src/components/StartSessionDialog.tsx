import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isMembershipActive } from "@/components/station/StationInfo";

type Customer = { id: string; name: string; phone: string | null; membership_type: string };

type CouponDef = {
  code: string;
  label: string;
  getRate: (base: number) => number;
  happyHourOnly?: boolean;
  requiresStudentId?: boolean;
  requiresVerification?: boolean;
};

const COUPONS: CouponDef[] = [
  { code: "NONE", label: "No Coupon — full price", getRate: r => r },
  { code: "HH99", label: "HH99 — Happy Hour ₹99/hr (Mon–Fri 11 AM–4 PM)", getRate: () => 99, happyHourOnly: true },
  { code: "CUEPHORIA20", label: "CUEPHORIA20 — 20% off", getRate: r => Math.round(r * 0.8) },
  { code: "CUEPHORIA35", label: "CUEPHORIA35 — 35% off (Student ID required)", getRate: r => Math.round(r * 0.65), requiresStudentId: true },
  { code: "NIT35", label: "NIT35 — 35% off (NIT students)", getRate: r => Math.round(r * 0.65) },
  { code: "AAVEG50", label: "AAVEG50 — 50% off (NIT freshers)", getRate: r => Math.round(r * 0.5) },
  { code: "GAMEINSIDER50", label: "GAMEINSIDER50 — 50% off (GameInsider)", getRate: r => Math.round(r * 0.5), requiresVerification: true },
  { code: "AXEIST", label: "AXEIST — VIP Free (₹0)", getRate: () => 0 },
];

function isHappyHour(): boolean {
  const d = new Date();
  const day = d.getDay();
  const mins = d.getHours() * 60 + d.getMinutes();
  return day >= 1 && day <= 5 && mins >= 11 * 60 && mins < 16 * 60;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (customerId: string, finalRate: number, couponCode: string | null) => Promise<void>;
  customers: Customer[];
  baseRate: number;
  sym: string;
};

export default function StartSessionDialog({ open, onClose, onConfirm, customers, baseRate, sym }: Props) {
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

  const couponDef = COUPONS.find(c => c.code === couponCode) || COUPONS[0];
  const finalRate = couponDef.getRate(baseRate);
  const discount = baseRate - finalRate;

  const handleCouponChange = (code: string) => {
    const def = COUPONS.find(c => c.code === code);
    if (def?.happyHourOnly && !isHappyHour()) {
      toast.error("Happy Hour is only valid Mon–Fri 11 AM–4 PM");
      setCouponCode("NONE");
      return;
    }
    if (def?.requiresStudentId) toast.warning("Student ID required — verify before confirming");
    if (def?.requiresVerification) toast.warning("Verify against GameInsider enrollment list");
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
            /* Confirmed customer card */
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

          {/* Section 2: Coupon (shown after customer selected) */}
          {selected && (
            <div>
              <p className="text-sm font-medium mb-1.5">Apply Coupon</p>
              <Select value={couponCode} onValueChange={handleCouponChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUPONS.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
