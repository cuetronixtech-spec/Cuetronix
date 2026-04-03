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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Edit, Trash2, Search, Download, MessageSquare, Tag,
  Star, Users, TrendingUp, Wallet, Phone, Mail, User,
  UserCheck, ChevronDown, ChevronUp, Filter, Merge,
  AlertCircle, Check, Copy, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  custom_id: string | null;
  is_member: boolean | null;
  membership_plan: string | null;
  membership_start_date: string | null;
  membership_expiry_date: string | null;
  membership_duration: string | null;
  membership_hours_left: number | null;
  notes: string | null;
  loyalty_points: number;
  total_spent: number;
  total_play_time: number | null;
  visit_count: number | null;
  last_visit_at: string | null;
  created_at: string;
};

type CustomerOffer = {
  id: string;
  title: string;
  description: string | null;
  offer_type: string;
  value: number;
  expiry_date: string | null;
};

type OfferAssignment = {
  id: string;
  offer_id: string;
  status: string;
  promo_code: string | null;
  assigned_at: string | null;
  offer?: CustomerOffer;
};

type SortField = "created_at" | "total_spent" | "loyalty_points" | "total_play_time";
type SortDir   = "asc" | "desc";
type MemberTab = "all" | "member" | "non-member" | "active" | "expired";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPlayTime(secs: number | null) {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function exportCSV(customers: Customer[], sym: string) {
  const header = ["Name", "Phone", "Email", "Custom ID", "Member", "Loyalty Pts", `Total Spend (${sym})`, "Total Play Time", "Join Date"];
  const rows = customers.map(c => [
    c.name,
    c.phone ?? "",
    c.email ?? "",
    c.custom_id ?? "",
    c.is_member ? "Yes" : "No",
    c.loyalty_points,
    c.total_spent.toFixed(2),
    fmtPlayTime(c.total_play_time),
    fmtDate(c.created_at),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "customers.csv"; a.click();
  URL.revokeObjectURL(url);
}

function getMemberStatus(c: Customer): "active" | "expired" | "none" {
  if (!c.is_member) return "none";
  if (c.membership_expiry_date && new Date(c.membership_expiry_date) < new Date()) return "expired";
  return "active";
}

// ─── Insight widgets ──────────────────────────────────────────────────────────

function InsightWidgets({ customers }: { customers: Customer[] }) {
  if (!customers.length) return null;
  const total = customers.length;
  const activeMembers = customers.filter(c => getMemberStatus(c) === "active").length;
  const avgLoyalty = Math.round(customers.reduce((a, c) => a + c.loyalty_points, 0) / total);
  const avgLTV = Math.round(customers.reduce((a, c) => a + c.total_spent, 0) / total);

  const tiles = [
    { icon: Users,      label: "Total Customers",   value: total.toLocaleString("en-IN"),      color: "text-blue-400" },
    { icon: UserCheck,  label: "Active Members",     value: activeMembers.toLocaleString("en-IN"), color: "text-emerald-400" },
    { icon: Star,       label: "Avg Loyalty Points", value: avgLoyalty.toLocaleString("en-IN"), color: "text-yellow-400" },
    { icon: TrendingUp, label: "Avg Lifetime Value", value: `₹${avgLTV.toLocaleString("en-IN")}`, color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {tiles.map(t => {
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
  c,
  sym,
  onEdit,
  onDelete,
  onWhatsApp,
  onOffers,
}: {
  c: Customer;
  sym: string;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onWhatsApp: (c: Customer) => void;
  onOffers: (c: Customer) => void;
}) {
  const status = getMemberStatus(c);
  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">{initials(c.name)}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + ID row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{c.name}</span>
              {c.custom_id && (
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{c.custom_id}</code>
              )}
              {status === "active" && <Badge variant="outline" className="h-4 text-[9px] px-1.5 text-emerald-400 border-emerald-500/30">Active Member</Badge>}
              {status === "expired" && <Badge variant="outline" className="h-4 text-[9px] px-1.5 text-orange-400 border-orange-500/30">Expired</Badge>}
            </div>

            {/* Contact */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
              {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs">
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="h-3 w-3" />{c.loyalty_points.toLocaleString("en-IN")} pts
              </span>
              <span className="text-muted-foreground">
                <Wallet className="h-3 w-3 inline mr-1" />{sym}{c.total_spent.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent
              </span>
              {c.total_play_time != null && (
                <span className="text-muted-foreground">
                  {fmtPlayTime(c.total_play_time)} played
                </span>
              )}
              {c.last_visit_at && (
                <span className="text-muted-foreground">Last: {fmtDate(c.last_visit_at)}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => onEdit(c)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            {c.phone && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-500" title="WhatsApp" onClick={() => onWhatsApp(c)}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:text-primary" title="Offers" onClick={() => onOffers(c)}>
              <Tag className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => onDelete(c)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    onClose();
  };

  const templates = [
    `Hi ${customer.name}, your loyalty balance is ${customer.loyalty_points} points. Book a session today!`,
    `Hi ${customer.name}! We have a special offer waiting for you. Visit us soon.`,
    `Hi ${customer.name}, your membership is coming up for renewal. Contact us to renew.`,
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            WhatsApp — {customer.name}
          </DialogTitle>
          <DialogDescription>Compose a message to send via WhatsApp</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quick templates</Label>
            <div className="space-y-1.5">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(t)}
                  className="w-full text-left text-xs bg-muted hover:bg-muted/80 rounded p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="mt-1.5"
              placeholder="Type your message…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={!message.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Offers management dialog ──────────────────────────────────────────────────

function OffersDialog({ customer, tenantId, open, onClose }: {
  customer: Customer | null;
  tenantId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [allOffers, setAllOffers] = useState<CustomerOffer[]>([]);
  const [assignments, setAssignments] = useState<OfferAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !customer) return;
    const load = async () => {
      setLoading(true);
      const [{ data: offers }, { data: assigns }] = await Promise.all([
        supabase.from("customer_offers").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
        supabase.from("customer_offer_assignments").select("*, customer_offers(*)").eq("customer_id", customer.id),
      ]);
      setAllOffers((offers || []) as CustomerOffer[]);
      const parsedAssigns: OfferAssignment[] = (assigns || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        offer_id: a.offer_id as string,
        status: a.status as string,
        promo_code: a.promo_code as string | null,
        assigned_at: a.assigned_at as string | null,
        offer: a.customer_offers as CustomerOffer | undefined,
      }));
      setAssignments(parsedAssigns);
      setLoading(false);
    };
    load();
  }, [open, customer, tenantId]);

  const assignedOfferIds = new Set(assignments.map(a => a.offer_id));

  const assign = async (offerId: string) => {
    if (!customer) return;
    setAssigning(offerId);
    const promo = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from("customer_offer_assignments").insert({
      customer_id: customer.id,
      offer_id: offerId,
      status: "assigned",
      promo_code: promo,
      assigned_at: new Date().toISOString(),
    });
    setAssigning(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Offer assigned");
    // Reload
    const { data } = await supabase.from("customer_offer_assignments").select("*, customer_offers(*)").eq("customer_id", customer.id);
    const parsed: OfferAssignment[] = (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      offer_id: a.offer_id as string,
      status: a.status as string,
      promo_code: a.promo_code as string | null,
      assigned_at: a.assigned_at as string | null,
      offer: a.customer_offers as CustomerOffer | undefined,
    }));
    setAssignments(parsed);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Offers — {customer.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-5">
            {/* Assigned offers */}
            {assignments.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Assigned Offers</Label>
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.offer?.title ?? "Offer"}</p>
                        <p className="text-xs text-muted-foreground">{a.status}</p>
                      </div>
                      {a.promo_code && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <code className="text-xs bg-background border rounded px-2 py-0.5">{a.promo_code}</code>
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyCode(a.promo_code!, a.id)}
                          >
                            {copiedCode === a.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available offers */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Available Offers to Assign</Label>
              {allOffers.filter(o => !assignedOfferIds.has(o.id)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All offers already assigned</p>
              ) : (
                <div className="space-y-2">
                  {allOffers.filter(o => !assignedOfferIds.has(o.id)).map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.offer_type === "percentage_discount" ? `${o.value}%` :
                           o.offer_type === "flat_discount" ? `₹${o.value} off` :
                           `${o.value}`}
                          {o.expiry_date ? ` · Expires ${fmtDate(o.expiry_date)}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-shrink-0"
                        onClick={() => assign(o.id)}
                        disabled={assigning === o.id}
                      >
                        {assigning === o.id ? "Assigning…" : "Assign"}
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

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

type CustomerForm = {
  name: string; phone: string; email: string;
  is_member: boolean; membership_plan: string;
  membership_start_date: string; membership_expiry_date: string;
  membership_duration: string; membership_hours_left: string;
  notes: string;
};

const blankForm = (): CustomerForm => ({
  name: "", phone: "", email: "",
  is_member: false, membership_plan: "",
  membership_start_date: "", membership_expiry_date: "",
  membership_duration: "", membership_hours_left: "",
  notes: "",
});

function customerToForm(c: Customer): CustomerForm {
  return {
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    is_member: c.is_member ?? false,
    membership_plan: c.membership_plan ?? "",
    membership_start_date: c.membership_start_date?.split("T")[0] ?? "",
    membership_expiry_date: c.membership_expiry_date?.split("T")[0] ?? "",
    membership_duration: c.membership_duration ?? "",
    membership_hours_left: String(c.membership_hours_left ?? ""),
    notes: c.notes ?? "",
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

  // Dialogs
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
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCustomers((data || []) as Customer[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // Debounced search (client-side filter on loaded data for speed)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // filter runs reactively — no separate effect needed
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Filter + sort
  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.custom_id ?? "").toLowerCase().includes(q);

      const status = getMemberStatus(c);
      const matchTab =
        memberTab === "all" ? true :
        memberTab === "member" ? c.is_member :
        memberTab === "non-member" ? !c.is_member :
        memberTab === "active" ? status === "active" :
        memberTab === "expired" ? status === "expired" :
        true;

      const matchLoyalty =
        (!minLoyalty || c.loyalty_points >= Number(minLoyalty)) &&
        (!maxLoyalty || c.loyalty_points <= Number(maxLoyalty));

      const joinDate = new Date(c.created_at);
      const matchDate =
        (!dateFrom || joinDate >= new Date(dateFrom)) &&
        (!dateTo || joinDate <= new Date(dateTo + "T23:59:59"));

      return matchSearch && matchTab && matchLoyalty && matchDate;
    })
    .sort((a, b) => {
      const va = a[sortField] as number | string | null ?? 0;
      const vb = b[sortField] as number | string | null ?? 0;
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
      ? sortDir === "asc"
        ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
        : <ChevronDown className="h-3 w-3 inline ml-0.5" />
      : null;

  // Add / Edit
  const openAdd = () => { setEditing(null); setForm(blankForm()); setEditOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm(customerToForm(c)); setEditOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.phone.trim()) { toast.error("Phone is required"); return; }
    if (!tenantId) return;
    setSaving(true);

    // Duplicate detection
    if (!editing) {
      const { data: dup } = await supabase
        .from("customers")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .or(`phone.eq.${form.phone.trim()},email.eq.${form.email.trim()}`)
        .maybeSingle();
      if (dup) {
        setSaving(false);
        if (!confirm(`A customer with this phone/email already exists (${(dup as { name: string }).name}). Continue anyway?`)) return;
        setSaving(true);
      }
    }

    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      is_member: form.is_member,
      membership_plan: form.membership_plan || null,
      membership_start_date: form.membership_start_date || null,
      membership_expiry_date: form.membership_expiry_date || null,
      membership_duration: form.membership_duration || null,
      membership_hours_left: form.membership_hours_left ? Number(form.membership_hours_left) : null,
      notes: form.notes || null,
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

  // Delete
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

  const MEMBER_TABS: { value: MemberTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "member", label: "Members" },
    { value: "non-member", label: "Non-members" },
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
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

      {/* Insight widgets */}
      {!loading && <InsightWidgets customers={customers} />}

      {/* Search + filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, email, ID…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {/* Sort buttons */}
          <div className="flex gap-1 ml-auto">
            {(["created_at", "total_spent", "loyalty_points", "total_play_time"] as SortField[]).map(f => {
              const labels: Record<SortField, string> = {
                created_at: "Join date", total_spent: "Spend",
                loyalty_points: "Loyalty", total_play_time: "Play time",
              };
              return (
                <Button
                  key={f}
                  variant={sortField === f ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleSort(f)}
                >
                  {labels[f]}<SortIcon field={f} />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Expanded filters */}
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
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 h-7 text-xs text-muted-foreground"
                onClick={() => { setMinLoyalty(""); setMaxLoyalty(""); setDateFrom(""); setDateTo(""); }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
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
              <p className="text-muted-foreground">
                {search ? `No customers matching "${search}"` : "No customers found"}
              </p>
              {!search && (
                <Button onClick={openAdd} className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> Add your first customer
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
              <div className="space-y-2">
                {filtered.map(c => (
                  <CustomerCard
                    key={c.id}
                    c={c}
                    sym={sym}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onWhatsApp={setWhatsAppTarget}
                    onOffers={setOffersTarget}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add/Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
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
            </div>

            {/* Membership */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_member"
                  checked={form.is_member}
                  onChange={e => setForm(f => ({ ...f, is_member: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="is_member" className="cursor-pointer">Member</Label>
              </div>
              {form.is_member && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Plan</Label>
                    <Input value={form.membership_plan} onChange={e => setForm(f => ({ ...f, membership_plan: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="e.g. Monthly" />
                  </div>
                  <div>
                    <Label className="text-xs">Duration</Label>
                    <Select value={form.membership_duration} onValueChange={v => setForm(f => ({ ...f, membership_duration: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Start date</Label>
                    <Input type="date" value={form.membership_start_date} onChange={e => setForm(f => ({ ...f, membership_start_date: e.target.value }))} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Expiry date</Label>
                    <Input type="date" value={form.membership_expiry_date} onChange={e => setForm(f => ({ ...f, membership_expiry_date: e.target.value }))} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Hours left</Label>
                    <Input type="number" value={form.membership_hours_left} onChange={e => setForm(f => ({ ...f, membership_hours_left: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1.5" placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add Customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Delete Customer
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── WhatsApp dialog ── */}
      <WhatsAppDialog
        customer={whatsAppTarget}
        open={!!whatsAppTarget}
        onClose={() => setWhatsAppTarget(null)}
      />

      {/* ── Offers dialog ── */}
      <OffersDialog
        customer={offersTarget}
        tenantId={tenantId}
        open={!!offersTarget}
        onClose={() => setOffersTarget(null)}
      />
    </div>
  );
}
