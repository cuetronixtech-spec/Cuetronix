import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession, setCustomerSession, clearCustomerSession } from "@/hooks/useCustomerSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { LogOut, User, Star, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Membership tier from total_spend ────────────────────────────────────────

type MembershipType = "regular" | "premium" | "vip";

const TYPE_META: Record<MembershipType, { label: string; color: string; bg: string }> = {
  regular: { label: "Regular", color: "text-muted-foreground",  bg: "bg-muted"                    },
  premium: { label: "Premium", color: "text-blue-400",          bg: "bg-blue-500/10 border-blue-500/20"   },
  vip:     { label: "VIP",     color: "text-purple-400",        bg: "bg-purple-500/10 border-purple-500/20" },
};

// Spend-based tier progression (informational — actual membership_type is DB-controlled)
const TIERS = [
  { name: "Bronze",   minSpend: 0,      color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-500/10"  },
  { name: "Silver",   minSpend: 5000,   color: "text-slate-400",  bg: "bg-slate-100 dark:bg-slate-500/10"   },
  { name: "Gold",     minSpend: 15000,  color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-500/10" },
  { name: "Platinum", minSpend: 40000,  color: "text-cyan-400",   bg: "bg-cyan-100 dark:bg-cyan-500/10"     },
];

function getSpendTier(spend: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (spend >= TIERS[i].minSpend) return { ...TIERS[i], index: i };
  }
  return { ...TIERS[0], index: 0 };
}
function getSpendTierProgress(spend: number): number {
  for (let i = 0; i < TIERS.length - 1; i++) {
    if (spend >= TIERS[i].minSpend && spend < TIERS[i + 1].minSpend) {
      return Math.round(((spend - TIERS[i].minSpend) / (TIERS[i + 1].minSpend - TIERS[i].minSpend)) * 100);
    }
  }
  return 100;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerProfile() {
  const navigate = useNavigate();
  const session = getCustomerSession();
  const customerId = session?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [totalSpend, setTotalSpend] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [membershipType, setMembershipType] = useState<MembershipType>("regular");

  useEffect(() => {
    if (!customerId) return;
    supabase
      .from("customers")
      .select("name, phone, email, total_spend, loyalty_points, visit_count, membership_type")
      .eq("id", customerId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (data) {
          const row = data as Record<string, unknown>;
          setName(row.name as string ?? "");
          setPhone(row.phone as string ?? "");
          setEmail(row.email as string ?? "");
          setTotalSpend((row.total_spend as number | null) ?? 0);
          setLoyaltyPoints((row.loyalty_points as number | null) ?? 0);
          setVisitCount((row.visit_count as number | null) ?? 0);
          setMembershipType((row.membership_type as MembershipType | null) ?? "regular");
        }
        setLoading(false);
      });
  }, [customerId]);

  const saveProfile = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({ name: name.trim(), email: email.trim() || null })
      .eq("id", customerId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (session) setCustomerSession({ ...session, name: name.trim(), email: email.trim() || null });
    toast.success("Profile updated");
  };

  const logout = () => {
    clearCustomerSession();
    navigate("/customer/login");
  };

  const tier = getSpendTier(totalSpend);
  const progress = getSpendTierProgress(totalSpend);
  const nextTier = tier.index < TIERS.length - 1 ? TIERS[tier.index + 1] : null;
  const typeMeta = TYPE_META[membershipType] ?? TYPE_META.regular;

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-36" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Profile" description="Manage your account details" />

      {/* Membership + stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className={`h-4 w-4 ${typeMeta.color}`} /> Membership
            </CardTitle>
            <Badge variant="outline" className={`text-xs ${typeMeta.bg} ${typeMeta.color}`}>
              {membershipType === "vip" && <Star className="h-3 w-3 mr-1" />}
              {typeMeta.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Spend-based tier */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${tier.color}`}>{tier.name} tier</span>
            <span className="text-xs text-muted-foreground">based on total spend</span>
          </div>
          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{tier.name}</span>
                <span>{nextTier.name} at ₹{nextTier.minSpend.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₹{(nextTier.minSpend - totalSpend).toLocaleString("en-IN")} more to reach {nextTier.name}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="font-bold text-foreground">₹{totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Loyalty Pts</p>
              <p className="font-bold text-foreground">{loyaltyPoints.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Visits</p>
              <p className="font-bold text-foreground">{visitCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Account Details</CardTitle>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Phone <span className="text-xs text-muted-foreground">(read-only)</span></Label>
            <Input value={phone} disabled className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>Email <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card className="border-destructive/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of the customer portal</p>
            </div>
            <Button variant="outline" size="sm"
              className="border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setLogoutOpen(true)}>
              <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>You'll be returned to the login screen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={logout}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
