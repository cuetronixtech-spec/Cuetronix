import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/hooks/useCustomerSession";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Clock, Zap, Gift, Percent, Star, Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Types — aligned with actual DB schema ────────────────────────────────────

type OfferAssignment = {
  id: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string | null;
  offer: {
    id: string;
    title: string;
    description: string | null;
    type: string;           // actual column is "type" not "offer_type"
    value: number | null;
    valid_until: string | null;  // actual column is "valid_until" not "expiry_date"
    image_url: string | null;
    terms: string | null;
  } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OFFER_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  discount:   { label: "Discount",     icon: Percent, color: "text-blue-400" },
  free_session: { label: "Free Session", icon: Zap,   color: "text-emerald-400" },
  cashback:   { label: "Cashback",     icon: Star,    color: "text-yellow-400" },
  combo:      { label: "Combo Deal",   icon: Package, color: "text-purple-400" },
  freebie:    { label: "Freebie",      icon: Gift,    color: "text-pink-400" },
  custom:     { label: "Special Offer",icon: Tag,     color: "text-orange-400" },
};

function offerValueLabel(type: string, value: number | null): string {
  if (value == null) return "";
  if (type === "discount" || type === "cashback") return `${value}% off`;
  return `Value: ${value}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

// ─── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({ assignment }: { assignment: OfferAssignment }) {
  const { offer, is_used, used_at } = assignment;
  if (!offer) return null;

  const meta = OFFER_TYPE_META[offer.type] ?? OFFER_TYPE_META.custom;
  const Icon = meta.icon;
  const expired = isExpired(offer.valid_until);
  const valueLabel = offerValueLabel(offer.type, offer.value);

  return (
    <Card className={is_used || expired ? "opacity-60" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
              <div>
                <h3 className="font-semibold text-sm text-foreground">{offer.title}</h3>
                {valueLabel && <p className={`text-sm font-semibold ${meta.color}`}>{valueLabel}</p>}
              </div>
              {is_used ? (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Used</Badge>
              ) : expired ? (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Expired</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
              )}
            </div>

            {offer.description && (
              <p className="text-xs text-muted-foreground mb-2">{offer.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> {meta.label}
              </span>
              {offer.valid_until && (
                <span className={`flex items-center gap-1 ${expired ? "text-red-400" : ""}`}>
                  <Clock className="h-3 w-3" />
                  {expired ? "Expired" : "Until"} {fmtDate(offer.valid_until)}
                </span>
              )}
              {is_used && used_at && (
                <span className="text-muted-foreground">Used on {fmtDate(used_at)}</span>
              )}
            </div>

            {offer.terms && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">{offer.terms}</p>
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

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    supabase
      .from("customer_offer_assignments")
      .select("id, is_used, used_at, created_at, customer_offers(id, title, description, type, value, valid_until, image_url, terms)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const parsed: OfferAssignment[] = ((data || []) as unknown as Record<string, unknown>[]).map(r => ({
          id: r.id as string,
          is_used: !!(r.is_used as boolean),
          used_at: r.used_at as string | null,
          created_at: r.created_at as string | null,
          offer: r.customer_offers as OfferAssignment["offer"],
        }));
        setAssignments(parsed);
        setLoading(false);
      });
  }, [customerId]);

  const active = assignments.filter(a => !a.is_used);
  const used   = assignments.filter(a => a.is_used);

  return (
    <div className="space-y-5">
      <PageHeader title="Offers" description="Active promotions and deals for your account" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            Active
            {active.length > 0 && (
              <Badge variant="default" className="h-4 text-[10px] px-1.5">{active.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="used">Used</TabsTrigger>
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
              {active.map(a => <OfferCard key={a.id} assignment={a} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="used" className="mt-4">
          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : used.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No used offers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {used.map(a => <OfferCard key={a.id} assignment={a} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
