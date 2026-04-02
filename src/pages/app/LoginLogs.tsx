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
import { Search } from "lucide-react";
import { toast } from "sonner";

type Log = {
  id: string;
  email: string | null;
  role: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  city: string | null;
  country: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
};

export default function LoginLogs() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Log | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("login_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = logs.filter(l => {
    const matchSearch =
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.ip_address || "").includes(search);
    const matchFilter = filter === "all" || (filter === "success" && l.success) || (filter === "failed" && !l.success);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <PageHeader
        title="Login Logs"
        description="Track sign-in activity for your club"
        actions={
          <Button variant="outline" onClick={load}>
            <Search className="h-4 w-4 mr-2" />Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search by email or IP…"
          className="max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No login logs found</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(l)}>
                <TableCell className="font-medium">{l.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{l.role || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{l.ip_address || "—"}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{l.device_type || l.browser || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={l.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {l.success ? "Success" : "Failed"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Login Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              {[
                ["Email", selected.email],
                ["Role", selected.role],
                ["IP Address", selected.ip_address],
                ["Device", selected.device_type],
                ["Browser", selected.browser],
                ["City", selected.city],
                ["Country", selected.country],
                ["Status", selected.success ? "✅ Success" : `❌ Failed — ${selected.failure_reason || "Unknown"}`],
                ["Time", new Date(selected.created_at).toLocaleString()],
              ].map(([k, v]) => v && (
                <div key={k as string} className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">{k}:</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
