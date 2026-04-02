import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_mode: string;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
};

const CATEGORIES = ["rent", "utilities", "salary", "maintenance", "marketing", "supplies", "other"];
const PAYMENT_MODES = ["cash", "bank", "card", "online"];

const blank = () => ({
  category: "other", description: "", amount: "", date: new Date().toISOString().split("T")[0],
  payment_mode: "cash", vendor_name: "", notes: "",
});

export default function Expenses() {
  const { config } = useTenant();
  const { user } = useAuth();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  const [thisMonth, setThisMonth] = useState(0);
  const [lastMonth, setLastMonth] = useState(0);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const rows = data || [];
    setExpenses(rows);

    const now = new Date();
    const thisM = rows.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + Number(e.amount), 0);

    const lastM = (() => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return rows.filter(e => {
        const ed = new Date(e.date);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).reduce((s, e) => s + Number(e.amount), 0);
    })();

    setThisMonth(thisM);
    setLastMonth(lastM);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.description.trim() || !form.amount || !tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      tenant_id: tenantId,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      date: form.date,
      payment_mode: form.payment_mode,
      vendor_name: form.vendor_name.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Expense recorded");
    setOpen(false);
    setSaving(false);
    setForm(blank());
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense deleted");
    load();
  };

  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track and manage club expenses"
        actions={<Button onClick={() => { setForm(blank()); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Expense</Button>}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Month</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{sym}{thisMonth.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last Month</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{sym}{lastMonth.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">All Time Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{sym}{totalAll.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No expenses recorded yet</TableCell></TableRow>
            ) : expenses.map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground text-sm">{new Date(e.date).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{e.category}</Badge></TableCell>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell className="text-muted-foreground">{e.vendor_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{e.payment_mode}</TableCell>
                <TableCell className="font-semibold">{sym}{Number(e.amount).toLocaleString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(e.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div><Label>Description *</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount ({sym}) *</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={form.payment_mode} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} className="mt-1.5" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Add Expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
