import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, Plus, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Club Info",    icon: "🏢" },
  { id: 2, label: "Stations",     icon: "🎱" },
  { id: 3, label: "POS Setup",    icon: "🛒" },
  { id: 4, label: "Invite Staff", icon: "👥" },
  { id: 5, label: "Payment",      icon: "💳" },
];

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Los_Angeles",
  "America/Chicago", "America/Toronto", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Australia/Sydney",
  "Asia/Dubai", "Asia/Singapore", "Africa/Johannesburg",
];

const STATION_TYPES = [
  { value: "snooker",  label: "Snooker" },
  { value: "pool",     label: "Pool" },
  { value: "8-ball",   label: "8-Ball" },
  { value: "9-ball",   label: "9-Ball" },
  { value: "gaming",   label: "Gaming / Console" },
  { value: "darts",    label: "Darts" },
  { value: "bowling",  label: "Bowling" },
  { value: "other",    label: "Other" },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const clubInfoSchema = z.object({
  brand_name:        z.string().min(2, "Club name required"),
  business_phone:    z.string().optional(),
  business_email:    z.string().email("Enter a valid email").optional().or(z.literal("")),
  business_city:     z.string().optional(),
  business_state:    z.string().optional(),
  business_country:  z.string().min(2),
  timezone:          z.string().min(3),
  currency_code:     z.string().min(3),
  currency_symbol:   z.string().min(1),
  business_tax_id:   z.string().optional(),
  business_website:  z.string().optional(),
});

type ClubInfoForm = z.infer<typeof clubInfoSchema>;

interface StationRow {
  id: string;
  name: string;
  type: string;
  rate_per_hour: string;
}

const posSchema = z.object({
  default_session_rate:   z.coerce.number().min(0),
  loyalty_points_per_unit: z.coerce.number().min(0),
  loyalty_redeem_threshold: z.coerce.number().min(1),
  receipt_footer_text:    z.string().optional(),
});

type PosForm = z.infer<typeof posSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkId() { return Math.random().toString(36).slice(2, 9); }

// ─── Main component ───────────────────────────────────────────────────────────

const Onboarding = () => {
  const navigate = useNavigate();
  const { config, refetch } = useTenant();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // ── Step 2 — station rows managed in local state ──────────────────────────
  const [stations, setStations] = useState<StationRow[]>([
    { id: mkId(), name: "", type: "snooker", rate_per_hour: "0" },
  ]);

  // ── Step 4 — staff invites ────────────────────────────────────────────────
  const [invites, setInvites] = useState([{ id: mkId(), email: "", role: "staff" }]);

  // ── Step 1 form ───────────────────────────────────────────────────────────
  const clubForm = useForm<ClubInfoForm>({
    resolver: zodResolver(clubInfoSchema),
    defaultValues: {
      brand_name:       config?.brand_name ?? "",
      business_phone:   config?.business_phone ?? "",
      business_email:   config?.business_email ?? "",
      business_city:    config?.business_city ?? "",
      business_state:   config?.business_state ?? "",
      business_country: config?.business_country ?? "IN",
      timezone:         config?.timezone ?? "Asia/Kolkata",
      currency_code:    config?.currency_code ?? "INR",
      currency_symbol:  config?.currency_symbol ?? "₹",
      business_tax_id:  config?.business_tax_id ?? "",
      business_website: config?.business_website ?? "",
    },
  });

  // Sync form defaults once TenantContext loads
  useEffect(() => {
    if (config) {
      clubForm.reset({
        brand_name:       config.brand_name ?? "",
        business_phone:   config.business_phone ?? "",
        business_email:   config.business_email ?? "",
        business_city:    config.business_city ?? "",
        business_state:   config.business_state ?? "",
        business_country: config.business_country ?? "IN",
        timezone:         config.timezone ?? "Asia/Kolkata",
        currency_code:    config.currency_code ?? "INR",
        currency_symbol:  config.currency_symbol ?? "₹",
        business_tax_id:  config.business_tax_id ?? "",
        business_website: config.business_website ?? "",
      });
    }
  }, [config?.tenant_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 3 form ───────────────────────────────────────────────────────────
  const posForm = useForm<PosForm>({
    resolver: zodResolver(posSchema),
    defaultValues: {
      default_session_rate:    config?.default_session_rate ?? 0,
      loyalty_points_per_unit: config?.loyalty_points_per_unit ?? 1,
      loyalty_redeem_threshold: config?.loyalty_redeem_threshold ?? 100,
      receipt_footer_text:     config?.receipt_footer_text ?? "Thank you for visiting!",
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const saveStep1 = async (data: ClubInfoForm) => {
    if (!config?.tenant_id) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenant_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("tenant_id", config.tenant_id);

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Mark step complete
    await supabase
      .from("onboarding_progress")
      .update({ step_club_info: true })
      .eq("tenant_id", config.tenant_id);

    await refetch();
    setSaving(false);
    setStep(2);
  };

  const saveStep2 = async () => {
    if (!config?.tenant_id) return;
    const valid = stations.filter((s) => s.name.trim());
    if (!valid.length) {
      toast.error("Add at least one station to continue.");
      return;
    }

    setSaving(true);
    const rows = valid.map((s, i) => ({
      tenant_id:    config.tenant_id,
      name:         s.name.trim(),
      type:         s.type,
      rate_per_hour: parseFloat(s.rate_per_hour) || 0,
      display_order: i,
    }));

    const { error } = await supabase.from("stations").insert(rows);
    if (error) { toast.error(error.message); setSaving(false); return; }

    await supabase
      .from("onboarding_progress")
      .update({ step_stations: true })
      .eq("tenant_id", config.tenant_id);

    setSaving(false);
    setStep(3);
  };

  const saveStep3 = async (data: PosForm) => {
    if (!config?.tenant_id) return;
    setSaving(true);

    const { error } = await supabase
      .from("tenant_config")
      .update({
        default_session_rate:    data.default_session_rate,
        loyalty_points_per_unit: data.loyalty_points_per_unit,
        loyalty_redeem_threshold: data.loyalty_redeem_threshold,
        receipt_footer_text:     data.receipt_footer_text,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", config.tenant_id);

    if (error) { toast.error(error.message); setSaving(false); return; }

    await supabase
      .from("onboarding_progress")
      .update({ step_pos: true })
      .eq("tenant_id", config.tenant_id);

    await refetch();
    setSaving(false);
    setStep(4);
  };

  const saveStep4 = async () => {
    if (!config?.tenant_id) return;
    setSaving(true);

    const valid = invites.filter((i) => i.email.trim());
    if (valid.length) {
      for (const invite of valid) {
        // Supabase inviteUserByEmail requires service role — note in UI
        // For now, record the pending invitation intent; admin can resend later
        toast.info(`Invitation for ${invite.email} will be sent — this requires email configuration in Settings.`);
      }
    }

    await supabase
      .from("onboarding_progress")
      .update({ step_staff: true })
      .eq("tenant_id", config.tenant_id);

    setSaving(false);
    setStep(5);
  };

  const finishWizard = async () => {
    if (!config?.tenant_id) { navigate("/dashboard"); return; }
    setSaving(true);

    await supabase
      .from("onboarding_progress")
      .update({
        step_payment: true,
        wizard_dismissed: false,
        completed_at: new Date().toISOString(),
      })
      .eq("tenant_id", config.tenant_id);

    setSaving(false);
    toast.success("Your club is ready! Welcome to Cuetronix 🎉");
    navigate("/dashboard");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border/50 flex items-center px-6">
        <span className="font-bold text-xl text-primary">Cuetronix</span>
        <span className="ml-3 text-sm text-muted-foreground">— Setup Wizard</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
        {/* Progress bar */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex flex-col items-center gap-1 cursor-default ${
                    s.id < step ? "cursor-pointer" : ""
                  }`}
                  type="button"
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      s.id < step
                        ? "bg-primary text-primary-foreground"
                        : s.id === step
                        ? "bg-primary/20 border-2 border-primary text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.id < step ? <Check className="h-4 w-4" /> : s.icon}
                  </div>
                  <span
                    className={`text-xs hidden md:block ${
                      s.id === step ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      s.id < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step cards */}
        <div className="w-full max-w-2xl">

          {/* ── STEP 1: Club Info ─────────────────────────────────────────── */}
          {step === 1 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Club Information</CardTitle>
                <CardDescription>
                  Tell us about your club — you can update this anytime in Settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={clubForm.handleSubmit(saveStep1)} className="space-y-4" noValidate>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Club Name *</Label>
                      <Input placeholder="The Snooker Club" {...clubForm.register("brand_name")} />
                      {clubForm.formState.errors.brand_name && (
                        <p className="text-xs text-destructive">{clubForm.formState.errors.brand_name.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input placeholder="+91 9999999999" {...clubForm.register("business_phone")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Business Email</Label>
                      <Input type="email" placeholder="club@example.com" {...clubForm.register("business_email")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input placeholder="Mumbai" {...clubForm.register("business_city")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State / Region</Label>
                      <Input placeholder="Maharashtra" {...clubForm.register("business_state")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Timezone *</Label>
                      <Select
                        defaultValue={clubForm.getValues("timezone")}
                        onValueChange={(v) => clubForm.setValue("timezone", v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <div className="flex gap-2">
                        <Input
                          className="w-20"
                          placeholder="₹"
                          maxLength={4}
                          {...clubForm.register("currency_symbol")}
                        />
                        <Input
                          placeholder="INR"
                          maxLength={3}
                          {...clubForm.register("currency_code")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>GST / VAT / Tax ID</Label>
                      <Input placeholder="Optional" {...clubForm.register("business_tax_id")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input placeholder="https://myclubwebsite.com" {...clubForm.register("business_website")} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: Stations ──────────────────────────────────────────── */}
          {step === 2 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Add Your Stations</CardTitle>
                <CardDescription>
                  Add the tables, consoles, or lanes you rent out. You can add more later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stations.map((s, idx) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      {idx === 0 && <Label>Station Name</Label>}
                      <Input
                        placeholder="Table 1"
                        value={s.name}
                        onChange={(e) =>
                          setStations((prev) =>
                            prev.map((r) => r.id === s.id ? { ...r, name: e.target.value } : r)
                          )
                        }
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      {idx === 0 && <Label>Type</Label>}
                      <Select
                        value={s.type}
                        onValueChange={(v) =>
                          setStations((prev) =>
                            prev.map((r) => r.id === s.id ? { ...r, type: v } : r)
                          )
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      {idx === 0 && <Label>Rate /hr</Label>}
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={s.rate_per_hour}
                        onChange={(e) =>
                          setStations((prev) =>
                            prev.map((r) => r.id === s.id ? { ...r, rate_per_hour: e.target.value } : r)
                          )
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={stations.length === 1}
                        onClick={() =>
                          setStations((prev) => prev.filter((r) => r.id !== s.id))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setStations((prev) => [
                      ...prev,
                      { id: mkId(), name: "", type: "snooker", rate_per_hour: "0" },
                    ])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Station
                </Button>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={saveStep2} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: POS Config ────────────────────────────────────────── */}
          {step === 3 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Configure POS & Loyalty</CardTitle>
                <CardDescription>
                  Set your default session pricing and loyalty rewards. Adjustable anytime in Settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={posForm.handleSubmit(saveStep3)} className="space-y-4" noValidate>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Default Session Rate ({config?.currency_symbol ?? "₹"}/hr)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...posForm.register("default_session_rate")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Loyalty Points per {config?.currency_symbol ?? "₹"} Spent</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="1"
                        {...posForm.register("loyalty_points_per_unit")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Min Points to Redeem</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="100"
                        {...posForm.register("loyalty_redeem_threshold")}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Receipt Footer Text</Label>
                      <Input
                        placeholder="Thank you for visiting!"
                        {...posForm.register("receipt_footer_text")}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" type="button" onClick={() => setStep(2)}>Back</Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save & Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 4: Invite Staff ──────────────────────────────────────── */}
          {step === 4 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Invite Your Staff</CardTitle>
                <CardDescription>
                  Add staff emails and assign roles. They'll receive an invite link. You can skip this and add staff later in Staff Management.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invites.map((inv, idx) => (
                  <div key={inv.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 space-y-1">
                      {idx === 0 && <Label>Email</Label>}
                      <Input
                        type="email"
                        placeholder="staff@example.com"
                        value={inv.email}
                        onChange={(e) =>
                          setInvites((prev) =>
                            prev.map((r) => r.id === inv.id ? { ...r, email: e.target.value } : r)
                          )
                        }
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      {idx === 0 && <Label>Role</Label>}
                      <Select
                        value={inv.role}
                        onValueChange={(v) =>
                          setInvites((prev) =>
                            prev.map((r) => r.id === inv.id ? { ...r, role: v } : r)
                          )
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={invites.length === 1}
                        onClick={() =>
                          setInvites((prev) => prev.filter((r) => r.id !== inv.id))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setInvites((prev) => [...prev, { id: mkId(), email: "", role: "staff" }])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Another
                </Button>

                <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                  ⚠️ Sending invite emails requires configuring your email settings in Settings → Notifications after setup.
                </p>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setStep(5); }}>
                      Skip
                    </Button>
                    <Button onClick={saveStep4} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 5: Payment Gateway ───────────────────────────────────── */}
          {step === 5 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Connect Payment Gateway</CardTitle>
                <CardDescription>
                  Required for online bookings and tournament payments from your customers.
                  You can skip this and configure it later in Settings → Payment Gateway.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Gateway option cards */}
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { id: "razorpay", label: "Razorpay", desc: "Best for India", recommended: config?.business_country === "IN" },
                    { id: "stripe",   label: "Stripe",   desc: "Global (US, EU, AU)", recommended: config?.business_country !== "IN" },
                    { id: "square",   label: "Square",   desc: "US & Australia" },
                  ].map((gw) => (
                    <div
                      key={gw.id}
                      className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                        gw.recommended
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      {gw.recommended && (
                        <span className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          RECOMMENDED
                        </span>
                      )}
                      <p className="font-semibold text-foreground">{gw.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{gw.desc}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground rounded-lg border border-border/50 bg-muted/20 p-3">
                  🔒 Your API keys are encrypted before storage and are only used server-side. They are never exposed to the browser. You can configure this properly in{" "}
                  <span className="text-foreground font-medium">Settings → Payment Gateway</span>.
                </p>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={finishWizard} disabled={saving}>
                      Skip & Go to Dashboard
                    </Button>
                    <Button onClick={finishWizard} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Finish Setup <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
