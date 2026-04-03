import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession, setCustomerSession, clearCustomerSession } from "@/hooks/useCustomerSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, EyeOff, LogOut, User, Star, Lock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Membership tier config ───────────────────────────────────────────────────

const TIERS = [
  { name: "Bronze",   minSpend: 0,      color: "text-orange-600",  bg: "bg-orange-100 dark:bg-orange-500/10"  },
  { name: "Silver",   minSpend: 5000,   color: "text-slate-400",   bg: "bg-slate-100 dark:bg-slate-500/10"   },
  { name: "Gold",     minSpend: 15000,  color: "text-yellow-500",  bg: "bg-yellow-100 dark:bg-yellow-500/10" },
  { name: "Platinum", minSpend: 40000,  color: "text-cyan-400",    bg: "bg-cyan-100 dark:bg-cyan-500/10"     },
];

function getTier(spend: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (spend >= TIERS[i].minSpend) return { ...TIERS[i], index: i };
  }
  return { ...TIERS[0], index: 0 };
}

function getTierProgress(spend: number): number {
  for (let i = TIERS.length - 2; i >= 0; i--) {
    if (spend >= TIERS[i].minSpend && spend < TIERS[i + 1].minSpend) {
      const range = TIERS[i + 1].minSpend - TIERS[i].minSpend;
      const pos = spend - TIERS[i].minSpend;
      return Math.round((pos / range) * 100);
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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [totalSpent, setTotalSpent] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<string | null>(null);
  const [membershipExpiry, setMembershipExpiry] = useState<string | null>(null);

  // Password form
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("name, phone, email, total_spent, loyalty_points, is_member, membership_plan, membership_expiry_date")
        .eq("id", customerId)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        const row = data as Record<string, unknown>;
        setName(row.name as string ?? "");
        setPhone(row.phone as string ?? "");
        setEmail(row.email as string ?? "");
        setTotalSpent((row.total_spent as number | null) ?? 0);
        setLoyaltyPoints((row.loyalty_points as number | null) ?? 0);
        setIsMember(!!(row.is_member as boolean));
        setMembershipPlan(row.membership_plan as string | null ?? null);
        setMembershipExpiry(row.membership_expiry_date as string | null ?? null);
      }
      setLoading(false);
    };
    load();
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
    // Update localStorage session
    if (session) {
      setCustomerSession({ ...session, name: name.trim(), email: email.trim() || null });
    }
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (!newPw || newPw.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    setPwSaving(true);
    const { error } = await supabase.rpc("update_customer_password" as never, {
      p_customer_id: customerId,
      p_current_password: currentPw || undefined,
      p_new_password: newPw,
    } as never);
    setPwSaving(false);
    if (error) { toast.error(error.message || "Failed to change password"); return; }
    toast.success("Password changed successfully");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwOpen(false);
  };

  const logout = () => {
    clearCustomerSession();
    navigate("/customer/login");
  };

  const tier = getTier(totalSpent);
  const tierProgress = getTierProgress(totalSpent);
  const nextTier = tier.index < TIERS.length - 1 ? TIERS[tier.index + 1] : null;

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

      {/* Membership tier */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className={`h-4 w-4 ${tier.color}`} />
              Membership Status
            </CardTitle>
            {isMember && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Member</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full font-semibold text-sm ${tier.bg} ${tier.color}`}>
              {tier.name}
            </div>
            {membershipPlan && (
              <span className="text-sm text-muted-foreground">{membershipPlan}</span>
            )}
            {membershipExpiry && (
              <span className="text-xs text-muted-foreground">
                Expires {new Date(membershipExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Tier progress */}
          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{tier.name}</span>
                <span>{nextTier.name} at ₹{nextTier.minSpend.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₹{(nextTier.minSpend - totalSpent).toLocaleString("en-IN")} more to reach {nextTier.name}
              </p>
            </div>
          )}
          {!nextTier && (
            <p className="text-xs text-muted-foreground">You've reached the highest tier!</p>
          )}

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="font-bold text-foreground">₹{totalSpent.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Loyalty Points</p>
              <p className="font-bold text-foreground">{loyaltyPoints.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Details
          </CardTitle>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number <span className="text-muted-foreground text-xs">(read-only)</span></Label>
            <Input value={phone} disabled className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change your account password</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of the customer portal</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password change dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                onKeyDown={e => e.key === "Enter" && changePassword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? "Updating…" : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout confirm */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>You'll be returned to the login screen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={logout}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
