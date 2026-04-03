import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Edit, Trash2, Search, Download, MessageSquare, Tag,
  Star, Users, TrendingUp, Wallet, Phone, Mail,
  UserCheck, ChevronDown, ChevronUp, Filter,
  AlertCircle, Check, Copy, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types — aligned with actual DB schema ───────────────────────────────────

type MembershipType = "regular" | "premium" | "vip";

type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  membership_type: MembershipType;
  loyalty_points: number;
  total_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  notes: string | null;
  referral_code: string | null;
  tags: string[];
  is_portal_active: boolean;
  created_at: string;
};

type CustomerOffer = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: string;
  value: number | null;
  valid_until: string | null;
  is_active: boolean;
};

type OfferAssignment = {
  id: string;
  offer_id: string;
  is_used: boolean;
  used_at: string | null;
  offer?: CustomerOffer;
};

type SortField = "created_at" | "total_spend" | "loyalty_points" | "visit_count";
type SortDir   = "asc" | "desc";
type MemberTab = "all" | "regular" | "premium" | "vip";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function exportCSV(customers: Customer[], sym: string) {
  const header = ["Name", "Phone", "Email", "Membership", "Loyalty Pts", `Total Spend (${sym})`, "Visits", "Join Date"];
  const rows = customers.map(c => [
    c.name,
    c.phone ?? "",
    c.email ?? "",
    c.membership_type,
    c.loyalty_points,
    c.total_spend.toFixed(2),
    c.visit_count,
    fmtDate(c.created_at),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "customers.csv"; a.click();
  URL.revokeObjectURL(url);
}

const MEMBER_BADGE: Record<MembershipType, string> = {
  regular: "bg-muted text-muted-foreground",
  premium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  vip:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

// ─── Insight widgets ──────────────────────────────────────────────────────────

function InsightWidgets({ customers }: { customers: Customer[] }) {
  if (!customers.length) return null;
  const total = customers.length;
  const premiumOrVip = customers.filter(c => c.membership_type !== "regular").length;
  const avgLoyalty = Math.round(customers.reduce((a, c) => a + (c.loyalty_points ?? 0), 0) / total);
  const avgLTV = Math.round(customers.reduce((a, c) => a + (c.total_spend ?? 0), 0) / total);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[
        { icon: Users,      label: "Total Customers",   value: total.toLocaleString("en-IN"),          color: "text-blue-400" },
        { icon: UserCheck,  label: "Premium / VIP",     value: premiumOrVip.toLocaleString("en-IN"),   color: "text-emerald-400" },
        { icon: Star,       label: "Avg Loyalty Points", value: avgLoyalty.toLocaleString("en-IN"),    color: "text-yellow-400" },
        { icon: TrendingUp, label: "Avg Lifetime Value", value: `₹${avgLTV.toLocaleString("en-IN")}`, color: "text-purple-400" },
      ].map(t => {
        const Icon = t.icon;
        return (
          <Card key={t.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${t.color}`} />
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{t.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Customer card ────────────────────────────────────────────────────────────

function CustomerCard({
  c, sym, onEdit, onDelete, onWhatsApp, onOffers,
}: {
  c: Customer; sym: string;
  onEdit: (c: Customer) => void; onDelete: (c: Customer) => void;
  onWhatsApp: (c: Customer) => void; onOffers: (c: Customer) => void;
}) {
  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">{initials(c.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{c.name}</span>
              <Badge variant="outline" className={`h-4 text-[9px] px-1.5 ${MEMBER_BADGE[c.membership_type]}`}>
                {c.membership_type === "vip" && <Star className="h-2.5 w-2.5 mr-0.5" />}
                {c.membership_type}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
              {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs">
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3 w-3" />{(c.loyalty_points ?? 0).toLocaleString("en-IN")} pts
              </span>
              <span className="text-muted-foreground">
                <Wallet className="h-3 w-3 inline mr-1" />
                {sym}{(c.total_spend ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent
              </span>
              <span className="text-muted-foreground">{c.visit_count ?? 0} visits</span>
              {c.last_visit_at && <span className="text-muted-foreground">Last: {fmtDate(c.last_visit_at)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
            {c.phone && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-500" onClick={() => onWhatsApp(c)}><MessageSquare className="h-3.5 w-3.5" /></Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:text-primary" onClick={() => onOffers(c)}><Tag className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── WhatsApp dialog ──────────────────────────────────────────────────────────

function WhatsAppDialog({ customer, open, onClose }: { customer: Customer | null; open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("");
  if (!customer) return null;

  const send = () => {
    const phone = (customer.phone ?? "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    onClose();
  };

  const templates = [
    `Hi ${customer.name}, your loyalty balance is ${customer.loyalty_points ?? 0} points. Book a session today!`,
    `Hi ${customer.name}! We have a special offer waiting for you. Visit us soon.`,
    `Hi ${customer.name}, thanks for being a valued customer. Hope to see you again soon!`,
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" /> WhatsApp — {customer.name}
          </DialogTitle>
          <DialogDescription>Compose a message to open in WhatsApp</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quick templates</Label>
            <div className="space-y-1.5">
              {templates.map((t, i) => (
                <button key={i} onClick={() => setMessage(t)}
                  className="w-full text-left text-xs bg-muted hover:bg-muted/80 rounded p-2.5 text-muted-foreground hover:text-foreground transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="mt-1.5" placeholder="Type your message…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={!message.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <MessageSquare className="h-4 w-4 mr-1.5" /> Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Offers management dialog ─────────────────────────────────────────────────

function OffersDialog({ customer, tenantId, open, onClose }: {
  customer: Customer | null; tenantId: string; open: boolean; onClose: () => void;
}) {
  const [allOffers, setAllOffers] = useState<CustomerOffer[]>([]);
  const [assignments, setAssignments] = useState<OfferAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    const [{ data: offers }, { data: assigns }] = await Promise.all([
      supabase.from("customer_offers").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("customer_offer_assignments").select("*, customer_offers(*)").eq("customer_id", customer.id),
    ]);
    setAllOffers((offers || []) as unknown as CustomerOffer[]);
    const parsed: OfferAssignment[] = (assigns || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      offer_id: a.offer_id as string,
      is_used: !!(a.is_used as boolean),
      used_at: a.used_at as string | null,
      offer: a.customer_offers as CustomerOffer | undefined,
    }));
    setAssignments(parsed);
    setLoading(false);
  }, [customer, tenantId]);

  useEffect(() => { if (open) loadOffers(); }, [open, loadOffers]);

  const assignedIds = new Set(assignments.map(a => a.offer_id));

  const assign = async (offerId: string) => {
    if (!customer) return;
    setAssigning(offerId);
    const { error } = await supabase.from("customer_offer_assignments").insert({
      tenant_id: tenantId, customer_id: customer.id, offer_id: offerId,
    });
    setAssigning(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Offer assigned");
    loadOffers();
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" /> Offers — {customer.name}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-5">
            {assignments.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Assigned Offers</Label>
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{a.offer?.title ?? "Offer"}</p>
                        <p className="text-xs text-muted-foreground">{a.is_used ? `Used ${a.used_at ? fmtDate(a.used_at) : ""}` : "Active"}</p>
                      </div>
                      <Badge variant="outline" className={a.is_used ? "text-muted-foreground" : "text-emerald-400 border-emerald-500/30"}>
                        {a.is_used ? "Used" : "Active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Available to Assign</Label>
              {allOffers.filter(o => !assignedIds.has(o.id)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All offers already assigned</p>
              ) : (
                <div className="space-y-2">
                  {allOffers.filter(o => !assignedIds.has(o.id)).map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{o.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.value != null ? `Value: ${o.value}` : ""}
                          {o.valid_until ? ` · Until ${fmtDate(o.valid_until)}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => assign(o.id)} disabled={assigning === o.id}>
                        {assigning === o.id ? "…" : "Assign"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Form types ───────────────────────────────────────────────────────────────

type CustomerForm = {
  name: string; phone: string; email: string;
  membership_type: MembershipType; notes: string;
  date_of_birth: string; gender: string; address: string;
};

const blankForm = (): CustomerForm => ({
  name: "", phone: "", email: "",
  membership_type: "regular", notes: "",
  date_of_birth: "", gender: "", address: "",
});

function customerToForm(c: Customer): CustomerForm {
  return {
    name: c.name, phone: c.phone ?? "", email: c.email ?? "",
    membership_type: c.membership_type ?? "regular", notes: c.notes ?? "",
    date_of_birth: c.date_of_birth?.split("T")[0] ?? "",
    gender: c.gender ?? "", address: c.address ?? "",
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Customers() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id ?? "";
  const sym = config?.currency_symbol || "₹";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [memberTab, setMemberTab] = useState<MemberTab>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minLoyalty, setMinLoyalty] = useState("");
  const [maxLoyalty, setMaxLoyalty] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(blankForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<Customer | null>(null);
  const [offersTarget, setOffersTarget] = useState<Customer | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customers").select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCustomers((data || []) as unknown as Customer[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q);

      const matchTab = memberTab === "all" || c.membership_type === memberTab;

      const matchLoyalty =
        (!minLoyalty || (c.loyalty_points ?? 0) >= Number(minLoyalty)) &&
        (!maxLoyalty || (c.loyalty_points ?? 0) <= Number(maxLoyalty));

      const joinDate = new Date(c.created_at);
      const matchDate =
        (!dateFrom || joinDate >= new Date(dateFrom)) &&
        (!dateTo || joinDate <= new Date(dateTo + "T23:59:59"));

      return matchSearch && matchTab && matchLoyalty && matchDate;
    })
    .sort((a, b) => {
      const va = (a[sortField] ?? 0) as number | string;
      const vb = (b[sortField] ?? 0) as number | string;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />)
      : null;

  const openAdd = () => { setEditing(null); setForm(blankForm()); setEditOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm(customerToForm(c)); setEditOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.phone.trim()) { toast.error("Phone is required"); return; }
    if (!tenantId) return;
    setSaving(true);

    if (!editing) {
      const { data: dup } = await supabase
        .from("customers").select("id, name").eq("tenant_id", tenantId)
        .eq("phone", form.phone.trim()).maybeSingle();
      if (dup && !confirm(`Phone already exists (${(dup as { name: string }).name}). Continue?`)) {
        setSaving(false); return;
      }
    }

    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      membership_type: form.membership_type,
      notes: form.notes || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      address: form.address || null,
    };
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Customer updated" : "Customer added");
    setEditOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("customers").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer deleted");
    setDeleteTarget(null);
    load();
  };

  const SORT_LABELS: Record<SortField, string> = {
    created_at: "Join date", total_spend: "Spend",
    loyalty_points: "Loyalty", visit_count: "Visits",
  };
  const MEMBER_TABS: { value: MemberTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "regular", label: "Regular" },
    { value: "premium", label: "Premium" },
    { value: "vip", label: "VIP" },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer base and loyalty"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(filtered, sym)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Customer
            </Button>
          </div>
        }
      />

      {!loading && <InsightWidgets customers={customers} />}

      {/* Search + filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, phone, email…" className="pl-9" value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" /> Filters
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <div className="flex gap-1 ml-auto flex-wrap">
            {(Object.keys(SORT_LABELS) as SortField[]).map(f => (
              <Button key={f} variant={sortField === f ? "secondary" : "ghost"} size="sm" className="h-7 text-xs"
                onClick={() => toggleSort(f)}>
                {SORT_LABELS[f]}<SortIcon field={f} />
              </Button>
            ))}
          </div>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Min loyalty points</Label>
                  <Input type="number" value={minLoyalty} onChange={e => setMinLoyalty(e.target.value)} className="mt-1 h-8 text-sm" placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs">Max loyalty points</Label>
                  <Input type="number" value={maxLoyalty} onChange={e => setMaxLoyalty(e.target.value)} className="mt-1 h-8 text-sm" placeholder="Any" />
                </div>
                <div>
                  <Label className="text-xs">Joined from</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Joined to</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs text-muted-foreground"
                onClick={() => { setMinLoyalty(""); setMaxLoyalty(""); setDateFrom(""); setDateTo(""); }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={memberTab} onValueChange={v => setMemberTab(v as MemberTab)}>
        <TabsList className="mb-4">
          {MEMBER_TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={memberTab}>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{search ? `No customers matching "${search}"` : "No customers found"}</p>
              {!search && <Button onClick={openAdd} className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> Add first customer</Button>}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
              <div className="space-y-2">
                {filtered.map(c => (
                  <CustomerCard key={c.id} c={c} sym={sym}
                    onEdit={openEdit} onDelete={setDeleteTarget}
                    onWhatsApp={setWhatsAppTarget} onOffers={setOffersTarget} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Phone <span className="text-destructive">*</span></Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1.5" placeholder="+91 …" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Membership</Label>
                <Select value={form.membership_type} onValueChange={v => setForm(f => ({ ...f, membership_type: v as MembershipType }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender || "_"} onValueChange={v => setForm(f => ({ ...f, gender: v === "_" ? "" : v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Delete Customer</DialogTitle>
            <DialogDescription>Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WhatsAppDialog customer={whatsAppTarget} open={!!whatsAppTarget} onClose={() => setWhatsAppTarget(null)} />
      <OffersDialog customer={offersTarget} tenantId={tenantId} open={!!offersTarget} onClose={() => setOffersTarget(null)} />
    </div>
  );
}
