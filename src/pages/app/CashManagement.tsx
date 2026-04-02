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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

type VaultRow = { balance: number; currency: string };
type TxRow = {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
};

export default function CashManagement() {
  const { config } = useTenant();
  const { user } = useAuth();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [vault, setVault] = useState<VaultRow | null>(null);
  const [txns, setTxns] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const todayInflow = txns.filter(t => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString() && (t.type === "deposit" || t.type === "bill_receipt");
  }).reduce((s, t) => s + t.amount, 0);

  const todayOutflow = txns.filter(t => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString() && (t.type === "withdrawal" || t.type === "expense");
  }).reduce((s, t) => s + t.amount, 0);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [vaultRes, txRes] = await Promise.all([
      supabase.from("cash_vault").select("balance, currency").eq("tenant_id", tenantId).single(),
      supabase.from("cash_vault_transactions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(200),
    ]);
    if (vaultRes.data) setVault(vaultRes.data);
    setTxns(txRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordTx = async () => {
    if (!amount || !tenantId || !vault) return;
    const amtNum = parseFloat(amount);
    if (amtNum <= 0) { toast.error("Amount must be positive"); return; }
    if (txType === "withdrawal" && amtNum > vault.balance) { toast.error("Insufficient vault balance"); return; }

    setSaving(true);
    const newBalance = txType === "deposit" ? vault.balance + amtNum : vault.balance - amtNum;

    const { error: txErr } = await supabase.from("cash_vault_transactions").insert({
      tenant_id: tenantId,
      type: txType,
      amount: amtNum,
      balance_after: newBalance,
      note: note.trim() || null,
      created_by: user?.id,
    });
    if (txErr) { toast.error(txErr.message); setSaving(false); return; }

    const { error: vaultErr } = await supabase.from("cash_vault").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
    if (vaultErr) { toast.error(vaultErr.message); setSaving(false); return; }

    toast.success(`${txType === "deposit" ? "Deposit" : "Withdrawal"} recorded`);
    setOpen(false);
    setSaving(false);
    setAmount("");
    setNote("");
    load();
  };

  const txTypeColor: Record<string, string> = {
    deposit: "bg-green-100 text-green-700",
    withdrawal: "bg-red-100 text-red-700",
    bill_receipt: "bg-blue-100 text-blue-700",
    expense: "bg-orange-100 text-orange-700",
  };

  return (
    <div>
      <PageHeader
        title="Cash Management"
        description="Track vault balance and cash flow"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setTxType("withdrawal"); setOpen(true); }}>
              <ArrowUpCircle className="h-4 w-4 mr-2 text-red-500" />Withdraw
            </Button>
            <Button onClick={() => { setTxType("deposit"); setOpen(true); }}>
              <ArrowDownCircle className="h-4 w-4 mr-2" />Deposit
            </Button>
          </div>
        }
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm text-muted-foreground">Vault Balance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-28" /> : <p className="text-3xl font-bold text-primary">{sym}{(vault?.balance || 0).toLocaleString()}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Inflow</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-500">+{sym}{todayInflow.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Outflow</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">-{sym}{todayOutflow.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Transaction Log</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
                ) : txns.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground text-sm">{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge className={txTypeColor[t.type] || "bg-gray-100 text-gray-700"} variant="secondary">{t.type.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{t.note || "—"}</TableCell>
                    <TableCell className={t.type === "deposit" || t.type === "bill_receipt" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {t.type === "deposit" || t.type === "bill_receipt" ? "+" : "-"}{sym}{t.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{sym}{t.balance_after.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{txType === "deposit" ? "Record Deposit" : "Record Withdrawal"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Amount ({sym}) *</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
            <div>
              <Label>Note / Reason</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} className="mt-1.5" placeholder="Optional" />
            </div>
            {vault && <p className="text-sm text-muted-foreground">Current balance: {sym}{vault.balance.toLocaleString()}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={recordTx} disabled={saving}>{saving ? "Saving…" : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
