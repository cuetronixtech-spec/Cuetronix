import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShoppingCart, Trash2, Plus, Minus, User, CheckCircle2, X,
  CreditCard, Ticket, Award, Search, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ProductCard, { type ProductForCard } from "@/components/ProductCard";
import SavedCartsManager, {
  type SavedCart,
  saveCartToStorage, loadCartFromStorage, removeCartFromStorage,
} from "@/components/SavedCartsManager";
import Receipt, { type ReceiptBill } from "@/components/Receipt";

// ── Types ──────────────────────────────────────────────────────────────────

type Customer = {
  id: string; name: string; phone: string | null; email: string | null;
  membership_type: string; loyalty_points: number; total_spend: number; visit_count: number;
};

type CartItem = {
  product_id: string | null;
  name: string; price: number; qty: number;
  isSession?: boolean; sessionId?: string; stationId?: string;
};

type DiscountState = { amount: number; type: "flat" | "percent" };

type CompletedBill = ReceiptBill & { subtotal: number; discount_amount: number; loyalty_points_used: number; loyalty_points_earned: number; };

// ── Category helpers ───────────────────────────────────────────────────────

const CAT_ORDER = ["food", "drinks", "tobacco", "challenges", "membership"];

const TABS = [
  { key: "all",        label: "All",         activeClass: "bg-purple-600 text-white" },
  { key: "food",       label: "Food",        activeClass: "bg-orange-500 text-white" },
  { key: "drinks",     label: "Drinks",      activeClass: "bg-blue-600 text-white" },
  { key: "tobacco",    label: "Tobacco",     activeClass: "bg-red-600 text-white" },
  { key: "challenges", label: "Challenges",  activeClass: "bg-green-600 text-white" },
  { key: "membership", label: "Membership",  activeClass: "bg-violet-600 text-white" },
];

const getCatName = (p: ProductForCard) => p.categories?.name?.toLowerCase()?.trim() || "";

const sortProducts = (arr: ProductForCard[], activeTab: string) =>
  [...arr].sort((a, b) => {
    if (activeTab !== "all") return a.name.localeCompare(b.name);
    const ai = CAT_ORDER.indexOf(getCatName(a));
    const bi = CAT_ORDER.indexOf(getCatName(b));
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name);
  });

// ── Formatting ─────────────────────────────────────────────────────────────

const fmt = (sym: string, n: number) => `${sym}${Math.round(n).toLocaleString("en-IN")}`;

// ── Main Component ─────────────────────────────────────────────────────────

export default function POS() {
  const { config } = useTenant();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tenantId = config?.tenant_id || "";
  const sym = config?.currency_symbol || "₹";

  // ── Data ────────────────────────────────────────────────────────────────

  const [products, setProducts] = useState<ProductForCard[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [prRes, cuRes] = await Promise.all([
      supabase.from("products").select("id,name,price,cost_price,stock,track_stock,categories(name)").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order").order("name"),
      supabase.from("customers").select("id,name,phone,email,membership_type,loyalty_points,total_spend,visit_count").eq("tenant_id", tenantId).order("name"),
    ]);
    setProducts((prRes.data || []) as unknown as ProductForCard[]);
    setCustomers((cuRes.data || []) as Customer[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // ── Cart state ──────────────────────────────────────────────────────────

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<DiscountState>({ amount: 0, type: "flat" });
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);

  // Auto-save cart on change
  useEffect(() => {
    if (!selectedCustomer || !tenantId) return;
    if (cart.length > 0 || discount.amount > 0 || loyaltyPointsUsed > 0) {
      saveCartToStorage(tenantId, selectedCustomer, cart, discount, loyaltyPointsUsed);
    }
  }, [cart, discount, loyaltyPointsUsed, selectedCustomer, tenantId]);

  // ── Pending session from URL ─────────────────────────────────────────────

  const pendingSessionHandled = useRef(false);
  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (!sessionId || !tenantId || pendingSessionHandled.current) return;
    pendingSessionHandled.current = true;

    supabase.from("sessions").select("id,station_id,customer_id,started_at,ended_at,rate_per_hour,stations(name,type)")
      .eq("id", sessionId).single()
      .then(({ data }) => {
        if (!data) return;
        const started = new Date(data.started_at).getTime();
        const ended = data.ended_at ? new Date(data.ended_at).getTime() : Date.now();
        const elapsedMins = (ended - started) / 60000;
        const rate = Number(data.rate_per_hour) || 0;
        const stationType = (data as Record<string, unknown>).stations ? ((data as Record<string, unknown>).stations as Record<string, unknown>).type as string : "pool";
        const cost = stationType === "darts"
          ? Math.ceil(elapsedMins / 15) * rate
          : Math.ceil((elapsedMins / 60) * rate);
        const sessionName = (data as Record<string, unknown>).stations ? `Session — ${((data as Record<string, unknown>).stations as Record<string, unknown>).name}` : "Gaming Session";
        const sessionItem: CartItem = { product_id: null, name: sessionName, price: cost, qty: 1, isSession: true, sessionId: data.id, stationId: data.station_id };
        setCart([sessionItem]);
        // Auto-select customer if session had one
        if (data.customer_id) {
          supabase.from("customers").select("id,name,phone,email,membership_type,loyalty_points,total_spend,visit_count").eq("id", data.customer_id).single().then(({ data: cust }) => {
            if (cust) { setSelectedCustomer(cust as Customer); toast.info(`Customer loaded: ${(cust as Customer).name}`); }
          });
        }
        toast.success(`Session loaded: ${sessionName} — ${fmt(sym, cost)}`);
      });
  }, [searchParams, tenantId, sym]);

  // ── Cart operations ──────────────────────────────────────────────────────

  const addToCart = (product: ProductForCard) => {
    setCart(prev => {
      const existing = prev.find(c => c.product_id === product.id);
      if (existing) return prev.map(c => c.product_id === product.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { product_id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateCartItem = (productId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.product_id === productId ? { ...c, qty: Math.max(1, c.qty + delta) } : c);
      return updated;
    });
  };

  const removeFromCart = (productId: string | null, idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount({ amount: 0, type: "flat" });
    setLoyaltyPointsUsed(0);
    if (selectedCustomer && tenantId) removeCartFromStorage(tenantId, selectedCustomer.id);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    if (tenantId) {
      const saved = loadCartFromStorage(tenantId, customer.id);
      if (saved && saved.items.length > 0) {
        setCart(saved.items);
        setDiscount(saved.discount);
        setLoyaltyPointsUsed(saved.loyaltyPointsUsed);
        toast.success(`Cart Restored — ${saved.items.length} item(s) has been restored`);
      } else {
        toast.success("Customer Selected");
      }
    }
    setCustomerDialogOpen(false);
    setCustomerSearch("");
  };

  const handleRestoreCart = (saved: SavedCart) => {
    const cust = customers.find(c => c.id === saved.customerId);
    if (cust) setSelectedCustomer(cust);
    setCart(saved.items);
    setDiscount(saved.discount);
    setLoyaltyPointsUsed(saved.loyaltyPointsUsed);
    toast.success(`Cart Restored — ${saved.items.length} item(s)`);
  };

  // ── Computed values ──────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = discount.type === "percent"
    ? Math.round(subtotal * discount.amount / 100)
    : discount.amount;
  const loyaltyDeduction = loyaltyPointsUsed * (config?.loyalty_unit_per_point || 1);
  const total = Math.max(0, subtotal - discountAmt - loyaltyDeduction);

  const isMember = (c: Customer | null) => c?.membership_type === "premium" || c?.membership_type === "vip";

  // ── Product filtering ────────────────────────────────────────────────────

  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleProducts = products.filter(p => {
    const cat = getCatName(p);
    const inStock = cat === "membership" || !p.track_stock || p.stock > 0;
    const matchSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchCat = activeCategory === "all" || cat === activeCategory;
    return inStock && matchSearch && matchCat;
  });

  const sortedProducts = sortProducts(visibleProducts, activeCategory);

  const catCount = (key: string) => products.filter(p => {
    const cat = getCatName(p);
    const inStock = cat === "membership" || !p.track_stock || p.stock > 0;
    return inStock && (key === "all" || cat === key);
  }).length;

  // ── Dialogs state ────────────────────────────────────────────────────────

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [clearCartOpen, setClearCartOpen] = useState(false);
  const [lastBill, setLastBill] = useState<CompletedBill | null>(null);

  // Customer dialog state
  const [customerSearch, setCustomerSearch] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [addingQuick, setAddingQuick] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Checkout dialog state
  const [checkoutPayment, setCheckoutPayment] = useState("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountTypeInput, setDiscountTypeInput] = useState<"flat" | "percent">("flat");
  const [loyaltyInput, setLoyaltyInput] = useState("");
  const [customDateEnabled, setCustomDateEnabled] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [compNote, setCompNote] = useState("");
  const [completing, setCompleting] = useState(false);

  const openCheckout = () => {
    const now = new Date();
    setCustomDate(now.toISOString().split("T")[0]);
    setCustomTime(now.toTimeString().slice(0, 5));
    setCheckoutPayment("cash");
    setSplitCash(String(total));
    setSplitUpi("0");
    setDiscountInput(discount.amount > 0 ? String(discount.amount) : "");
    setDiscountTypeInput(discount.type);
    setLoyaltyInput(loyaltyPointsUsed > 0 ? String(loyaltyPointsUsed) : "");
    setCustomDateEnabled(false);
    setCheckoutOpen(true);
  };

  const openComp = () => {
    const now = new Date();
    setCustomDate(now.toISOString().split("T")[0]);
    setCustomTime(now.toTimeString().slice(0, 5));
    setCustomDateEnabled(false);
    setCompNote("");
    setCompOpen(true);
  };

  // ── Split payment helpers ────────────────────────────────────────────────

  const handleSplitCash = (val: string) => {
    setSplitCash(val);
    const n = parseFloat(val) || 0;
    setSplitUpi(String(Math.max(0, total - n)));
  };
  const handleSplitUpi = (val: string) => {
    setSplitUpi(val);
    const n = parseFloat(val) || 0;
    setSplitCash(String(Math.max(0, total - n)));
  };
  const splitValid = Math.abs((parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) - total) < 0.01;

  // ── Apply discount / loyalty ─────────────────────────────────────────────

  const applyDiscount = () => {
    const amt = parseFloat(discountInput) || 0;
    if (amt <= 0) return;
    setDiscount({ amount: amt, type: discountTypeInput });
    toast.success(`Discount applied: ${discountTypeInput === "percent" ? `${amt}%` : `${sym}${amt}`}`);
  };

  const applyLoyalty = () => {
    const pts = parseInt(loyaltyInput) || 0;
    const maxPts = selectedCustomer?.loyalty_points || 0;
    if (pts <= 0 || pts > maxPts) { toast.error(`Max ${maxPts} points available`); return; }
    setLoyaltyPointsUsed(pts);
    toast.success(`${pts} loyalty points applied`);
  };

  // ── Complete sale ────────────────────────────────────────────────────────

  const completeSale = async (method: string, note?: string, customTs?: string) => {
    if (!tenantId || !user || cart.length === 0 || !selectedCustomer) return;
    setCompleting(true);

    const isComp = method === "complimentary";
    const finalTotal = isComp ? 0 : total;
    const pointsEarned = isComp ? 0 : Math.floor(finalTotal * (config?.loyalty_points_per_unit || 0));

    const sessionItem = cart.find(c => c.isSession);
    const breakdown = method === "split" ? { cash: parseFloat(splitCash) || 0, upi: parseFloat(splitUpi) || 0 } : {};

    // Insert bill
    const billPayload: Record<string, unknown> = {
      tenant_id: tenantId,
      staff_id: user.id,
      customer_id: selectedCustomer.id,
      session_id: sessionItem?.sessionId || null,
      subtotal,
      discount_amount: isComp ? 0 : discountAmt,
      discount_type: discount.type,
      tax_rate: 0, tax_amount: 0,
      total_amount: finalTotal,
      payment_method: isComp ? "complimentary" : method,
      payment_breakdown: breakdown,
      loyalty_points_used: isComp ? 0 : loyaltyPointsUsed,
      loyalty_points_earned: pointsEarned,
      status: isComp ? "complimentary" : "completed",
      comp_note: isComp ? (note || null) : null,
    };
    if (customTs) billPayload.created_at = customTs;

    const { data: bill, error: billErr } = await supabase.from("bills").insert(billPayload).select().single();
    if (billErr) { toast.error(billErr.message); setCompleting(false); return; }

    // Insert bill items
    const billItems = cart.map(c => ({
      tenant_id: tenantId, bill_id: bill.id,
      item_type: c.isSession ? "session" : "product",
      product_id: c.product_id || null,
      name: c.name, qty: c.qty, unit_price: c.price, total_price: c.price * c.qty,
    }));
    await supabase.from("bill_items").insert(billItems);

    // Update product stocks
    for (const item of cart) {
      if (!item.product_id) continue;
      const prod = products.find(p => p.id === item.product_id);
      if (prod?.track_stock) {
        await supabase.from("products").update({ stock: Math.max(0, prod.stock - item.qty) }).eq("id", item.product_id);
      }
    }

    // Update customer stats
    await supabase.from("customers").update({
      loyalty_points: Math.max(0, (selectedCustomer.loyalty_points - (isComp ? 0 : loyaltyPointsUsed)) + pointsEarned),
      total_spend: selectedCustomer.total_spend + (isComp ? 0 : finalTotal),
      visit_count: selectedCustomer.visit_count + 1,
      last_visit_at: new Date().toISOString(),
    }).eq("id", selectedCustomer.id);

    // Build completed bill for receipt/success
    const completedBill: CompletedBill = {
      id: bill.id,
      bill_number: bill.bill_number || null,
      created_at: bill.created_at,
      total_amount: finalTotal,
      subtotal,
      discount_amount: isComp ? 0 : discountAmt,
      loyalty_points_used: isComp ? 0 : loyaltyPointsUsed,
      loyalty_points_earned: pointsEarned,
      payment_method: bill.payment_method,
      status: bill.status,
      comp_note: note || null,
      items: cart.map(c => ({ name: c.name, qty: c.qty, unit_price: c.price, total_price: c.price * c.qty })),
      customer: { name: selectedCustomer.name, phone: selectedCustomer.phone },
    };

    setLastBill(completedBill);
    removeCartFromStorage(tenantId, selectedCustomer.id);
    setCart([]);
    setDiscount({ amount: 0, type: "flat" });
    setLoyaltyPointsUsed(0);
    setCheckoutOpen(false);
    setCompOpen(false);
    setCompleting(false);
    setSuccessOpen(true);
    if (isComp) toast.success("Marked as Complimentary");
    else toast.success(`Bill ${bill.bill_number || ""} completed — ${fmt(sym, finalTotal)}`);
    load();
  };

  const handleCompleteCheckout = () => {
    const customTs = customDateEnabled && customDate && customTime
      ? new Date(`${customDate}T${customTime}`).toISOString()
      : undefined;
    completeSale(checkoutPayment, undefined, customTs);
  };

  const handleCompleteComp = () => {
    const customTs = customDateEnabled && customDate && customTime
      ? new Date(`${customDate}T${customTime}`).toISOString()
      : undefined;
    completeSale("complimentary", compNote, customTs);
  };

  // ── Quick add customer ───────────────────────────────────────────────────

  const handleQuickAddCustomer = async () => {
    if (!quickAddName.trim() || !tenantId) return;
    setAddingQuick(true);
    const { data, error } = await supabase.from("customers").insert({
      tenant_id: tenantId, name: quickAddName.trim(), phone: quickAddPhone.trim() || null,
    }).select("id,name,phone,email,membership_type,loyalty_points,total_spend,visit_count").single();
    if (error) { toast.error(error.message); setAddingQuick(false); return; }
    const newCust = data as Customer;
    setCustomers(prev => [...prev, newCust].sort((a, b) => a.name.localeCompare(b.name)));
    handleSelectCustomer(newCust);
    setQuickAddName(""); setQuickAddPhone(""); setShowQuickAdd(false);
    setAddingQuick(false);
    toast.success("Customer created");
  };

  // ── Custom timestamp preview ─────────────────────────────────────────────

  const customTsPreview = customDateEnabled && customDate && customTime
    ? new Date(`${customDate}T${customTime}`).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : null;

  // ── Checkout total (recalculated from inputs) ────────────────────────────

  const checkoutDiscountAmt = discountTypeInput === "percent"
    ? Math.round(subtotal * (parseFloat(discountInput) || 0) / 100)
    : (parseFloat(discountInput) || 0);
  const checkoutLoyaltyDeduction = (parseInt(loyaltyInput) || 0) * (config?.loyalty_unit_per_point || 1);
  const checkoutTotal = Math.max(0, subtotal - checkoutDiscountAmt - checkoutLoyaltyDeduction);

  // ── Saved carts for customer badges ─────────────────────────────────────

  const savedCartCounts: Record<string, number> = {};
  if (tenantId) {
    const prefix = `pos_cart_v1_${tenantId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const d = JSON.parse(localStorage.getItem(key) || "");
        if (d?.items?.length) savedCartCounts[d.customerId] = d.items.length;
      } catch { /* ignore */ }
    }
  }

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || "").includes(q);
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader title="Point of Sale" description="Add products, select a customer, and complete the sale" />

      {/* Main grid: Cart (1/3) | Products (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── Products Panel (2/3) — shown first on mobile ── */}
        <div className="lg:col-span-2 order-1 lg:order-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Products</CardTitle>
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products…" className="pl-8 h-8 text-sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category tab bar */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-nowrap scrollbar-thin">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategory(tab.key)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                      activeCategory === tab.key ? tab.activeClass : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {tab.label} ({catCount(tab.key)})
                  </button>
                ))}
              </div>

              {/* Product grid */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
                </div>
              ) : sortedProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No products found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {sortedProducts.map((p, i) => (
                    <div key={p.id} className="animate-in fade-in-0" style={{ animationDelay: `${Math.min(i, 8) * 50}ms`, animationFillMode: "both" }}>
                      <ProductCard
                        product={p}
                        cartQty={cart.find(c => c.product_id === p.id)?.qty || 0}
                        onAddToCart={() => addToCart(p)}
                        sym={sym}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Cart Panel (1/3) — shown second on mobile, sticky on desktop ── */}
        <div className="order-2 lg:order-1 lg:sticky lg:top-20">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Cart</CardTitle>
                </div>
                {cart.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => setClearCartOpen(true)}>
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{cart.length} item{cart.length !== 1 ? "s" : ""} in cart</p>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Cart items */}
              <ScrollArea className="max-h-72">
                {cart.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/40 animate-pulse" />
                    <p className="text-sm font-medium text-muted-foreground">Cart Empty</p>
                    <p className="text-xs text-muted-foreground">Add products to the cart to begin</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 animate-in fade-in-0" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">{fmt(sym, item.price)} each</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.isSession ? (
                            <span className="text-xs text-muted-foreground px-2">{item.qty}</span>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => item.product_id && updateCartItem(item.product_id, -1)}><Minus className="h-2.5 w-2.5" /></Button>
                              <span className="text-xs w-5 text-center font-medium">{item.qty}</span>
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => item.product_id && updateCartItem(item.product_id, 1)}><Plus className="h-2.5 w-2.5" /></Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.product_id, idx)}><X className="h-3 w-3" /></Button>
                        </div>
                        <p className="text-xs font-semibold w-14 text-right shrink-0">{fmt(sym, item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Totals */}
              {cart.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmt(sym, subtotal)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-purple-400">
                        <span>Discount ({discount.type === "percent" ? `${discount.amount}%` : "flat"})</span>
                        <span>-{fmt(sym, discountAmt)}</span>
                      </div>
                    )}
                    {loyaltyDeduction > 0 && (
                      <div className="flex justify-between text-orange-400">
                        <span>Loyalty ({loyaltyPointsUsed} pts)</span>
                        <span>-{fmt(sym, loyaltyDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base text-primary pt-1">
                      <span>Total</span>
                      <span>{fmt(sym, total)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                {/* Select Customer */}
                <Button
                  className={cn("w-full text-xs h-8", selectedCustomer
                    ? "variant-outline border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border-0"
                  )}
                  variant={selectedCustomer ? "outline" : "default"}
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  {selectedCustomer ? selectedCustomer.name : "Select Customer"}
                </Button>
                {/* Checkout */}
                <Button
                  className="w-full text-xs h-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0"
                  onClick={openCheckout}
                  disabled={cart.length === 0 || !selectedCustomer}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />Checkout
                </Button>
                {/* Comp */}
                {config?.enable_complimentary !== false && (
                  <Button
                    className="w-full text-xs h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white border-0"
                    onClick={openComp}
                    disabled={cart.length === 0 || !selectedCustomer}
                  >
                    <Ticket className="h-3.5 w-3.5 mr-1.5" />Comp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Saved Carts Manager */}
      <SavedCartsManager tenantId={tenantId} sym={sym} onRestoreCart={handleRestoreCart} />

      {/* ════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════ */}

      {/* ── Customer Selection Dialog ── */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Select Customer</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search by name or phone…" className="pl-8" autoFocus />
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowQuickAdd(q => !q)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />Quick Add
            </Button>
          </div>

          {/* Quick add mini-form */}
          {showQuickAdd && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium">New Customer</p>
              <div className="flex gap-2">
                <Input value={quickAddName} onChange={e => setQuickAddName(e.target.value)} placeholder="Name *" className="flex-1" />
                <Input value={quickAddPhone} onChange={e => setQuickAddPhone(e.target.value)} placeholder="Phone" className="w-36" />
                <Button size="sm" onClick={handleQuickAddCustomer} disabled={addingQuick || !quickAddName.trim()}>
                  {addingQuick ? "…" : "Add"}
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No customers found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="relative text-left rounded-lg border p-3 hover:bg-muted/60 hover:border-primary/40 transition-all"
                  >
                    {/* Saved cart badge */}
                    {savedCartCounts[c.id] && (
                      <div className="absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full animate-pulse z-10">
                        🛒 {savedCartCounts[c.id]}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {c.phone && <p className="text-[11px] text-muted-foreground">{c.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {isMember(c) && <Badge className="text-[10px] h-4 px-1 bg-green-500/20 text-green-300 border-green-500/30">Member</Badge>}
                      {c.loyalty_points > 0 && <span className="text-[10px] text-muted-foreground">{c.loyalty_points} pts</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Checkout Dialog ── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* Customer info */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{selectedCustomer.name}</p>
                    {isMember(selectedCustomer) && <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500/30">Member</Badge>}
                  </div>
                  {selectedCustomer.phone && <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>}
                  <p className="text-xs text-muted-foreground">{selectedCustomer.loyalty_points} loyalty points available</p>
                </div>
              </div>
            )}

            {/* Discount */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Apply Discount</p>
              <div className="flex gap-2">
                <Input type="number" min="0" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="Amount" className="flex-1" />
                <Select value={discountTypeInput} onValueChange={v => setDiscountTypeInput(v as "flat" | "percent")}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">₹ Flat</SelectItem>
                    <SelectItem value="percent">% Off</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={applyDiscount}>Apply</Button>
              </div>
            </div>

            {/* Loyalty points */}
            {selectedCustomer && selectedCustomer.loyalty_points > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-orange-400" /> Use Loyalty Points</p>
                <div className="flex gap-2">
                  <Input type="number" min="0" max={selectedCustomer.loyalty_points} value={loyaltyInput} onChange={e => setLoyaltyInput(e.target.value)} placeholder={`Max ${selectedCustomer.loyalty_points}`} className="flex-1" />
                  <Button size="sm" variant="outline" onClick={applyLoyalty}>Apply</Button>
                </div>
                <p className="text-xs text-muted-foreground">Customer has {selectedCustomer.loyalty_points} points ({sym}1 per point)</p>
              </div>
            )}

            {/* Order summary */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Order Summary</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(sym, subtotal)}</span></div>
              {checkoutDiscountAmt > 0 && <div className="flex justify-between text-purple-400"><span>Discount</span><span>-{fmt(sym, checkoutDiscountAmt)}</span></div>}
              {checkoutLoyaltyDeduction > 0 && <div className="flex justify-between text-orange-400"><span>Loyalty</span><span>-{fmt(sym, checkoutLoyaltyDeduction)}</span></div>}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base text-primary"><span>Total</span><span>{fmt(sym, checkoutTotal)}</span></div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-sm font-medium mb-2">Payment Method</p>
              <RadioGroup value={checkoutPayment} onValueChange={p => { setCheckoutPayment(p); if (p === "split") { setSplitCash(String(checkoutTotal)); setSplitUpi("0"); } }} className="grid grid-cols-2 gap-2">
                {[["cash","Cash"],["upi","UPI"],["credit","Credit"],["split","Split"]].map(([val,label]) => (
                  <div key={val} className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value={val} id={`pm-${val}`} />
                    <Label htmlFor={`pm-${val}`} className="cursor-pointer text-sm">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Split payment form */}
            {checkoutPayment === "split" && (
              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Split Payment Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Cash ({sym})</Label><Input type="number" min="0" value={splitCash} onChange={e => handleSplitCash(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">UPI ({sym})</Label><Input type="number" min="0" value={splitUpi} onChange={e => handleSplitUpi(e.target.value)} className="mt-1" /></div>
                </div>
                {!splitValid && <p className="text-xs text-destructive">Cash + UPI must equal {fmt(sym, checkoutTotal)}</p>}
              </div>
            )}

            {/* Custom date/time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="custom-date" checked={customDateEnabled} onCheckedChange={v => setCustomDateEnabled(v as boolean)} />
                <Label htmlFor="custom-date" className="text-sm cursor-pointer">Custom Bill Date/Time</Label>
              </div>
              {customDateEnabled && (
                <div className="space-y-2 pl-6">
                  <div className="flex gap-2">
                    <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="flex-1" />
                    <Input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="flex-1" />
                  </div>
                  {customTsPreview && <p className="text-xs text-muted-foreground">Bill will be dated: <strong>{customTsPreview}</strong></p>}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCompleteCheckout}
              disabled={completing || (checkoutPayment === "split" && !splitValid)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {completing ? "Processing…" : `Complete Sale (${fmt(sym, checkoutTotal)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Complimentary Dialog ── */}
      <Dialog open={compOpen} onOpenChange={setCompOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complimentary Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{selectedCustomer.name}</p>
              </div>
            )}
            <div>
              <Label>Reason / Note (optional)</Label>
              <textarea
                value={compNote}
                onChange={e => setCompNote(e.target.value)}
                rows={3}
                placeholder="e.g. Owner consumption, Friend - Raj, Staff meal…"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Custom date/time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="comp-custom-date" checked={customDateEnabled} onCheckedChange={v => setCustomDateEnabled(v as boolean)} />
                <Label htmlFor="comp-custom-date" className="text-sm cursor-pointer">Custom Bill Date/Time</Label>
              </div>
              {customDateEnabled && (
                <div className="space-y-2 pl-6">
                  <div className="flex gap-2">
                    <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="flex-1" />
                    <Input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="flex-1" />
                  </div>
                  {customTsPreview && <p className="text-xs text-muted-foreground">Bill will be dated: <strong>{customTsPreview}</strong></p>}
                </div>
              )}
            </div>

            {/* Items summary */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Items</p>
              <ScrollArea className="max-h-40">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span className="text-muted-foreground truncate max-w-[60%]">{item.name} × {item.qty}</span>
                    <span>{fmt(sym, item.price * item.qty)}</span>
                  </div>
                ))}
              </ScrollArea>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-medium text-orange-400">
                <span>Total Value</span><span>{fmt(sym, subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">₹0 will be charged</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteComp} disabled={completing} className="bg-orange-500 hover:bg-orange-600 text-white">
              {completing ? "Processing…" : "Mark as Complimentary"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Success Dialog ── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">Payment Successful!</h2>
              {lastBill && (
                <>
                  <p className="text-3xl font-bold text-green-500 mt-2">{fmt(sym, lastBill.total_amount)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(lastBill.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {lastBill.loyalty_points_earned > 0 && (
                    <p className="text-xs text-primary mt-1">+{lastBill.loyalty_points_earned} loyalty points earned</p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { setSuccessOpen(false); setTimeout(() => setReceiptOpen(true), 100); }}>
                View Receipt
              </Button>
              <Button onClick={() => { setSuccessOpen(false); setSelectedCustomer(null); }}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Dialog ── */}
      {lastBill && (
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Receipt — {lastBill.bill_number || lastBill.id.slice(0, 8)}</DialogTitle></DialogHeader>
            <Receipt
              bill={lastBill}
              brandName={config?.brand_name || null}
              businessAddress={config?.business_address || null}
              businessPhone={config?.business_phone || null}
              sym={sym}
              onClose={() => setReceiptOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Clear Cart Alert ── */}
      <AlertDialog open={clearCartOpen} onOpenChange={setClearCartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear cart?</AlertDialogTitle>
            <AlertDialogDescription>This will remove all {cart.length} item{cart.length !== 1 ? "s" : ""} from the cart.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { clearCart(); setClearCartOpen(false); }}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
