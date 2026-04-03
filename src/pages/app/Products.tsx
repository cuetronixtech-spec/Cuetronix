import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, AlertTriangle, Minus, Download, PackagePlus, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────

type Category = { id: string; name: string };

type Product = {
  id: string; name: string; price: number; cost_price: number | null;
  stock: number; low_stock_threshold: number; is_active: boolean;
  track_stock: boolean; category_id: string | null; sku: string | null;
  categories?: { name: string } | null;
};

type StockFilter = "all" | "in_stock" | "low_stock" | "zero_stock";

// ── POS category sort order (matches POS page) ─────────────────────────────

const CAT_POS_ORDER = ["food", "drinks", "tobacco", "challenges", "membership"];

function sortCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    const ai = CAT_POS_ORDER.indexOf(a.name.toLowerCase());
    const bi = CAT_POS_ORDER.indexOf(b.name.toLowerCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

const blankProduct = (categoryId?: string) => ({
  name: "", category_id: categoryId || "__none__", price: "", cost_price: "",
  sku: "", stock: "0", low_stock_threshold: "5", track_stock: true, is_active: true,
});

// ── Component ──────────────────────────────────────────────────────────────

export default function Products() {
  const { config } = useTenant();
  const { appMeta } = useAuth();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";
  const isAdmin = appMeta?.role === "admin";

  // ── Data ────────────────────────────────────────────────────────────────

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [prods, cats] = await Promise.all([
      supabase.from("products").select("*, categories(name)").eq("tenant_id", tenantId).order("name"),
      supabase.from("categories").select("id, name").eq("tenant_id", tenantId).order("name"),
    ]);
    setProducts((prods.data || []) as Product[]);
    setCategories(cats.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedCategories = useMemo(() => sortCategories(categories), [categories]);

  // ── Filters ──────────────────────────────────────────────────────────────

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // True tab counts (not affected by search or stockFilter — Fix Bug 4)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length, low_stock: 0 };
    categories.forEach(c => { counts[c.id] = 0; });
    products.forEach(p => {
      if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      if (p.track_stock && p.stock <= p.low_stock_threshold) counts.low_stock++;
    });
    return counts;
  }, [products, categories]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
      const matchTab = tab === "all"
        || (tab === "low_stock" && p.track_stock && p.stock <= p.low_stock_threshold)
        || p.category_id === tab;
      const matchStock = stockFilter === "all"
        || (stockFilter === "in_stock"  && (!p.track_stock || p.stock > p.low_stock_threshold))
        || (stockFilter === "low_stock" && p.track_stock && p.stock > 0 && p.stock <= p.low_stock_threshold)
        || (stockFilter === "zero_stock" && p.track_stock && p.stock === 0);
      return matchSearch && matchTab && matchStock;
    });
  }, [products, search, tab, stockFilter]);

  // ── Inline stock adjustment ──────────────────────────────────────────────

  const { user } = useAuth();

  const adjustStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("stock_history").insert({
      tenant_id: tenantId, product_id: product.id,
      delta, stock_after: newStock,
      reason: delta > 0 ? "manual_add" : "manual_remove",
      note: "Quick stock adjustment",
      created_by: user?.id || null,
    });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
  };

  // ── Add / Edit dialog ────────────────────────────────────────────────────

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankProduct());

  const openAdd = () => {
    setEditing(null);
    // Pre-fill category from active tab (Improvement)
    const catId = tab !== "all" && tab !== "low_stock" ? tab : undefined;
    setForm(blankProduct(catId));
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, category_id: p.category_id || "__none__",
      price: String(p.price), cost_price: p.cost_price != null ? String(p.cost_price) : "",
      sku: p.sku || "", stock: String(p.stock),
      low_stock_threshold: String(p.low_stock_threshold),
      track_stock: p.track_stock, is_active: p.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !tenantId) return;
    setSaving(true);
    const oldStock = editing?.stock ?? 0;
    const newStock = parseInt(form.stock) || 0;
    const payload = {
      tenant_id: tenantId, name: form.name.trim(),
      category_id: form.category_id && form.category_id !== "__none__" ? form.category_id : null,
      price: parseFloat(form.price) || 0,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      sku: form.sku.trim() || null, stock: newStock,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      track_stock: form.track_stock, is_active: form.is_active,
    };
    const { data: saved, error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("products").insert(payload).select().single();
    if (error) { toast.error(error.message); setSaving(false); return; }

    // Record stock change in Supabase if stock was manually adjusted (Fix Bug 5)
    if (editing && form.track_stock && newStock !== oldStock) {
      const delta = newStock - oldStock;
      await supabase.from("stock_history").insert({
        tenant_id: tenantId, product_id: editing.id,
        delta, stock_after: newStock, reason: "adjustment",
        note: "Manual edit via product form", created_by: user?.id || null,
      });
    }

    toast.success(editing ? "Product updated" : "Product added");
    setOpen(false);
    setSaving(false);
    if (saved) {
      setProducts(prev => editing
        ? prev.map(p => p.id === editing.id ? { ...p, ...saved } : p)
        : [...prev, saved as Product].sort((a, b) => a.name.localeCompare(b.name))
      );
      load(); // full reload for joined category name
    }
  };

  // ── Delete dialog ────────────────────────────────────────────────────────

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); setDeleteTarget(null); return; }
    toast.success("Product deleted");
    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  // ── Category dialog ──────────────────────────────────────────────────────

  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");

  const addCategory = async () => {
    if (!catName.trim() || !tenantId) return;
    const { error } = await supabase.from("categories").insert({ tenant_id: tenantId, name: catName.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Category added");
    setCatName("");
    setCatOpen(false);
    load();
  };

  // ── Batch restock dialog ─────────────────────────────────────────────────

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchAmounts, setBatchAmounts] = useState<Record<string, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);

  const lowStockProducts = products.filter(p => p.track_stock && p.stock <= p.low_stock_threshold);

  const openBatchRestock = () => {
    const init: Record<string, string> = {};
    lowStockProducts.forEach(p => { init[p.id] = ""; });
    setBatchAmounts(init);
    setBatchOpen(true);
  };

  const saveBatchRestock = async () => {
    if (!tenantId) return;
    const updates = lowStockProducts.filter(p => parseInt(batchAmounts[p.id] || "0") > 0);
    if (updates.length === 0) { toast.info("No amounts entered"); return; }
    setBatchSaving(true);
    for (const prod of updates) {
      const delta = parseInt(batchAmounts[prod.id]);
      const newStock = prod.stock + delta;
      await supabase.from("products").update({ stock: newStock }).eq("id", prod.id);
      await supabase.from("stock_history").insert({
        tenant_id: tenantId, product_id: prod.id,
        delta, stock_after: newStock, reason: "manual_add",
        note: "Batch restock", created_by: user?.id || null,
      });
    }
    toast.success(`Restocked ${updates.length} product${updates.length !== 1 ? "s" : ""}`);
    setBatchSaving(false);
    setBatchOpen(false);
    load();
  };

  // ── CSV Export (admin-gated) ─────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["Name", "Category", "SKU", "Selling Price", "Cost Price", "Profit", "Stock", "Low Stock At", "Track Stock", "Active"];
    const rows = filtered.map(p => {
      const profit = p.cost_price != null ? p.price - p.cost_price : "";
      return [
        p.name, p.categories?.name || "", p.sku || "",
        p.price, p.cost_price ?? "", profit,
        p.track_stock ? p.stock : "∞", p.low_stock_threshold,
        p.track_stock ? "Yes" : "No", p.is_active ? "Yes" : "No",
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Profit helpers ───────────────────────────────────────────────────────

  const profitDisplay = (p: Product) => {
    if (p.cost_price == null) return null;
    const profit = p.price - p.cost_price;
    return { value: profit, negative: profit < 0 };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const tabList = [
    { key: "all", label: "All" },
    ...orderedCategories.map(c => ({ key: c.id, label: c.name })),
    { key: "low_stock", label: "⚠ Low Stock" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products & Inventory"
        description="Manage your menu and stock"
        actions={
          <div className="flex gap-2 flex-wrap">
            {lowStockProducts.length > 0 && (
              <Button variant="outline" className="text-orange-500 border-orange-500/40 hover:bg-orange-500/10" onClick={openBatchRestock}>
                <PackagePlus className="h-4 w-4 mr-2" />Batch Restock ({lowStockProducts.length})
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />Export CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => setCatOpen(true)}>Add Category</Button>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {tabList.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
              tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
            {tabCounts[t.key] !== undefined && (
              <span className="ml-1.5 opacity-70">({tabCounts[t.key]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Input
            placeholder="Search by name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-8"
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>×</button>
          )}
        </div>
        {/* Merged single stock filter (Fix Bugs 3) */}
        <Select value={stockFilter} onValueChange={v => setStockFilter(v as StockFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="in_stock">In Stock Only</SelectItem>
            <SelectItem value="low_stock">Low Stock Only</SelectItem>
            <SelectItem value="zero_stock">Zero / Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        {/* Showing X of Y (Improvement) */}
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          Showing {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
          {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : filtered.map(p => {
                  const profit = profitDisplay(p);
                  const isLow = p.track_stock && p.stock > 0 && p.stock <= p.low_stock_threshold;
                  const isZero = p.track_stock && p.stock === 0;
                  return (
                  <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name}
                        {p.sku && <span className="text-xs text-muted-foreground ml-2">#{p.sku}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.categories?.name || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{sym}{p.price.toFixed(0)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {profit ? (
                          <span className={cn("font-medium", profit.negative ? "text-red-500 flex items-center justify-end gap-0.5" : "text-green-500")}>
                            {profit.negative && <TrendingDown className="h-3 w-3" />}
                            {profit.negative ? "-" : "+"}{sym}{Math.abs(profit.value).toFixed(0)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                      {p.track_stock ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {(isLow || isZero) && <AlertTriangle className={cn("h-3 w-3", isZero ? "text-red-500" : "text-orange-500")} />}
                            <span className={cn("text-sm font-medium tabular-nums", isZero ? "text-red-500" : isLow ? "text-orange-500" : "")}>
                          {p.stock}
                        </span>
                            {/* Inline quick-stock stepper */}
                            <div className="flex items-center gap-0.5 ml-1">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" onClick={() => adjustStock(p, -1)} disabled={p.stock <= 0}>
                                <Minus className="h-2.5 w-2.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" onClick={() => adjustStock(p, 1)}>
                                <Plus className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground">∞</span>}
                    </TableCell>
                    <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                    </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(p)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          )}

      {/* ── Add / Edit Product Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${editing.name}` : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Bug Fix 1: unique htmlFor/id pairs so no duplicate IDs */}
            <div>
              <Label htmlFor="prod-name">Name *</Label>
              <Input id="prod-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="prod-category">Category</Label>
              <Select value={form.category_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, category_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger id="prod-category" className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {orderedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prod-sell-price">Selling Price ({sym})</Label>
                <Input id="prod-sell-price" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="prod-cost-price">Cost Price ({sym})</Label>
                <Input id="prod-cost-price" type="number" min="0" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} className="mt-1" />
              </div>
            </div>
            {/* Profit preview (Improvement: red if negative) */}
            {form.price && form.cost_price && (
              <div className={cn("text-xs px-2 py-1 rounded", parseFloat(form.price) - parseFloat(form.cost_price) < 0 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500")}>
                Profit: {sym}{(parseFloat(form.price) - parseFloat(form.cost_price)).toFixed(2)} per unit
                {parseFloat(form.price) - parseFloat(form.cost_price) < 0 && " ⚠ Selling below cost"}
              </div>
            )}
            <div>
              <Label htmlFor="prod-sku">SKU</Label>
              <Input id="prod-sku" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="prod-track-stock" checked={form.track_stock} onCheckedChange={v => setForm(f => ({ ...f, track_stock: v }))} />
              <Label htmlFor="prod-track-stock">Track Stock</Label>
            </div>
            {form.track_stock && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prod-stock">Current Stock</Label>
                  <Input id="prod-stock" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="prod-low-stock">Low Stock Alert</Label>
                  <Input id="prod-low-stock" type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} className="mt-1" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch id="prod-active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label htmlFor="prod-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : editing ? "Update" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation (shows product name + stock) ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
                {deleteTarget?.track_stock && deleteTarget.stock > 0 && (
                  <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5 flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="text-orange-600 dark:text-orange-400">
                      This product has <strong>{deleteTarget.stock}</strong> units in stock.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Batch Restock Dialog ── */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-4 w-4" />Batch Restock
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Enter the quantity to add for each low-stock product.</p>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: <span className={p.stock === 0 ? "text-red-500 font-medium" : "text-orange-500 font-medium"}>{p.stock}</span>
                      {" "}/ threshold: {p.low_stock_threshold}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Add:</span>
                    <Input
                      type="number" min="0" placeholder="0"
                      value={batchAmounts[p.id] || ""}
                      onChange={e => setBatchAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-20 h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
            <Button onClick={saveBatchRestock} disabled={batchSaving}>
              {batchSaving ? "Saving…" : "Restock All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Category Dialog ── */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label htmlFor="cat-name">Category Name</Label>
            <Input id="cat-name" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Beverages" className="mt-1.5" onKeyDown={e => e.key === "Enter" && addCategory()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button onClick={addCategory} disabled={!catName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
