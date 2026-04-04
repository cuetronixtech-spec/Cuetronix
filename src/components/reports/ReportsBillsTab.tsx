import { useState, useMemo, Fragment } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Search, ChevronDown, MoreHorizontal, FileText, Pencil, Trash2 } from "lucide-react";
import Receipt, { type ReceiptBill } from "@/components/Receipt";
import { EditPaymentMethodDialog } from "@/components/reports/EditPaymentMethodDialog";
import { deleteBillAndRevert } from "@/lib/reports/deleteBill";
import type { Bill } from "@/hooks/useReports";
import type { TenantConfig } from "@/context/TenantContext";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  card: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  online: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  upi: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  credit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  complimentary: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  split: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function PayBadge({ method, razorpay }: { method: string; razorpay?: boolean }) {
  const cls = PAYMENT_COLORS[method.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <Badge variant="outline" className={`text-xs capitalize ${cls}`}>
        {method.replace(/_/g, " ")}
      </Badge>
      {razorpay && (
        <Badge variant="outline" className="text-[10px] bg-indigo-500/15 text-indigo-300 border-indigo-500/30">Razorpay</Badge>
      )}
    </div>
  );
}

type BillSort = "date" | "total" | "subtotal" | "discount" | "customer";

function billToReceipt(b: Bill): ReceiptBill {
  return {
    id: b.id,
    bill_number: b.bill_number,
    created_at: b.created_at,
    total_amount: Number(b.total_amount),
    subtotal: Number(b.subtotal),
    discount_amount: Number(b.discount_amount),
    loyalty_points_used: b.loyalty_points_used,
    loyalty_points_earned: b.loyalty_points_earned,
    payment_method: b.payment_method,
    status: b.status,
    comp_note: b.comp_note,
    items: (b.bill_items ?? []).map(i => ({
      name: i.name,
      qty: i.qty,
      unit_price: i.unit_price,
      total_price: i.total_price,
    })),
    customer: b.customers ? { name: b.customers.name, phone: b.customers.phone } : null,
  };
}

export function ReportsBillsTab({
  bills, loading, sym, config, onExport, onRefresh,
}: {
  bills: Bill[];
  loading: boolean;
  sym: string;
  config: TenantConfig | null;
  onExport: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [sort, setSort] = useState<BillSort>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);
  const [editPayBill, setEditPayBill] = useState<Bill | null>(null);
  const [deleteBill, setDeleteBill] = useState<Bill | null>(null);

  const payMethods = useMemo(() => {
    const s = new Set(bills.map(b => b.payment_method));
    return Array.from(s);
  }, [bills]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bills
      .filter(b => {
        const matchSearch = !q ||
          (b.bill_number ?? "").toLowerCase().includes(q) ||
          (b.customers?.name ?? "").toLowerCase().includes(q) ||
          (b.customers?.phone ?? "").includes(q) ||
          (b.customers?.email ?? "").toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q);
        let matchPay = payFilter === "all" || b.payment_method === payFilter;
        if (payFilter === "razorpay") {
          matchPay = !!b.gateway_payment_id;
        }
        return matchSearch && matchPay;
      })
      .sort((a, b) => {
        let va: string | number, vb: string | number;
        if (sort === "date")     { va = a.created_at; vb = b.created_at; }
        else if (sort === "total")    { va = Number(a.total_amount);    vb = Number(b.total_amount); }
        else if (sort === "subtotal") { va = Number(a.subtotal);        vb = Number(b.subtotal); }
        else if (sort === "discount") { va = Number(a.discount_amount); vb = Number(b.discount_amount); }
        else { va = a.customers?.name ?? ""; vb = b.customers?.name ?? ""; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [bills, search, payFilter, sort, sortDir]);

  const toggleSort = (s: BillSort) => {
    if (sort === s) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(s); setSortDir(s === "date" ? "desc" : "desc"); }
  };

  const SortIndicator = ({ s }: { s: BillSort }) =>
    sort === s ? (
      <span className="ml-0.5 text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : null;

  const handleDelete = async () => {
    if (!deleteBill) return;
    const { error } = await deleteBillAndRevert({
      id: deleteBill.id,
      customer_id: deleteBill.customer_id,
      loyalty_points_earned: deleteBill.loyalty_points_earned,
      loyalty_points_used: deleteBill.loyalty_points_used,
      total_amount: Number(deleteBill.total_amount),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Bill deleted");
      onRefresh();
    }
    setDeleteBill(null);
  };

  const colSpan = 11;

  if (loading) return <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search bill, customer, phone, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-64" />
        </div>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="razorpay">Razorpay</SelectItem>
            {payMethods.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} bill{filtered.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No bills found for this period</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs cursor-pointer whitespace-nowrap" onClick={() => toggleSort("date")}>Date/Time<SortIndicator s="date" /></TableHead>
                <TableHead className="text-xs cursor-pointer min-w-[120px]" onClick={() => toggleSort("customer")}>Customer<SortIndicator s="customer" /></TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs cursor-pointer text-right" onClick={() => toggleSort("subtotal")}>Subtotal<SortIndicator s="subtotal" /></TableHead>
                <TableHead className="text-xs cursor-pointer text-right" onClick={() => toggleSort("discount")}>Discount<SortIndicator s="discount" /></TableHead>
                <TableHead className="text-xs cursor-pointer text-right" onClick={() => toggleSort("total")}>Total<SortIndicator s="total" /></TableHead>
                <TableHead className="text-xs whitespace-nowrap">Loyalty ±</TableHead>
                <TableHead className="text-xs min-w-[80px]">Comp</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-8" />
                <TableHead className="text-xs w-10 text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(bill => (
                <Fragment key={bill.id}>
                  <TableRow className="hover:bg-muted/20">
                    <TableCell
                      className="text-sm cursor-pointer align-top"
                      onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}
                    >
                      <div className="font-mono text-xs text-muted-foreground">{bill.bill_number ?? bill.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(bill.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-sm cursor-pointer align-top"
                      onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}
                    >
                      <div className="font-medium">{bill.customers?.name ?? "—"}</div>
                      {bill.customers?.phone && <div className="text-xs text-muted-foreground">{bill.customers.phone}</div>}
                      {bill.customers?.email && <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{bill.customers.email}</div>}
                    </TableCell>
                    <TableCell className="align-top" onClick={e => e.stopPropagation()}>
                      <PayBadge method={bill.payment_method} razorpay={!!bill.gateway_payment_id} />
                    </TableCell>
                    <TableCell className="text-right text-sm align-top cursor-pointer" onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      {sym}{Number(bill.subtotal).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-sm text-orange-400 align-top cursor-pointer" onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      {Number(bill.discount_amount) > 0 ? `−${sym}${Number(bill.discount_amount).toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold align-top cursor-pointer" onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      {sym}{Number(bill.total_amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground align-top cursor-pointer whitespace-nowrap" onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      {bill.loyalty_points_earned || bill.loyalty_points_used
                        ? <span>+{bill.loyalty_points_earned} / −{bill.loyalty_points_used}</span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs align-top max-w-[100px] truncate cursor-pointer" title={bill.comp_note ?? ""} onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      {bill.comp_note || "—"}
                    </TableCell>
                    <TableCell className="align-top cursor-pointer" onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      <Badge variant="outline" className={`text-xs whitespace-nowrap ${bill.status === "voided" ? "text-red-400 border-red-400/30" : bill.status === "complimentary" ? "text-pink-400 border-pink-400/30" : "text-emerald-400 border-emerald-400/30"}`}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top cursor-pointer" onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded === bill.id ? "rotate-180" : ""}`} />
                    </TableCell>
                    <TableCell className="text-right align-top" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setReceiptBill(bill)}><FileText className="h-3.5 w-3.5 mr-2" />View receipt</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditPayBill(bill)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit payment</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400" onClick={() => setDeleteBill(bill)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete bill</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {expanded === bill.id && (
                    <TableRow className="bg-muted/10">
                      <TableCell colSpan={colSpan} className="p-0">
                        <div className="px-4 py-3 border-t border-border/30">
                          {bill.bill_items && bill.bill_items.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b border-border/30">
                                  <th className="text-left py-1 font-medium">Item</th>
                                  <th className="text-left py-1 font-medium">Type</th>
                                  <th className="text-center py-1 font-medium">Qty</th>
                                  <th className="text-right py-1 font-medium">Unit Price</th>
                                  <th className="text-right py-1 font-medium">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bill.bill_items.map(item => (
                                  <tr key={item.id} className="border-b border-border/20 last:border-0">
                                    <td className="py-1 font-medium">{item.name}</td>
                                    <td className="py-1 text-muted-foreground capitalize">{item.item_type}</td>
                                    <td className="py-1 text-center">{item.qty}</td>
                                    <td className="py-1 text-right">{sym}{Number(item.unit_price).toLocaleString("en-IN")}</td>
                                    <td className="py-1 text-right font-semibold">{sym}{Number(item.total_price).toLocaleString("en-IN")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No line items recorded</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!receiptBill} onOpenChange={o => { if (!o) setReceiptBill(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {receiptBill && (
            <Receipt
              bill={billToReceipt(receiptBill)}
              brandName={config?.brand_name ?? null}
              businessAddress={config?.business_address ?? null}
              businessPhone={config?.business_phone ?? null}
              sym={sym}
              onClose={() => setReceiptBill(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <EditPaymentMethodDialog
        bill={editPayBill}
        open={!!editPayBill}
        onClose={() => setEditPayBill(null)}
        onSaved={onRefresh}
        sym={sym}
      />

      <AlertDialog open={!!deleteBill} onOpenChange={o => { if (!o) setDeleteBill(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Inventory and customer loyalty will be reverted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
