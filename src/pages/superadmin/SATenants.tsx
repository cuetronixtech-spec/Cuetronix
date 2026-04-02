import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Search, RefreshCw } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  is_active: boolean;
  owner_email: string | null;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    trialing: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    active: "bg-green-500/10 text-green-400 border-green-500/30",
    canceled: "bg-red-500/10 text-red-400 border-red-500/30",
    past_due: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

const SATenants = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filtered, setFiltered] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, name, slug, subscription_status, trial_ends_at, created_at, is_active, owner_email:tenant_config(business_email)")
      .neq("id", "00000000-0000-0000-0000-000000000001")
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      owner_email: (t.owner_email as { business_email?: string }[] | null)?.[0]?.business_email ?? null,
    })) as Tenant[];
    setTenants(rows);
    setFiltered(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let rows = tenants;
    if (statusFilter !== "all") rows = rows.filter(t => t.subscription_status === statusFilter);
    if (search) rows = rows.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search));
    setFiltered(rows);
  }, [search, statusFilter, tenants]);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("tenants").update({ is_active: !current }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Tenants"
        description={`${tenants.length} club${tenants.length !== 1 ? "s" : ""} registered`}
        action={
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name or slug…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Club</TableHead>
              <TableHead>Owner Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial Ends</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tenants found</TableCell></TableRow>
            ) : filtered.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/20">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">/{t.slug}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.owner_email ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusBadge(t.subscription_status)}`}>
                    {t.subscription_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActive(t.id, t.is_active)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${t.is_active ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}
                  >
                    {t.is_active ? "Yes" : "No"}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/super-admin/tenants/${t.id}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SATenants;
