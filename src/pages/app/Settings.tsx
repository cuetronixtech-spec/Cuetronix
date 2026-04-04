import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BookingCoupon } from "@/integrations/supabase/types";

type ConfigPatch = Record<string, unknown>;

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <Button onClick={onClick} disabled={saving} className="mt-4">
      {saving ? "Saving…" : "Save Changes"}
    </Button>
  );
}

// ── CouponsCard ────────────────────────────────────────────────────────────

const blankCoupon = (): Omit<BookingCoupon, "uses"> => ({
  code: "", type: "percent", value: 0, max_uses: 0,
  happy_hour_start: "", happy_hour_end: "", verify_note: "",
});

function CouponsCard({ tenantId, initialCoupons, onSaved, sym }: {
  tenantId: string;
  initialCoupons: BookingCoupon[];
  onSaved: () => void;
  sym: string;
}) {
  const [coupons, setCoupons] = useState<BookingCoupon[]>(initialCoupons);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blankCoupon());
  const [saving, setSaving] = useState(false);

  useEffect(() => { setCoupons(initialCoupons); }, [initialCoupons.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCoupons = async (updated: BookingCoupon[]) => {
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("tenant_config").update({ booking_coupons: updated }).eq("tenant_id", tenantId);
    if (error) { toast.error(error.message); } else { toast.success("Coupons saved"); onSaved(); }
    setSaving(false);
  };

  const handleAdd = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code || form.value <= 0) return;
    if (coupons.some(c => c.code === code)) { toast.error("Coupon code already exists"); return; }
    const newCoupon: BookingCoupon = {
      code,
      type: form.type,
      value: Number(form.value),
      max_uses: Number(form.max_uses) || 0,
      uses: 0,
      ...(form.happy_hour_start ? { happy_hour_start: form.happy_hour_start } : {}),
      ...(form.happy_hour_end   ? { happy_hour_end: form.happy_hour_end }     : {}),
      ...(form.verify_note      ? { verify_note: form.verify_note }           : {}),
    };
    const updated = [...coupons, newCoupon];
    await saveCoupons(updated);
    setCoupons(updated);
    setForm(blankCoupon());
    setAdding(false);
  };

  const handleDelete = async (code: string) => {
    const updated = coupons.filter(c => c.code !== code);
    await saveCoupons(updated);
    setCoupons(updated);
  };

  const typeLabel = (c: BookingCoupon) => {
    switch (c.type) {
      case "percent": return `${c.value}% off`;
      case "flat":    return `${sym}${c.value} off`;
      case "fixed":   return `${sym}${c.value}/hr fixed`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Session Coupons</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAdding(a => !a)}>
            <Plus className="h-3.5 w-3.5 mr-1" />{adding ? "Cancel" : "Add Coupon"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        {adding && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">New Coupon</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. HH99" className="mt-1 uppercase" />
              </div>
              <div>
                <Label className="text-xs">Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as BookingCoupon["type"] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off (%)</SelectItem>
                    <SelectItem value="flat">Flat amount off</SelectItem>
                    <SelectItem value="fixed">Fixed rate override</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  {form.type === "percent" ? "Discount %" : form.type === "flat" ? `Amount off (${sym})` : `Fixed rate (${sym}/hr)`} *
                </Label>
                <Input type="number" min="0" value={form.value || ""} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} className="mt-1" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Max Uses (0 = unlimited)</Label>
                <Input type="number" min="0" value={form.max_uses || ""} onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) || 0 }))} className="mt-1" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Happy Hour Start (HH:MM, optional)</Label>
                <Input type="time" value={form.happy_hour_start || ""} onChange={e => setForm(f => ({ ...f, happy_hour_start: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Happy Hour End (HH:MM, optional)</Label>
                <Input type="time" value={form.happy_hour_end || ""} onChange={e => setForm(f => ({ ...f, happy_hour_end: e.target.value }))} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Verification Note (shown as alert when applied)</Label>
                <Input value={form.verify_note || ""} onChange={e => setForm(f => ({ ...f, verify_note: e.target.value }))} className="mt-1" placeholder="e.g. Student ID required" />
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={saving || !form.code.trim() || form.value <= 0}>
              {saving ? "Saving…" : "Add Coupon"}
            </Button>
          </div>
        )}

        {/* Coupon list */}
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No coupons configured yet.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map(c => (
              <div key={c.code} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{c.code}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{typeLabel(c)}</span>
                    {c.happy_hour_start && c.happy_hour_end && (
                      <span className="text-xs text-muted-foreground">{c.happy_hour_start}–{c.happy_hour_end}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.max_uses > 0 && <span>{c.uses}/{c.max_uses} uses</span>}
                    {c.verify_note && <span className="text-orange-400">{c.verify_note}</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.code)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Settings ──────────────────────────────────────────────────────────

export default function Settings() {
  const { config, refetch } = useTenant();
  const tenantId = config?.tenant_id;
  const [saving, setSaving] = useState(false);

  // Local copies of each section
  const [general, setGeneral] = useState({
    brand_name: "", business_address: "", business_city: "", business_state: "",
    business_country: "IN", business_phone: "", business_email: "", business_tax_id: "",
    business_website: "", currency_code: "INR", currency_symbol: "₹",
    timezone: "Asia/Kolkata", date_format: "DD/MM/YYYY", time_format: "HH:mm",
  });

  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState("");

  const [branding, setBranding] = useState({
    primary_color: "#4f46e5", secondary_color: "#7c3aed", accent_color: "#06b6d4",
    background_color: "#09090b", surface_color: "#18181b",
    font_heading: "Inter", font_body: "Inter",
    dark_mode_default: true, powered_by_visible: true,
    brand_logo_url: "", brand_favicon_url: "",
  });

  const [pos, setPos] = useState({
    default_session_rate: 100, session_inactivity_timeout: 30,
    student_discount_percent: 10, loyalty_enabled: true,
    loyalty_points_per_unit: 1, loyalty_redeem_threshold: 100,
    loyalty_unit_per_point: 1, enable_split_payment: true,
    enable_complimentary: true, enable_credit_payment: false,
  });

  const [booking, setBooking] = useState({
    booking_slot_duration_mins: 60, booking_advance_days: 7,
    booking_min_notice_hours: 2, booking_cancellation_hours: 24,
    booking_event_name: "Table Booking", booking_confirmation_msg: "",
  });

  const [receipt, setReceipt] = useState({
    receipt_template: "standard", receipt_show_logo: true,
    receipt_header_text: "", receipt_footer_text: "",
    receipt_show_tax_id: false, receipt_tax_label: "Tax",
  });

  const [notify, setNotify] = useState({
    notify_new_booking: true, notify_low_stock: true, low_stock_threshold: 5,
  });

  const [features, setFeatures] = useState({
    feature_tournaments: true, feature_bookings: true, feature_customer_portal: false,
    feature_ai_assistant: true, feature_staff_hr: true, feature_cash_management: true,
    feature_expenses: true, feature_investors: false, feature_how_to_use: true,
  });

  useEffect(() => {
    if (!config) return;
    setGeneral({
      brand_name: config.brand_name || "", business_address: config.business_address || "",
      business_city: config.business_city || "", business_state: config.business_state || "",
      business_country: config.business_country || "IN", business_phone: config.business_phone || "",
      business_email: config.business_email || "", business_tax_id: config.business_tax_id || "",
      business_website: config.business_website || "", currency_code: config.currency_code || "INR",
      currency_symbol: config.currency_symbol || "₹", timezone: config.timezone || "Asia/Kolkata",
      date_format: config.date_format || "DD/MM/YYYY", time_format: config.time_format || "HH:mm",
    });
    const ext = config.extended_config;
    let tStr = "";
    if (ext && typeof ext === "object" && "monthly_revenue_target" in ext) {
      const v = (ext as Record<string, unknown>).monthly_revenue_target;
      if (typeof v === "number" && v > 0) tStr = String(v);
    }
    setMonthlyRevenueTarget(tStr);
    setBranding({
      primary_color: config.primary_color || "#4f46e5",
      secondary_color: config.secondary_color || "#7c3aed",
      accent_color: config.accent_color || "#06b6d4",
      background_color: config.background_color || "#09090b",
      surface_color: config.surface_color || "#18181b",
      font_heading: config.font_heading || "Inter",
      font_body: config.font_body || "Inter",
      dark_mode_default: config.dark_mode_default ?? true,
      powered_by_visible: config.powered_by_visible ?? true,
      brand_logo_url: config.brand_logo_url || "",
      brand_favicon_url: config.brand_favicon_url || "",
    });
    setPos({
      default_session_rate: config.default_session_rate || 100,
      session_inactivity_timeout: config.session_inactivity_timeout || 30,
      student_discount_percent: config.student_discount_percent || 10,
      loyalty_enabled: config.loyalty_enabled ?? true,
      loyalty_points_per_unit: config.loyalty_points_per_unit || 1,
      loyalty_redeem_threshold: config.loyalty_redeem_threshold || 100,
      loyalty_unit_per_point: config.loyalty_unit_per_point || 1,
      enable_split_payment: config.enable_split_payment ?? true,
      enable_complimentary: config.enable_complimentary ?? true,
      enable_credit_payment: config.enable_credit_payment ?? false,
    });
    setBooking({
      booking_slot_duration_mins: config.booking_slot_duration_mins || 60,
      booking_advance_days: config.booking_advance_days || 7,
      booking_min_notice_hours: config.booking_min_notice_hours || 2,
      booking_cancellation_hours: config.booking_cancellation_hours || 24,
      booking_event_name: config.booking_event_name || "Table Booking",
      booking_confirmation_msg: config.booking_confirmation_msg || "",
    });
    setReceipt({
      receipt_template: config.receipt_template || "standard",
      receipt_show_logo: config.receipt_show_logo ?? true,
      receipt_header_text: config.receipt_header_text || "",
      receipt_footer_text: config.receipt_footer_text || "",
      receipt_show_tax_id: config.receipt_show_tax_id ?? false,
      receipt_tax_label: config.receipt_tax_label || "Tax",
    });
    setNotify({
      notify_new_booking: config.notify_new_booking ?? true,
      notify_low_stock: config.notify_low_stock ?? true,
      low_stock_threshold: config.low_stock_threshold || 5,
    });
    setFeatures({
      feature_tournaments: config.feature_tournaments ?? true,
      feature_bookings: config.feature_bookings ?? true,
      feature_customer_portal: config.feature_customer_portal ?? false,
      feature_ai_assistant: config.feature_ai_assistant ?? true,
      feature_staff_hr: config.feature_staff_hr ?? true,
      feature_cash_management: config.feature_cash_management ?? true,
      feature_expenses: config.feature_expenses ?? true,
      feature_investors: config.feature_investors ?? false,
      feature_how_to_use: config.feature_how_to_use ?? true,
    });
  }, [config?.tenant_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch: ConfigPatch) => {
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("tenant_config").update(patch).eq("tenant_id", tenantId);
    if (error) { toast.error(error.message); } else { toast.success("Settings saved"); await refetch(); }
    setSaving(false);
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Settings" description="Configure your club settings" />

      <Tabs defaultValue="General">
        <TabsList className="flex-wrap h-auto gap-1">
          {["General", "Branding", "POS & Sessions", "Bookings", "Receipts", "Notifications", "Features", "Staff", "Data"].map(t => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="General" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Club / Brand Name">
                <Input value={general.brand_name} onChange={e => setGeneral(f => ({ ...f, brand_name: e.target.value }))} />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Business Email"><Input type="email" value={general.business_email} onChange={e => setGeneral(f => ({ ...f, business_email: e.target.value }))} /></Field>
                <Field label="Business Phone"><Input value={general.business_phone} onChange={e => setGeneral(f => ({ ...f, business_phone: e.target.value }))} /></Field>
              </div>
              <Field label="Address"><Input value={general.business_address} onChange={e => setGeneral(f => ({ ...f, business_address: e.target.value }))} /></Field>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="City"><Input value={general.business_city} onChange={e => setGeneral(f => ({ ...f, business_city: e.target.value }))} /></Field>
                <Field label="State"><Input value={general.business_state} onChange={e => setGeneral(f => ({ ...f, business_state: e.target.value }))} /></Field>
                <Field label="Country"><Input value={general.business_country} onChange={e => setGeneral(f => ({ ...f, business_country: e.target.value }))} /></Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Tax ID / GST"><Input value={general.business_tax_id} onChange={e => setGeneral(f => ({ ...f, business_tax_id: e.target.value }))} /></Field>
                <Field label="Website"><Input value={general.business_website} onChange={e => setGeneral(f => ({ ...f, business_website: e.target.value }))} /></Field>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Currency Code"><Input value={general.currency_code} onChange={e => setGeneral(f => ({ ...f, currency_code: e.target.value }))} placeholder="INR" /></Field>
                <Field label="Currency Symbol"><Input value={general.currency_symbol} onChange={e => setGeneral(f => ({ ...f, currency_symbol: e.target.value }))} placeholder="₹" /></Field>
                <Field label="Monthly revenue target (optional)">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={monthlyRevenueTarget}
                    onChange={e => setMonthlyRevenueTarget(e.target.value)}
                    placeholder="e.g. 50000 — for Reports summary"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Drives the gaming/canteen progress card in Reports. Leave blank to hide the progress bar.</p>
                </Field>
                <Field label="Timezone">
                  <Select value={general.timezone} onValueChange={v => setGeneral(f => ({ ...f, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"].map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date Format">
                  <Select value={general.date_format} onValueChange={v => setGeneral(f => ({ ...f, date_format: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <SaveButton
                onClick={async () => {
                  if (!tenantId) return;
                  setSaving(true);
                  const prevExt =
                    config?.extended_config && typeof config.extended_config === "object"
                      ? { ...(config.extended_config as Record<string, unknown>) }
                      : {};
                  const raw = monthlyRevenueTarget.trim();
                  if (raw === "") delete prevExt.monthly_revenue_target;
                  else {
                    const n = parseFloat(raw);
                    if (!Number.isFinite(n) || n <= 0) delete prevExt.monthly_revenue_target;
                    else prevExt.monthly_revenue_target = n;
                  }

                  const { error } = await supabase
                    .from("tenant_config")
                    .update({ ...(general as ConfigPatch), extended_config: prevExt })
                    .eq("tenant_id", tenantId);
                  if (error) toast.error(error.message);
                  else {
                    toast.success("Settings saved");
                    await refetch();
                  }
                  setSaving(false);
                }}
                saving={saving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRANDING */}
        <TabsContent value="Branding" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Branding & Theme</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Logo URL"><Input value={branding.brand_logo_url} onChange={e => setBranding(f => ({ ...f, brand_logo_url: e.target.value }))} placeholder="https://…" /></Field>
                <Field label="Favicon URL"><Input value={branding.brand_favicon_url} onChange={e => setBranding(f => ({ ...f, brand_favicon_url: e.target.value }))} placeholder="https://…" /></Field>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ["Primary Color", "primary_color"],
                  ["Secondary Color", "secondary_color"],
                  ["Accent Color", "accent_color"],
                  ["Background Color", "background_color"],
                  ["Surface Color", "surface_color"],
                ].map(([label, key]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={(branding as any)[key]} onChange={e => setBranding(f => ({ ...f, [key]: e.target.value }))} className="h-9 w-12 rounded border border-border cursor-pointer" />
                      <Input value={(branding as any)[key]} onChange={e => setBranding(f => ({ ...f, [key]: e.target.value }))} className="flex-1 font-mono" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Heading Font"><Input value={branding.font_heading} onChange={e => setBranding(f => ({ ...f, font_heading: e.target.value }))} /></Field>
                <Field label="Body Font"><Input value={branding.font_body} onChange={e => setBranding(f => ({ ...f, font_body: e.target.value }))} /></Field>
              </div>
              <Toggle label="Dark Mode by Default" checked={branding.dark_mode_default} onChange={v => setBranding(f => ({ ...f, dark_mode_default: v }))} />
              <Toggle label="Show 'Powered by Cuetronix'" checked={branding.powered_by_visible} onChange={v => setBranding(f => ({ ...f, powered_by_visible: v }))} />
              <SaveButton onClick={() => save(branding as ConfigPatch)} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS & SESSIONS */}
        <TabsContent value="POS & Sessions" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">POS & Session Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Default Session Rate (per hour)">
                  <Input type="number" min="0" value={pos.default_session_rate} onChange={e => setPos(f => ({ ...f, default_session_rate: parseFloat(e.target.value) || 0 }))} />
                </Field>
                <Field label="Inactivity Timeout (minutes)">
                  <Input type="number" min="1" value={pos.session_inactivity_timeout} onChange={e => setPos(f => ({ ...f, session_inactivity_timeout: parseInt(e.target.value) || 30 }))} />
                </Field>
                <Field label="Student Discount (%)">
                  <Input type="number" min="0" max="100" value={pos.student_discount_percent} onChange={e => setPos(f => ({ ...f, student_discount_percent: parseInt(e.target.value) || 0 }))} />
                </Field>
              </div>
              <Separator />
              <p className="text-sm font-medium">Loyalty Program</p>
              <Toggle label="Enable Loyalty Points" checked={pos.loyalty_enabled} onChange={v => setPos(f => ({ ...f, loyalty_enabled: v }))} />
              {pos.loyalty_enabled && (
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Points per ₹1 spent"><Input type="number" min="0" step="0.1" value={pos.loyalty_points_per_unit} onChange={e => setPos(f => ({ ...f, loyalty_points_per_unit: parseFloat(e.target.value) || 0 }))} /></Field>
                  <Field label="Min points to redeem"><Input type="number" min="0" value={pos.loyalty_redeem_threshold} onChange={e => setPos(f => ({ ...f, loyalty_redeem_threshold: parseInt(e.target.value) || 0 }))} /></Field>
                  <Field label="₹ value per point"><Input type="number" min="0" step="0.1" value={pos.loyalty_unit_per_point} onChange={e => setPos(f => ({ ...f, loyalty_unit_per_point: parseFloat(e.target.value) || 0 }))} /></Field>
                </div>
              )}
              <Separator />
              <p className="text-sm font-medium">Payment Options</p>
              <Toggle label="Enable Split Payment" checked={pos.enable_split_payment} onChange={v => setPos(f => ({ ...f, enable_split_payment: v }))} />
              <Toggle label="Enable Complimentary Billing" checked={pos.enable_complimentary} onChange={v => setPos(f => ({ ...f, enable_complimentary: v }))} />
              <Toggle label="Enable Credit Payment" desc="Allow customers to pay on credit" checked={pos.enable_credit_payment} onChange={v => setPos(f => ({ ...f, enable_credit_payment: v }))} />
              <SaveButton onClick={() => save(pos as ConfigPatch)} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOOKINGS */}
        <TabsContent value="Bookings" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Online Booking Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Booking Event Name"><Input value={booking.booking_event_name} onChange={e => setBooking(f => ({ ...f, booking_event_name: e.target.value }))} /></Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Slot Duration (minutes)"><Input type="number" min="15" step="15" value={booking.booking_slot_duration_mins} onChange={e => setBooking(f => ({ ...f, booking_slot_duration_mins: parseInt(e.target.value) || 60 }))} /></Field>
                <Field label="Advance Booking Days"><Input type="number" min="1" value={booking.booking_advance_days} onChange={e => setBooking(f => ({ ...f, booking_advance_days: parseInt(e.target.value) || 7 }))} /></Field>
                <Field label="Minimum Notice (hours)"><Input type="number" min="0" value={booking.booking_min_notice_hours} onChange={e => setBooking(f => ({ ...f, booking_min_notice_hours: parseInt(e.target.value) || 2 }))} /></Field>
                <Field label="Cancellation Cutoff (hours)"><Input type="number" min="0" value={booking.booking_cancellation_hours} onChange={e => setBooking(f => ({ ...f, booking_cancellation_hours: parseInt(e.target.value) || 24 }))} /></Field>
              </div>
              <Field label="Confirmation Message">
                <Textarea value={booking.booking_confirmation_msg} onChange={e => setBooking(f => ({ ...f, booking_confirmation_msg: e.target.value }))} rows={3} placeholder="Message sent to customers after booking confirmation…" />
              </Field>
              <SaveButton onClick={() => save(booking as ConfigPatch)} saving={saving} />
            </CardContent>
          </Card>

          {/* Coupons */}
          <CouponsCard tenantId={tenantId || ""} initialCoupons={(config?.booking_coupons || []) as BookingCoupon[]} onSaved={refetch} sym={config?.currency_symbol || "₹"} />
        </TabsContent>

        {/* RECEIPTS */}
        <TabsContent value="Receipts" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Receipt Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Receipt Template">
                <Select value={receipt.receipt_template} onValueChange={v => setReceipt(f => ({ ...f, receipt_template: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Receipt Header Text">
                <Textarea value={receipt.receipt_header_text} onChange={e => setReceipt(f => ({ ...f, receipt_header_text: e.target.value }))} rows={2} placeholder="e.g. Thank you for visiting!" />
              </Field>
              <Field label="Receipt Footer Text">
                <Textarea value={receipt.receipt_footer_text} onChange={e => setReceipt(f => ({ ...f, receipt_footer_text: e.target.value }))} rows={2} placeholder="e.g. Visit again soon!" />
              </Field>
              <Field label="Tax Label"><Input value={receipt.receipt_tax_label} onChange={e => setReceipt(f => ({ ...f, receipt_tax_label: e.target.value }))} placeholder="Tax / GST / VAT" /></Field>
              <Toggle label="Show Logo on Receipt" checked={receipt.receipt_show_logo} onChange={v => setReceipt(f => ({ ...f, receipt_show_logo: v }))} />
              <Toggle label="Show Tax ID on Receipt" checked={receipt.receipt_show_tax_id} onChange={v => setReceipt(f => ({ ...f, receipt_show_tax_id: v }))} />
              <SaveButton onClick={() => save(receipt as ConfigPatch)} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="Notifications" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Toggle label="Notify on New Booking" desc="Receive alerts when customers book online" checked={notify.notify_new_booking} onChange={v => setNotify(f => ({ ...f, notify_new_booking: v }))} />
              <Toggle label="Notify on Low Stock" desc="Get alerts when products run low" checked={notify.notify_low_stock} onChange={v => setNotify(f => ({ ...f, notify_low_stock: v }))} />
              {notify.notify_low_stock && (
                <div className="pl-6">
                  <Field label="Low Stock Threshold">
                    <Input type="number" min="1" value={notify.low_stock_threshold} onChange={e => setNotify(f => ({ ...f, low_stock_threshold: parseInt(e.target.value) || 5 }))} className="max-w-xs" />
                  </Field>
                </div>
              )}
              <SaveButton onClick={() => save(notify as ConfigPatch)} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURES */}
        <TabsContent value="Features" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Feature Flags</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Toggle label="Tournaments" desc="Enable tournament management" checked={features.feature_tournaments} onChange={v => setFeatures(f => ({ ...f, feature_tournaments: v }))} />
              <Toggle label="Online Bookings" desc="Allow customers to book tables online" checked={features.feature_bookings} onChange={v => setFeatures(f => ({ ...f, feature_bookings: v }))} />
              <Toggle label="Customer Portal" desc="Let customers manage their profile and bookings" checked={features.feature_customer_portal} onChange={v => setFeatures(f => ({ ...f, feature_customer_portal: v }))} />
              <Toggle label="AI Assistant" desc="Enable Gemini AI chat assistant" checked={features.feature_ai_assistant} onChange={v => setFeatures(f => ({ ...f, feature_ai_assistant: v }))} />
              <Toggle label="Staff HR" desc="Staff attendance, leave, and payroll" checked={features.feature_staff_hr} onChange={v => setFeatures(f => ({ ...f, feature_staff_hr: v }))} />
              <Toggle label="Cash Management" desc="Vault balance and cash flow tracking" checked={features.feature_cash_management} onChange={v => setFeatures(f => ({ ...f, feature_cash_management: v }))} />
              <Toggle label="Expenses" desc="Track and manage club expenses" checked={features.feature_expenses} onChange={v => setFeatures(f => ({ ...f, feature_expenses: v }))} />
              <Toggle label="Investors" desc="Investment partners and ROI tracking" checked={features.feature_investors} onChange={v => setFeatures(f => ({ ...f, feature_investors: v }))} />
              <Toggle label="How to Use Guide" desc="FAQ and help guide for staff" checked={features.feature_how_to_use} onChange={v => setFeatures(f => ({ ...f, feature_how_to_use: v }))} />
              <SaveButton onClick={() => save(features as ConfigPatch)} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* STAFF */}
        <TabsContent value="Staff" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Staff & HR Settings</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">Manage your team from the Staff Management page. You can invite staff, change roles, and manage attendance from there.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">Staff Management</p>
                    <p className="text-xs text-muted-foreground">Invite staff, manage roles and access</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/staff-management"}>Go to Staff</Button>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">Staff Portal</p>
                    <p className="text-xs text-muted-foreground">Attendance, schedules, leave requests</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/staff-portal"}>Go to Portal</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA */}
        <TabsContent value="Data" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Data Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                <p className="text-sm font-medium">Export Data</p>
                <p className="text-xs text-muted-foreground mt-1">Download your club data as CSV files</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Customers", "Products", "Bills", "Expenses", "Bookings"].map(label => (
                    <Button key={label} variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => toast.info(`${label} export — coming soon`)}>
                      Export {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="text-sm font-medium text-destructive">Danger Zone</p>
                <p className="text-xs text-muted-foreground mt-1">These actions are irreversible</p>
                <Button variant="outline" size="sm" className="mt-3 h-7 text-xs border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => toast.error("Please contact support to delete your account")}>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
