import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Building2, Search, ExternalLink, RefreshCw, Sparkles, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_interval: string | null;
  is_active: boolean;
  is_sandbox: boolean;
  is_approved: boolean;
  trial_ends_at: string | null;
  created_at: string;
  owner_user_id: string | null;
  business_email: string | null;
  plan_name: string | null;
  member_count: number;
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  trial:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
  trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  past_due: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  canceled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  inactive: "bg-red-500/10 text-red-500 border-red-500/20",
};

function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  const key = !isActive ? "inactive" : status;
  const cls = STATUS_STYLE[key] ?? "bg-muted text-muted-foreground border-border";
  const label = {
    active: "Active", trial: "Trial", trialing: "Trial",
    past_due: "Past Due", canceled: "Canceled", inactive: "Inactive",
  }[key] ?? key;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function SATenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState<"all" | "pending">("pending");
  const [toggling, setToggling] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("sa_list_tenants");
    if (error) setError(error.message);
    else setTenants((data as Tenant[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = tenants;

    // Tab filter
    if (tab === "pending") {
      list = list.filter((t) => !t.is_approved);
    } else {
      // Status filter only applies to "all" tab
      if (statusFilter !== "all") {
        list = list.filter((t) =>
          statusFilter === "inactive"
            ? !t.is_active
            : t.subscription_status === statusFilter && t.is_active
        );
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.business_email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tenants, search, statusFilter, tab]);

  const pendingCount = useMemo(() => tenants.filter((t) => !t.is_approved).length, [tenants]);

  const toggleActive = async (t: Tenant) => {
    setToggling(t.id);
    const { error } = await supabase.rpc("sa_update_tenant", {
      p_tenant_id: t.id,
      p_is_active: !t.is_active,
    });
    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success(`Tenant ${!t.is_active ? "activated" : "deactivated"}`);
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !t.is_active } : x));
    }
    setToggling(null);
  };

  const approveAndSeed = async (t: Tenant) => {
    setSeeding(t.id);
    const { error } = await supabase.rpc("sa_approve_and_seed_tenant", { p_tenant_id: t.id });
    if (error) {
      toast.error("Failed to approve: " + error.message);
    } else {
      toast.success(`${t.name} approved and sandbox seeded!`);
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, is_approved: true } : x));
      // If in pending tab, switch to all after approving last one
      if (tenants.filter((x) => !x.is_approved && x.id !== t.id).length === 0) {
        setTab("all");
      }
    }
    setSeeding(null);
  };

  const cols = tab === "pending" ? 8 : 9;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${tenants.length} clubs total${pendingCount > 0 ? ` · ${pendingCount} pending approval` : ""}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "pending")}>
        <TabsList>
          <TabsTrigger value="all">All Tenants</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-amber-500 text-[10px] font-bold text-white px-1">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Filters (all tab only) ── */}
      {tab === "all" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, slug or email…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Pending explanation ── */}
      {tab === "pending" && pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-500/90">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            These clubs just signed up. Click <strong>Approve & Seed</strong> to activate their account and
            populate it with demo data (stations, products, customers, sessions, expenses) so they can explore
            the platform immediately.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>Club</TableHead>
                <TableHead>Email</TableHead>
                {tab === "all" && <TableHead>Status</TableHead>}
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead>Trial ends</TableHead>
                <TableHead>Joined</TableHead>
                {tab === "all" && <TableHead>Active</TableHead>}
                <TableHead>{tab === "pending" ? "Action" : ""}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {[...Array(cols)].map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={cols} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {tab === "pending" ? "No pending approvals — you're all caught up!" : "No tenants found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">{t.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.business_email || "—"}</TableCell>
                    {tab === "all" && (
                      <TableCell><StatusBadge status={t.subscription_status} isActive={t.is_active} /></TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{t.plan_name || "—"}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{t.member_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.trial_ends_at ? format(new Date(t.trial_ends_at), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </TableCell>
                    {tab === "all" && (
                      <TableCell>
                        <Switch
                          checked={t.is_active}
                          disabled={toggling === t.id}
                          onCheckedChange={() => toggleActive(t)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {tab === "pending" ? (
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          disabled={seeding === t.id}
                          onClick={() => approveAndSeed(t)}
                        >
                          {seeding === t.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {seeding === t.id ? "Seeding…" : "Approve & Seed"}
                        </Button>
                      ) : (
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                          <Link to={`/super-admin/tenants/${t.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
