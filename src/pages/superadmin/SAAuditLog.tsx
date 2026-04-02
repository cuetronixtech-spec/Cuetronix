import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_STYLE: Record<string, string> = {
  update_tenant: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  create_tenant: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  delete_tenant: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function SAAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("sa_get_audit_log", { p_limit: 200 });
    if (error) setError(error.message);
    else setEntries((data as AuditEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const actions = [...new Set(entries.map((e) => e.action))];

  const filtered = entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.action.includes(q) ||
        e.admin_email?.toLowerCase().includes(q) ||
        e.target_type?.toLowerCase().includes(q) ||
        e.target_id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${entries.length} entries`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions, admins, targets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {entries.length === 0 ? "No audit entries yet" : "No matching entries"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  const cls = ACTION_STYLE[e.action] ?? "bg-muted text-muted-foreground border-border";
                  return (
                    <TableRow key={e.id} className="border-border hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.created_at), "dd MMM yy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.admin_email ?? e.admin_user_id?.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
                          {e.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        {e.target_type && (
                          <div>
                            <p className="text-xs font-medium text-foreground">{e.target_type}</p>
                            <p className="font-mono text-xs text-muted-foreground">{e.target_id?.slice(0, 8)}…</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {e.metadata && Object.keys(e.metadata).length > 0 && (
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                            {JSON.stringify(e.metadata, null, 0).slice(0, 120)}
                          </pre>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.ip_address ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
