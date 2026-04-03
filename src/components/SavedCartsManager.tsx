import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, Trash2, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export type SavedCart = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  items: Array<{ product_id: string | null; name: string; price: number; qty: number }>;
  discount: { amount: number; type: "flat" | "percent" };
  loyaltyPointsUsed: number;
  savedAt: string;
};

// ── LocalStorage helpers (exported for use in POS) ─────────────────────────

const CART_NS = "pos_cart_v1";
export const cartKey = (tenantId: string, customerId: string) => `${CART_NS}_${tenantId}_${customerId}`;

export function saveCartToStorage(tenantId: string, customer: { id: string; name: string; phone: string | null }, items: SavedCart["items"], discount: SavedCart["discount"], loyaltyPointsUsed: number) {
  if (!tenantId || !customer.id) return;
  const data: SavedCart = { customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, items, discount, loyaltyPointsUsed, savedAt: new Date().toISOString() };
  localStorage.setItem(cartKey(tenantId, customer.id), JSON.stringify(data));
}

export function loadCartFromStorage(tenantId: string, customerId: string): SavedCart | null {
  try {
    const raw = localStorage.getItem(cartKey(tenantId, customerId));
    if (!raw) return null;
    const data: SavedCart = JSON.parse(raw);
    const expired = Date.now() - new Date(data.savedAt).getTime() > 24 * 60 * 60 * 1000;
    if (expired) { localStorage.removeItem(cartKey(tenantId, customerId)); return null; }
    return data;
  } catch { return null; }
}

export function removeCartFromStorage(tenantId: string, customerId: string) {
  localStorage.removeItem(cartKey(tenantId, customerId));
}

export function getAllSavedCarts(tenantId: string): SavedCart[] {
  const prefix = `${CART_NS}_${tenantId}_`;
  const result: SavedCart[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const data: SavedCart = JSON.parse(localStorage.getItem(key) || "");
      const expired = Date.now() - new Date(data.savedAt).getTime() > 24 * 60 * 60 * 1000;
      if (expired) { localStorage.removeItem(key); continue; }
      result.push(data);
    } catch { localStorage.removeItem(key || ""); }
  }
  return result.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  tenantId: string;
  sym: string;
  onRestoreCart: (cart: SavedCart) => void;
};

export default function SavedCartsManager({ tenantId, sym, onRestoreCart }: Props) {
  const [carts, setCarts] = useState<SavedCart[]>(() => getAllSavedCarts(tenantId));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const refresh = () => setCarts(getAllSavedCarts(tenantId));

  const toggleExpand = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleDelete = (customerId: string) => {
    removeCartFromStorage(tenantId, customerId);
    refresh();
    setDeleteTarget(null);
  };

  const handleClearAll = () => {
    carts.forEach(c => removeCartFromStorage(tenantId, c.customerId));
    setCarts([]);
    setClearAllOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />Saved Carts
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{carts.length} customer{carts.length !== 1 ? "s" : ""} with pending carts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {carts.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => setClearAllOpen(true)}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Info banner */}
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          Carts are automatically saved when customers are selected and items are added. They expire after 24 hours.
        </p>

        {carts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No pending carts.</p>
        ) : (
          carts.map(cart => {
            const cartTotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
            const discountAmt = cart.discount.type === "percent"
              ? Math.round(cartTotal * cart.discount.amount / 100)
              : cart.discount.amount;
            const loyaltyDeduction = cart.loyaltyPointsUsed;
            const finalTotal = Math.max(0, cartTotal - discountAmt - loyaltyDeduction);
            const isOpen = expanded.has(cart.customerId);

            return (
              <div key={cart.customerId} className="rounded-lg border bg-muted/20">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{cart.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(cart.savedAt)} · {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(cart.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" className="h-7 text-xs" onClick={() => { onRestoreCart(cart); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      Go to Bill
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleExpand(cart.customerId)}>
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(cart.customerId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded breakdown */}
                {isOpen && (
                  <div className={cn("border-t px-3 pb-3 pt-2 space-y-1.5 text-sm")}>
                    {cart.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[60%]">{item.name} × {item.qty}</span>
                        <span>{sym}{(item.price * item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-xs text-purple-400">
                        <span>Discount</span><span>-{sym}{discountAmt}</span>
                      </div>
                    )}
                    {cart.loyaltyPointsUsed > 0 && (
                      <div className="flex justify-between text-xs text-orange-400">
                        <span>Loyalty ({cart.loyaltyPointsUsed} pts)</span><span>-{sym}{loyaltyDeduction}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-xs pt-1 border-t">
                      <span>Total</span><span>{sym}{finalTotal}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {/* Delete single */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved cart?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the pending cart for this customer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all saved carts?</AlertDialogTitle>
            <AlertDialogDescription>This will remove all {carts.length} pending carts. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleClearAll}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
