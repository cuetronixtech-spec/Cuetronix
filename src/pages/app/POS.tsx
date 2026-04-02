import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timer, Trash2, Plus, Minus, Play, Square, Clock, Receipt } from "lucide-react";
import { toast } from "sonner";

type Station = { id: string; name: string; type: string; rate_per_hour: number; is_occupied: boolean; is_active: boolean };
type Product = { id: string; name: string; price: number; stock: number; track_stock: boolean; categories?: { name: string } | null };
type Category = { id: string; name: string };
type Session = { id: string; station_id: string; started_at: string; status: string; rate_per_hour: number; stations?: { name: string } | null };
type CartItem = { product_id: string; name: string; price: number; qty: number };

type ActiveSession = Session & { elapsed: number };

const fmt = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function POS() {
  const { config } = useTenant();
  const { user } = useAuth();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<ActiveSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [stRes, prRes, catRes, sessRes] = await Promise.all([
      supabase.from("stations").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("display_order"),
      supabase.from("products").select("*, categories(name)").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name").eq("tenant_id", tenantId),
      supabase.from("sessions").select("*, stations(name)").eq("tenant_id", tenantId).eq("status", "active"),
    ]);
    setStations((stRes.data || []) as Station[]);
    setProducts((prRes.data || []) as Product[]);
    setCategories(catRes.data || []);
    const sess = (sessRes.data || []) as Session[];
    setActiveSessions(sess.map(s => ({
      ...s,
      elapsed: Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000),
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick timer every second
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveSessions(prev => prev.map(s => ({ ...s, elapsed: s.elapsed + 1 })));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startSession = async (station: Station) => {
    if (!tenantId || !user) return;
    const { data, error } = await supabase.from("sessions").insert({
      tenant_id: tenantId,
      station_id: station.id,
      staff_id: user.id,
      rate_per_hour: station.rate_per_hour,
      status: "active",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("stations").update({ is_occupied: true }).eq("id", station.id);
    toast.success(`Session started on ${station.name}`);
    setSelectedStation(null);
    load();
  };

  const openCheckout = (session: ActiveSession) => {
    setCheckoutSession(session);
    setCart([]);
    setPaymentMethod("cash");
    setDiscount("0");
    setCustomerName("");
    setCheckoutOpen(true);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product_id === product.id);
      if (existing) return prev.map(c => c.product_id === product.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { product_id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.product_id === productId ? { ...c, qty: Math.max(0, c.qty + delta) } : c);
      return updated.filter(c => c.qty > 0);
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(c => c.product_id !== productId));

  const getSessionAmount = (session: ActiveSession) => {
    const hours = session.elapsed / 3600;
    return hours * session.rate_per_hour;
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const sessionAmt = checkoutSession ? getSessionAmount(checkoutSession) : 0;
  const subtotal = cartSubtotal + sessionAmt;
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);

  const checkout = async () => {
    if (!checkoutSession || !tenantId || !user) return;
    setCheckingOut(true);
    const now = new Date();
    const durationMins = Math.floor(checkoutSession.elapsed / 60);

    // End the session
    const { error: sessErr } = await supabase.from("sessions").update({
      ended_at: now.toISOString(),
      duration_mins: durationMins,
      total_amount: sessionAmt,
      status: "completed",
    }).eq("id", checkoutSession.id);
    if (sessErr) { toast.error(sessErr.message); setCheckingOut(false); return; }

    // Create bill
    const { data: bill, error: billErr } = await supabase.from("bills").insert({
      tenant_id: tenantId,
      staff_id: user.id,
      session_id: checkoutSession.id,
      subtotal,
      discount_amount: discountAmt,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: total,
      payment_method: paymentMethod,
      status: "completed",
    }).select().single();

    if (billErr) { toast.error(billErr.message); setCheckingOut(false); return; }

    // Insert bill items — session time
    const billItems = [];
    if (sessionAmt > 0) {
      billItems.push({
        tenant_id: tenantId,
        bill_id: bill.id,
        item_type: "session",
        name: `Session — ${(checkoutSession as any).stations?.name || "Station"}`,
        qty: 1,
        unit_price: sessionAmt,
        total_price: sessionAmt,
      });
    }
    // Product items
    for (const item of cart) {
      billItems.push({
        tenant_id: tenantId,
        bill_id: bill.id,
        item_type: "product",
        product_id: item.product_id,
        name: item.name,
        qty: item.qty,
        unit_price: item.price,
        total_price: item.price * item.qty,
      });
    }
    if (billItems.length > 0) {
      await supabase.from("bill_items").insert(billItems);
    }

    // Update stock
    for (const item of cart) {
      const product = products.find(p => p.id === item.product_id);
      if (product?.track_stock) {
        await supabase.from("products").update({ stock: Math.max(0, product.stock - item.qty) }).eq("id", item.product_id);
      }
    }

    // Free station
    await supabase.from("stations").update({ is_occupied: false }).eq("id", checkoutSession.station_id);

    toast.success(`Bill ${bill.bill_number || ""} created — ${sym}${total.toFixed(2)}`);
    setCheckoutOpen(false);
    setCheckingOut(false);
    load();
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchCat = categoryFilter === "all" || (p as any).categories?.name === categoryFilter || (!p.categories && categoryFilter === "none");
    return matchSearch && matchCat;
  });

  const availableStations = stations.filter(s => !s.is_occupied);
  const occupiedStations = stations.filter(s => s.is_occupied);

  return (
    <div>
      <PageHeader title="Point of Sale" description="Start sessions and create bills" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-4 w-4 text-green-500" />
                  Active Sessions ({activeSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activeSessions.map(s => (
                    <div key={s.id} className="border border-green-500/30 bg-green-500/5 rounded-lg p-3">
                      <p className="font-medium text-sm">{(s as any).stations?.name || "Station"}</p>
                      <p className="text-2xl font-mono font-bold text-green-500 my-1">{fmt(s.elapsed)}</p>
                      <p className="text-xs text-muted-foreground">{sym}{getSessionAmount(s).toFixed(2)}</p>
                      <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => openCheckout(s)}>
                        <Receipt className="h-3 w-3 mr-1" />Checkout
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-3 gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : stations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No stations configured. Go to Stations page to add some.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stations.map(s => (
                    <button
                      key={s.id}
                      disabled={s.is_occupied}
                      onClick={() => !s.is_occupied && setSelectedStation(s)}
                      className={`h-16 rounded-lg border text-left px-3 transition-all text-sm ${
                        s.is_occupied
                          ? "border-red-500/30 bg-red-500/5 text-red-400 cursor-not-allowed"
                          : selectedStation?.id === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs opacity-70 capitalize">{s.type} · {sym}{s.rate_per_hour}/hr</p>
                      {s.is_occupied && <p className="text-xs text-red-400">In Use</p>}
                    </button>
                  ))}
                </div>
              )}
              {selectedStation && (
                <div className="mt-3 flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-sm font-medium">Start session on <strong>{selectedStation.name}</strong></p>
                    <p className="text-xs text-muted-foreground">{sym}{selectedStation.rate_per_hour}/hr</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedStation(null)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => startSession(selectedStation)}>
                      <Play className="h-3 w-3 mr-1" />Start
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input placeholder="Search products…" value={productSearch} onChange={e => setProductSearch(e.target.value)} className="flex-1" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {loading ? (
                <div className="grid grid-cols-3 gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No products found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={p.track_stock && p.stock === 0}
                      className={`h-14 rounded-lg border text-left px-3 text-sm transition-all ${
                        p.track_stock && p.stock === 0
                          ? "border-border opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/50 hover:bg-muted/50 active:scale-95"
                      }`}
                    >
                      <p className="font-medium leading-tight truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{sym}{p.price.toFixed(2)}{p.track_stock ? ` · ${p.stock} left` : ""}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — Cart */}
        <Card className="lg:sticky lg:top-6 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="max-h-64">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{sym}{item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="text-sm w-6 text-center">{item.qty}</span>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeFromCart(item.product_id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <p className="text-sm font-semibold w-16 text-right shrink-0">{sym}{(item.price * item.qty).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Subtotal</span>
                  <span>{sym}{cartSubtotal.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full"
                  disabled={activeSessions.length === 0 && cart.length === 0}
                  onClick={() => {
                    if (activeSessions.length === 1) {
                      openCheckout(activeSessions[0]);
                    } else if (activeSessions.length > 1) {
                      toast.info("Select a session above to checkout");
                    } else {
                      toast.info("Start a session first, or use Quick Bill below");
                    }
                  }}
                >
                  Checkout
                </Button>
              </>
            )}

            {cart.length === 0 && activeSessions.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">Click Checkout on a session above, then add products</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Checkout — {(checkoutSession as any)?.stations?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Session time */}
            {checkoutSession && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Session time</span>
                  <span className="font-mono">{fmt(checkoutSession.elapsed)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Session charge</span>
                  <span className="font-medium">{sym}{sessionAmt.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Cart items in checkout */}
            {cart.length > 0 && (
              <div className="space-y-1">
                {cart.map(item => (
                  <div key={item.product_id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                    <span>{sym}{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{sym}{subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} className="h-7 w-24 text-right" />
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{sym}{total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "card", "online", "credit", "complimentary"].map(m => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={checkout} disabled={checkingOut} className="bg-green-600 hover:bg-green-700">
              {checkingOut ? "Processing…" : `Confirm — ${sym}${total.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
