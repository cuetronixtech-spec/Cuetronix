import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  membership_type: string;
  loyalty_points: number;
  total_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  created_at: string;
};

const blank = () => ({ name: "", phone: "", email: "", membership_type: "regular" });

const memberBadge: Record<string, string> = {
  regular: "bg-gray-100 text-gray-700",
  premium: "bg-blue-100 text-blue-700",
  vip: "bg-purple-100 text-purple-700",
};

export default function Customers() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || c.membership_type === tab;
    return matchSearch && matchTab;
  });

  const openAdd = () => { setEditing(null); setForm(blank()); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", membership_type: c.membership_type });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !tenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      membership_type: form.membership_type,
    };
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editing ? "Customer updated" : "Customer added");
    setOpen(false);
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer deleted");
    load();
  };

  const sym = config?.currency_symbol || "₹";

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer base and loyalty"
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Customer</Button>}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="regular">Regular</TabsTrigger>
          <TabsTrigger value="premium">Premium</TabsTrigger>
          <TabsTrigger value="vip">VIP</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Input
            placeholder="Search by name, phone, or email…"
            className="max-w-sm mb-4"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Loyalty Pts</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={memberBadge[c.membership_type] || memberBadge.regular}>
                        {c.membership_type === "vip" && <Star className="h-3 w-3 mr-1" />}
                        {c.membership_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.visit_count}</TableCell>
                    <TableCell>{sym}{c.total_spend.toFixed(2)}</TableCell>
                    <TableCell>{c.loyalty_points}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(c)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div>
              <Label>Membership</Label>
              <Select value={form.membership_type} onValueChange={v => setForm(f => ({ ...f, membership_type: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
