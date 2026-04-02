import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  actor_username: string;
  created_at: string;
  level: string;
  path: string;
}

const SAAuditLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filtered, setFiltered] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    // Fetch recent auth events from auth.audit_log_entries via a service-role query
    // Using tenant_members as a proxy for recent activity instead
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tenants")
        .select("id, name, slug, created_at, subscription_status")
        .neq("id", "00000000-0000-0000-0000-000000000001")
        .order("created_at", { ascending: false })
        .limit(50);

      const mapped: LogEntry[] = (data ?? []).map(t => ({
        id: t.id,
        action: "tenant_created",
        actor_username: t.name,
        created_at: t.created_at,
        level: "info",
        path: `/${t.slug}`,
      }));
      setLogs(mapped);
      setFiltered(mapped);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    let rows = logs;
    if (levelFilter !== "all") rows = rows.filter(l => l.level === levelFilter);
    if (search) rows = rows.filter(l =>
      l.action.includes(search) || l.actor_username.toLowerCase().includes(search.toLowerCase()) || l.path.includes(search)
    );
    setFiltered(rows);
  }, [search, levelFilter, logs]);

  const levelColor: Record<string, string> = {
    info: "text-blue-400 border-blue-500/30",
    warning: "text-yellow-400 border-yellow-500/30",
    error: "text-red-400 border-red-500/30",
  };

  return (
    <div>
      <PageHeader title="Audit Log" description="Platform event history" />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search events…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor / Club</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No events found</TableCell></TableRow>
            ) : filtered.map(log => (
              <TableRow key={log.id} className="hover:bg-muted/20">
                <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-sm font-mono">{log.action}</TableCell>
                <TableCell className="text-sm">{log.actor_username}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{log.path}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${levelColor[log.level] ?? ""}`}>{log.level}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Full audit log from auth events will be available via a dedicated Edge Function in the next release.
      </p>
    </div>
  );
};

export default SAAuditLog;
