import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, TrendingUp, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

type Partner = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  equity_percent: number;
  total_invested: number;
  is_active: boolean;
  joined_date: string | null;
};

type Transaction = {
  id: string;
  partner_id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  partners?: { name: string } | null;
};

const blankPartner = () => ({ name: "", phone: "", email: "", country: "", equity_percent: "", total_invested: "0", joined_date: "" });
const blankTx = () => ({ partner_id: "", type: "investment", amount: "", date: new Date().toISOString().split("T")[0], note: "" });

export default function Investors() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [partners, setPartners] = useState<Partner[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [pForm, setPForm] = useState(blankPartner());
  const [tForm, setTForm] = useState(blankTx());

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [pRes, tRes] = await Promise.all([
      supabase.from("investment_partners").select("*").eq("tenant_id", tenantId).order("joined_date", { ascending: false }),
      supabase.from("investment_transactions").select("*, investment_partners(name)").eq("tenant_id", tenantId).order("date", { ascending: false }).limit(100),
    ]);
    setPartners(pRes.data || []);
    setTxns((tRes.data || []) as Transaction[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalInvested = partners.reduce((s, p) => s + Number(p.total_invested), 0);
  const totalReturns = txns.filter(t => t.type === "return" || t.type === "dividend").reduce((s, t) => s + Number(t.amount), 0);

  const openAddPartner = () => { setEditingPartner(null); setPForm(blankPartner()); setPartnerOpen(true); };
  const openEditPartner = (p: Partner) => {
    setEditingPartner(p);
    setPForm({ name: p.name, phone: p.phone || "", email: p.email || "", country: p.country || "", equity_percent: String(p.equity_percent), total_invested: String(p.total_invested), joined_date: p.joined_date || "" });
    setPartnerOpen(true);
  };

  const savePartner = async () => {
    if (!pForm.name.trim() || !tenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: pForm.name.trim(),
      phone: pForm.phone.trim() || null,
      email: pForm.email.trim() || null,
      country: pForm.country.trim() || null,
      equity_percent: parseFloat(pForm.equity_percent) || 0,
      total_invested: parseFloat(pForm.total_invested) || 0,
      joined_date: pForm.joined_date || null,
    };
    const { error } = editingPartner
      ? await supabase.from("investment_partners").update(payload).eq("id", editingPartner.id)
      : await supabase.from("investment_partners").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editingPartner ? "Partner updated" : "Partner added");
    setPartnerOpen(false);
    setSaving(false);
    load();
  };

  const saveTx = async () => {
    if (!tForm.partner_id || !tForm.amount || !tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("investment_transactions").insert({
      tenant_id: tenantId,
      partner_id: tForm.partner_id,
      type: tForm.type,
      amount: parseFloat(tForm.amount),
      date: tForm.date,
      note: tForm.note.trim() || null,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Transaction recorded");
    setTxOpen(false);
    setSaving(false);
    setTForm(blankTx());
    load();
  };

  return (
    <div>
      <PageHeader
        title="Investors"
        description="Investment partners and financial overview"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setTForm(blankTx()); setTxOpen(true); }}>Record Transaction</Button>
            <Button onClick={openAddPartner}><Plus className="h-4 w-4 mr-2" />Add Partner</Button>
          </div>
        }
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{partners.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Total Invested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{sym}{totalInvested.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Returns Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-500">{sym}{totalReturns.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Equity %</TableHead>
                  <TableHead>Total Invested</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No investment partners yet</TableCell></TableRow>
                ) : partners.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell>{p.equity_percent}%</TableCell>
                    <TableCell className="font-medium">{sym}{Number(p.total_invested).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.joined_date ? new Date(p.joined_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEditPartner(p)}><Edit className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions recorded</TableCell></TableRow>
                ) : txns.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{(t as any).investment_partners?.name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{t.type}</Badge></TableCell>
                    <TableCell className="font-medium">{sym}{Number(t.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{t.note || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Partner Dialog */}
      <Dialog open={partnerOpen} onOpenChange={setPartnerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingPartner ? "Edit Partner" : "Add Partner"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name *</Label><Input value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={pForm.email} onChange={e => setPForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>Phone</Label><Input value={pForm.phone} onChange={e => setPForm(f => ({ ...f, phone: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Equity %</Label><Input type="number" min="0" max="100" step="0.1" value={pForm.equity_percent} onChange={e => setPForm(f => ({ ...f, equity_percent: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>Total Invested ({sym})</Label><Input type="number" min="0" value={pForm.total_invested} onChange={e => setPForm(f => ({ ...f, total_invested: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div><Label>Joined Date</Label><Input type="date" value={pForm.joined_date} onChange={e => setPForm(f => ({ ...f, joined_date: e.target.value }))} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerOpen(false)}>Cancel</Button>
            <Button onClick={savePartner} disabled={saving}>{saving ? "Saving…" : editingPartner ? "Update" : "Add Partner"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Partner *</Label>
              <Select value={tForm.partner_id || undefined} onValueChange={v => setTForm(f => ({ ...f, partner_id: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select partner" /></SelectTrigger>
                <SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={tForm.type} onValueChange={v => setTForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["investment", "return", "withdrawal", "dividend"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount ({sym})</Label><Input type="number" min="0" step="0.01" value={tForm.amount} onChange={e => setTForm(f => ({ ...f, amount: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>Date</Label><Input type="date" value={tForm.date} onChange={e => setTForm(f => ({ ...f, date: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div><Label>Note</Label><Input value={tForm.note} onChange={e => setTForm(f => ({ ...f, note: e.target.value }))} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxOpen(false)}>Cancel</Button>
            <Button onClick={saveTx} disabled={saving}>{saving ? "Saving…" : "Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
