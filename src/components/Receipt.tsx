import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Building2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export type ReceiptBill = {
  id: string;
  bill_number: string | null;
  created_at: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  loyalty_points_used: number;
  loyalty_points_earned: number;
  payment_method: string;
  status: string;
  comp_note?: string | null;
  items: Array<{ name: string; qty: number; unit_price: number; total_price: number }>;
  customer: { name: string; phone: string | null } | null;
};

type Props = {
  bill: ReceiptBill;
  brandName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  sym: string;
  onClose: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────

export default function Receipt({ bill, brandName, businessAddress, businessPhone, sym, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || "";
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt — ${bill.bill_number || bill.id.slice(0, 8)}</title>
      <style>
        body { font-family: monospace; font-size: 12px; max-width: 320px; margin: 0 auto; padding: 16px; }
        .center { text-align: center; }
        .row { display: flex; justify-content: space-between; }
        .sep { border-top: 1px dashed #999; margin: 8px 0; }
        .bold { font-weight: bold; }
        .large { font-size: 16px; }
      </style></head>
      <body onload="window.print();window.close()">${content}</body></html>
    `);
    win.document.close();
  };

  const date = new Date(bill.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const pmtLabel = bill.payment_method.replace("_", " ").toUpperCase();

  return (
    <div className="space-y-4">
      {/* Printable area */}
      <div ref={printRef} className="bg-white dark:bg-gray-950 rounded-lg border p-4 space-y-3 font-mono text-xs">
        {/* Header */}
        <div className="text-center space-y-0.5">
          {brandName && <p className="font-bold text-base">{brandName}</p>}
          {businessAddress && <p className="text-muted-foreground text-[11px]">{businessAddress}</p>}
          {businessPhone && <p className="text-muted-foreground text-[11px]">Ph: {businessPhone}</p>}
        </div>

        <Separator className="border-dashed" />

        {/* Bill info */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bill #</span>
            <span className="font-medium">{bill.bill_number || bill.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{date}</span>
          </div>
          {bill.customer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="truncate max-w-[60%] text-right">{bill.customer.name}</span>
            </div>
          )}
        </div>

        <Separator className="border-dashed" />

        {/* Items */}
        <div className="space-y-1">
          {bill.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate flex-1">{item.name}{item.qty > 1 ? ` ×${item.qty}` : ""}</span>
              <span className="shrink-0">{sym}{item.total_price.toFixed(0)}</span>
            </div>
          ))}
        </div>

        <Separator className="border-dashed" />

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>{sym}{bill.subtotal.toFixed(0)}</span>
          </div>
          {bill.discount_amount > 0 && (
            <div className="flex justify-between text-purple-500">
              <span>Discount</span><span>-{sym}{bill.discount_amount.toFixed(0)}</span>
            </div>
          )}
          {bill.loyalty_points_used > 0 && (
            <div className="flex justify-between text-orange-500">
              <span>Loyalty ({bill.loyalty_points_used} pts)</span><span>-{sym}{bill.loyalty_points_used}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-bold text-base">
          <span>TOTAL</span>
          <span>{sym}{bill.total_amount.toFixed(0)}</span>
        </div>

        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Payment</span><span>{pmtLabel}</span>
        </div>

        {bill.loyalty_points_earned > 0 && (
          <p className="text-center text-[11px] text-primary">+{bill.loyalty_points_earned} loyalty points earned</p>
        )}

        {bill.status === "complimentary" && (
          <div className="text-center">
            <Badge variant="outline" className="text-orange-400 border-orange-400/50 text-[11px]">COMPLIMENTARY</Badge>
            {bill.comp_note && <p className="text-[10px] text-muted-foreground mt-0.5">{bill.comp_note}</p>}
          </div>
        )}

        <Separator className="border-dashed" />
        <p className="text-center text-[10px] text-muted-foreground">Thank you for visiting!</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1" variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />Print / Download
        </Button>
        <Button variant="ghost" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />Close
        </Button>
      </div>
    </div>
  );
}
