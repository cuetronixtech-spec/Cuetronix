import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Bill } from "@/hooks/useReports";

const OPTIONS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / Online" },
  { value: "credit", label: "Credit" },
  { value: "card", label: "Card" },
  { value: "split", label: "Split (cash + UPI)" },
  { value: "complimentary", label: "Complimentary" },
];

export function EditPaymentMethodDialog({
  bill, open, onClose, onSaved, sym,
}: {
  bill: Bill | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sym: string;
}) {
  const [method, setMethod] = useState<string>("cash");
  const [splitCash, setSplitCash] = useState("0");
  const [splitUpi, setSplitUpi] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !bill) return;
    const m = (bill.payment_method || "cash") === "online" ? "upi" : bill.payment_method;
    setMethod(m);
    const br = bill.payment_breakdown || {};
    setSplitCash(String((br as Record<string, number>).cash ?? 0));
    setSplitUpi(String((br as Record<string, number>).online ?? (br as Record<string, number>).upi ?? 0));
  }, [open, bill]);

  if (!bill) return null;

  const total = Number(bill.total_amount);
  const sc = parseFloat(splitCash) || 0;
  const su = parseFloat(splitUpi) || 0;
  const splitOk = method !== "split" || Math.abs(sc + su - total) < 0.02;

  const handleSave = async () => {
    if (!splitOk) {
      toast.error(`Split cash + UPI must equal bill total (${sym}${total.toFixed(2)})`);
      return;
    }
    setSaving(true);
    const dbMethod = method === "upi" ? "online" : method;
    const breakdown = dbMethod === "split" ? { cash: sc, online: su } : {};

    const { error } = await supabase
      .from("bills")
      .update({
        payment_method: dbMethod,
        payment_breakdown: breakdown,
      })
      .eq("id", bill.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Payment method updated");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit payment method</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground font-mono">
            Bill {bill.bill_number ?? bill.id.slice(0, 8)} · Total {sym}{total.toLocaleString("en-IN")}
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {method === "split" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cash</Label>
                <Input type="number" value={splitCash} onChange={e => setSplitCash(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">UPI / Online</Label>
                <Input type="number" value={splitUpi} onChange={e => setSplitUpi(e.target.value)} />
              </div>
              <p className={`col-span-2 text-xs ${splitOk ? "text-muted-foreground" : "text-red-400"}`}>
                Sum: {sym}{(sc + su).toFixed(2)} — must match total
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving || !splitOk}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
