import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Search, Trash2 } from "lucide-react";
import type { Session } from "@/hooks/useReports";

export function ReportsSessionsTab({
  sessions, loading, sym, onExport, onRefresh,
}: {
  sessions: Session[];
  loading: boolean;
  sym: string;
  onExport: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [del, setDel] = useState<Session | null>(null);

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.stations?.name ?? "").toLowerCase().includes(q) ||
      (s.customers?.name ?? "").toLowerCase().includes(q);
  });

  const handleDelete = async () => {
    if (!del) return;
    const { error } = await supabase.from("sessions").delete().eq("id", del.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Session deleted");
      onRefresh();
    }
    setDel(null);
  };

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Station or customer…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-48" />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No sessions in this period</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-mono">Station ID</TableHead>
                <TableHead className="text-xs">Station</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">End</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs text-right">Rate/hr</TableHead>
                <TableHead className="text-xs">Coupon</TableHead>
                <TableHead className="text-xs text-right">Discount</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const billDisc = (() => {
                  const b = s.bills as { discount_amount?: number } | { discount_amount?: number }[] | null | undefined;
                  if (!b) return null;
                  return Array.isArray(b) ? b[0]?.discount_amount : b.discount_amount;
                })();
                return (
                <TableRow key={s.id}>
                  <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[72px] truncate" title={s.station_id}>{s.station_id}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{s.stations?.name ?? "—"}</div>
                    {s.stations?.type && <div className="text-xs text-muted-foreground capitalize">{s.stations.type}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{s.customers?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(s.started_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {s.ended_at ? new Date(s.ended_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" }) : <span className="text-emerald-400 text-xs">Active</span>}
                  </TableCell>
                  <TableCell className="text-sm">{s.duration_mins != null ? `${s.duration_mins}m` : "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {s.rate_per_hour != null ? `${sym}${Number(s.rate_per_hour).toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{s.coupon_code ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {billDisc != null && Number(billDisc) > 0
                      ? `${sym}${Number(billDisc).toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {s.total_amount != null ? `${sym}${Number(s.total_amount).toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${s.status === "completed" ? "text-emerald-400 border-emerald-400/30" : s.status === "active" ? "text-blue-400 border-blue-400/30" : "text-muted-foreground"}`}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDel(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!del} onOpenChange={o => { if (!o) setDel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>This removes the session record. Bills are not automatically voided.</AlertDialogDescription>
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
