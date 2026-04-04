import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import type { CustomerReportRow } from "@/hooks/useReports";

function fmtDuration(mins: number) {
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function ReportsCustomersTab({
  rows, loading, sym, onExport,
}: {
  rows: CustomerReportRow[];
  loading: boolean;
  sym: string;
  onExport: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.phone ?? "").includes(q) ||
      (r.email ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Customers who joined in this date range. Spend and play time reflect activity in the same range.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-64" />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</span>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export Excel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No customers joined in this period</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Membership</TableHead>
                <TableHead className="text-xs text-right">Spend (range)</TableHead>
                <TableHead className="text-xs text-right">Play time</TableHead>
                <TableHead className="text-xs text-right">Loyalty</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{r.email ?? "—"}</TableCell>
                  <TableCell className="text-xs capitalize">{r.membership_type}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-medium">{sym}{r.total_spent_range.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right text-sm">{fmtDuration(r.play_time_mins)}</TableCell>
                  <TableCell className="text-right text-sm">{r.loyalty_points}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
