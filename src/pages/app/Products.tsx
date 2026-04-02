import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; };
type Product = {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  track_stock: boolean;
  category_id: string | null;
  sku: string | null;
  categories?: { name: string } | null;
};

const blankProduct = () => ({
  name: "", category_id: "__none__", price: "", cost_price: "", sku: "", stock: "0", low_stock_threshold: "5", track_stock: true, is_active: true,
});

export default function Products() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankProduct());
  const [catName, setCatName] = useState("");

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

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || (tab === "low_stock" && p.track_stock && p.stock <= p.low_stock_threshold) || p.category_id === tab;
    return matchSearch && matchTab;
  });

  const openAdd = () => { setEditing(null); setForm(blankProduct()); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, category_id: p.category_id || "__none__", price: String(p.price),
      cost_price: p.cost_price != null ? String(p.cost_price) : "", sku: p.sku || "",
      stock: String(p.stock), low_stock_threshold: String(p.low_stock_threshold),
      track_stock: p.track_stock, is_active: p.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !tenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      category_id: (form.category_id && form.category_id !== "__none__") ? form.category_id : null,
      price: parseFloat(form.price) || 0,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      sku: form.sku.trim() || null,
      stock: parseInt(form.stock) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      track_stock: form.track_stock,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editing ? "Product updated" : "Product added");
    setOpen(false);
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    load();
  };

  const addCategory = async () => {
    if (!catName.trim() || !tenantId) return;
    const { error } = await supabase.from("categories").insert({ tenant_id: tenantId, name: catName.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Category added");
    setCatName("");
    setCatOpen(false);
    load();
  };

  const sym = config?.currency_symbol || "₹";

  return (
    <div>
      <PageHeader
        title="Products & Inventory"
        description="Manage your menu and stock"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCatOpen(true)}>Add Category</Button>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map(c => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}
          <TabsTrigger value="low_stock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Input placeholder="Search products…" className="max-w-sm mb-4" value={search} onChange={e => setSearch(e.target.value)} />

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}{p.sku && <span className="text-xs text-muted-foreground ml-2">#{p.sku}</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{p.categories?.name || "—"}</TableCell>
                    <TableCell>{sym}{p.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {p.track_stock ? (
                        <span className={p.stock <= p.low_stock_threshold ? "text-orange-500 font-medium flex items-center gap-1" : ""}>
                          {p.stock <= p.low_stock_threshold && <AlertTriangle className="h-3 w-3" />}
                          {p.stock}
                        </span>
                      ) : "∞"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(p)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, category_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Selling Price ({sym})</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div><Label>Cost Price ({sym})</Label><Input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} /></div>
            </div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Optional" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.track_stock} onCheckedChange={v => setForm(f => ({ ...f, track_stock: v }))} />
              <Label>Track Stock</Label>
            </div>
            {form.track_stock && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Current Stock</Label><Input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
                <div><Label>Low Stock Alert</Label><Input type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} /></div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Category Name</Label>
            <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Beverages" className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button onClick={addCategory}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
