import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/hooks/useCustomerSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Copy, Check, Clock, Zap, Gift, Percent, Star, Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type OfferAssignment = {
  id: string;
  status: "assigned" | "viewed" | "redeemed";
  promo_code: string | null;
  assigned_at: string | null;
  viewed_at: string | null;
  redeemed_at: string | null;
  offer: {
    id: string;
    title: string;
    description: string | null;
    offer_type: string;
    value: number;
    expiry_date: string | null;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OFFER_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  percentage_discount: { label: "% Discount",    icon: Percent,  color: "text-blue-400" },
  flat_discount:       { label: "Flat Discount",  icon: Tag,      color: "text-emerald-400" },
  free_hours:          { label: "Free Hours",     icon: Clock,    color: "text-purple-400" },
  loyalty_bonus:       { label: "Loyalty Bonus",  icon: Star,     color: "text-yellow-400" },
  free_product:        { label: "Free Product",   icon: Package,  color: "text-pink-400" },
  custom:              { label: "Special Offer",  icon: Gift,     color: "text-orange-400" },
};

function offerValueLabel(type: string, value: number): string {
  if (type === "percentage_discount") return `${value}% off`;
  if (type === "flat_discount")       return `₹${value} off`;
  if (type === "free_hours")          return `${value} hour${value !== 1 ? "s" : ""} free`;
  if (type === "loyalty_bonus")       return `+${value} loyalty points`;
  return String(value);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

// ─── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({
  assignment,
  onMarkViewed,
}: {
  assignment: OfferAssignment;
  onMarkViewed: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { offer, status, promo_code } = assignment;
  const meta = OFFER_TYPE_META[offer.offer_type] ?? OFFER_TYPE_META.custom;
  const Icon = meta.icon;
  const expired = isExpired(offer.expiry_date);

  const copyCode = async () => {
    if (!promo_code) return;
    await navigator.clipboard.writeText(promo_code);
    setCopied(true);
    toast.success("Promo code copied!");
    setTimeout(() => setCopied(false), 2000);

    if (status === "assigned") {
      onMarkViewed(assignment.id);
    }
  };

  const statusBadge = status === "redeemed"
    ? <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Redeemed</Badge>
    : expired
    ? <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Expired</Badge>
    : status === "assigned"
    ? <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">New</Badge>
    : null;

  return (
    <Card className={expired || status === "redeemed" ? "opacity-60" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon tile */}
          <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
              <div>
                <h3 className="font-semibold text-sm text-foreground">{offer.title}</h3>
                <p className={`text-sm font-semibold ${meta.color}`}>
                  {offerValueLabel(offer.offer_type, offer.value)}
                </p>
              </div>
              {statusBadge}
            </div>

            {/* Description */}
            {offer.description && (
              <p className="text-xs text-muted-foreground mb-2">{offer.description}</p>
            )}

            {/* Type + expiry */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> {meta.label}
              </span>
              {offer.expiry_date && (
                <span className={`flex items-center gap-1 ${expired ? "text-red-400" : ""}`}>
                  <Clock className="h-3 w-3" />
                  {expired ? "Expired" : "Expires"} {fmtDate(offer.expiry_date)}
                </span>
              )}
            </div>

            {/* Promo code */}
            {promo_code && status !== "redeemed" && !expired && (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-muted border border-border rounded px-3 py-1.5 text-foreground tracking-widest">
                  {promo_code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={copyCode}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerOffers() {
  const session = getCustomerSession();
  const customerId = session?.id;

  const [assignments, setAssignments] = useState<OfferAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  const load = async () => {
    if (!customerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_offer_assignments")
      .select(`
        id, status, promo_code, assigned_at, viewed_at, redeemed_at,
        customer_offers ( id, title, description, offer_type, value, expiry_date )
      `)
      .eq("customer_id", customerId)
      .order("assigned_at", { ascending: false });

    if (error) toast.error(error.message);

    const rows = (data || []) as unknown[];
    const parsed: OfferAssignment[] = rows.map((r) => {
      const row = r as Record<string, unknown>;
      const co = row.customer_offers as Record<string, unknown>;
      return {
        id: row.id as string,
        status: row.status as OfferAssignment["status"],
        promo_code: row.promo_code as string | null,
        assigned_at: row.assigned_at as string | null,
        viewed_at: row.viewed_at as string | null,
        redeemed_at: row.redeemed_at as string | null,
        offer: {
          id: co?.id as string,
          title: co?.title as string ?? "Offer",
          description: co?.description as string | null ?? null,
          offer_type: co?.offer_type as string ?? "custom",
          value: co?.value as number ?? 0,
          expiry_date: co?.expiry_date as string | null ?? null,
        },
      };
    });

    setAssignments(parsed);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markViewed = async (assignmentId: string) => {
    await supabase
      .from("customer_offer_assignments")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .eq("id", assignmentId)
      .eq("status", "assigned");
    setAssignments(prev =>
      prev.map(a => a.id === assignmentId && a.status === "assigned" ? { ...a, status: "viewed" } : a)
    );
  };

  const active = assignments.filter(a => a.status === "assigned" || a.status === "viewed");
  const redeemed = assignments.filter(a => a.status === "redeemed");
  const newCount = assignments.filter(a => a.status === "assigned").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Offers" description="Active promotions and deals for your account" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            Active
            {newCount > 0 && (
              <Badge variant="default" className="h-4 text-[10px] px-1.5">{newCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="redeemed">Redeemed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
          ) : active.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Tag className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No active offers</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later or ask staff about current promotions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(a => (
                <OfferCard key={a.id} assignment={a} onMarkViewed={markViewed} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="redeemed" className="mt-4">
          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : redeemed.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No redeemed offers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {redeemed.map(a => (
                <OfferCard key={a.id} assignment={a} onMarkViewed={markViewed} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
