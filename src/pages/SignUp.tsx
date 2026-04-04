import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, Loader2, Mail, Eye, EyeOff, ArrowRight,
  Monitor, CalendarDays, Users, Shield, BarChart3, Trophy, Package, Bot,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  yourName: z.string().min(2, "Enter your name (min 2 characters)"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  clubName: z.string().min(2, "Enter your club or business name"),
  slug: z
    .string()
    .min(3, "Minimum 3 characters")
    .max(30, "Maximum 30 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  country: z.string().min(2, "Select your country"),
});

type FormData = z.infer<typeof schema>;

// ─── Data ─────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "AE", name: "UAE" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "EU", name: "Europe (EUR)" },
  { code: "OTHER", name: "Other" },
];

const INTERESTS = [
  { id: "sessions", label: "Sessions & POS", icon: Monitor, desc: "Real-time billing & timers" },
  { id: "bookings", label: "Bookings", icon: CalendarDays, desc: "Online reservations" },
  { id: "customers", label: "Customers & Loyalty", icon: Users, desc: "CRM & rewards engine" },
  { id: "staff", label: "Staff Management", icon: Shield, desc: "Roles, shifts & leave" },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3, desc: "Revenue insights" },
  { id: "tournaments", label: "Tournaments", icon: Trophy, desc: "Events & brackets" },
  { id: "inventory", label: "Inventory", icon: Package, desc: "Stock management" },
  { id: "ai", label: "AI Assistant", icon: Bot, desc: "Smart business advice" },
];

const STEPS = [
  { number: 1, label: "Account" },
  { number: 2, label: "Club" },
  { number: 3, label: "Personalize" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

// ─── Google icon ──────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ─── Pending tenant ───────────────────────────────────────────────────────────

interface PendingTenant {
  slug: string;
  clubName: string;
  country: string;
  email: string;
  yourName: string;
}

export const PENDING_TENANT_KEY = "cuetronix_pending_tenant";

// ─── Component ────────────────────────────────────────────────────────────────

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "IN" },
  });

  const watchedSlug = watch("slug");

  useEffect(() => {
    if (!watchedSlug || watchedSlug.length < 3) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("check_slug_available", { p_slug: watchedSlug });
      setSlugStatus(data ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedSlug]);

  const handleClubNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("slug", toSlug(e.target.value), { shouldValidate: false });
    setSlugStatus("idle");
  };

  const toggleInterest = (id: string) =>
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // ── Step navigation ─────────────────────────────────────────────────────

  const goNext = async () => {
    if (step === 1) {
      const ok = await trigger(["yourName", "email", "password"]);
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await trigger(["clubName", "slug", "country"]);
      if (ok && slugStatus !== "taken") setStep(3);
      else if (slugStatus === "taken") toast.error("That URL is already taken.");
    }
  };

  const goBack = () => { if (step > 1) setStep(step - 1); };

  // ── Google OAuth ────────────────────────────────────────────────────────

  const handleGoogleSignUp = async () => {
    const { clubName, slug, country, yourName } = getValues();
    if (!clubName || clubName.length < 2) { toast.error("Fill in your club name first."); return; }
    if (!slug || slug.length < 3) { toast.error("Choose a club URL first."); return; }
    if (slugStatus === "taken") { toast.error("That URL is taken — pick another."); return; }
    if (slugStatus === "checking") { toast.info("Checking URL, please wait…"); return; }

    const pending: PendingTenant = { slug, clubName, country: country || "IN", email: "", yourName: yourName || "" };
    sessionStorage.setItem(PENDING_TENANT_KEY, JSON.stringify(pending));

    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { toast.error(error.message); setGoogleLoading(false); sessionStorage.removeItem(PENDING_TENANT_KEY); }
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    if (slugStatus === "taken") { toast.error("That slug is already taken."); return; }

    const pending: PendingTenant = {
      slug: data.slug, clubName: data.clubName, country: data.country,
      email: data.email, yourName: data.yourName,
    };
    sessionStorage.setItem(PENDING_TENANT_KEY, JSON.stringify(pending));

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.yourName, interests } },
    });

    if (authError) { sessionStorage.removeItem(PENDING_TENANT_KEY); toast.error(authError.message); return; }
    if (!authData.session) { setEmailSent(data.email); return; }

    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });
    await finishTenantCreation(pending);
  };

  const finishTenantCreation = async (pending: PendingTenant) => {
    const { error } = await supabase.rpc("create_tenant", {
      p_slug: pending.slug, p_name: pending.clubName,
      p_country: pending.country, p_owner_email: pending.email,
    });
    if (error) { toast.error(error.message || "Failed to create club workspace."); return; }
    sessionStorage.removeItem(PENDING_TENANT_KEY);
    await supabase.auth.refreshSession();
    toast.success(`Welcome to Cuetronix, ${pending.yourName || ""}! Your account is being activated.`);
    navigate("/pending-approval");
  };

  // ── Email sent state ────────────────────────────────────────────────────

  if (emailSent) {
    return (
      <AuthShell backTo="/signin" backLabel="Sign in">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-white">Check your inbox</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{emailSent}</span>.
              Click it to verify your email and finish creating your club.
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4 text-xs text-muted-foreground ring-1 ring-white/[0.06]">
            <p>The link expires in <span className="font-medium text-foreground">24 hours</span>.</p>
            <p className="mt-1">Don&apos;t see it? Check your spam folder.</p>
          </div>
          <Button
            variant="outline"
            className="w-full border-white/10 bg-white/[0.03]"
            onClick={async () => {
              const { error } = await supabase.auth.resend({
                type: "signup", email: emailSent,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
              });
              if (error) toast.error(error.message);
              else toast.success("Confirmation email resent!");
            }}
          >
            Resend confirmation email
          </Button>
          <p className="text-xs text-muted-foreground">
            Wrong email?{" "}
            <button
              className="font-medium text-primary underline"
              onClick={() => { sessionStorage.removeItem(PENDING_TENANT_KEY); setEmailSent(null); setStep(1); }}
            >
              Go back
            </button>
          </p>
        </div>
      </AuthShell>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────

  return (
    <AuthShell backTo="/signin" backLabel="Sign in">
      <div className="space-y-7">
        {/* ── Step indicator ─────────────────────────────────────────── */}
        <div className="auth-fade-1 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  step > s.number
                    ? "bg-primary text-primary-foreground"
                    : step === s.number
                      ? "bg-primary/15 text-primary ring-2 ring-primary/40"
                      : "bg-white/[0.05] text-muted-foreground ring-1 ring-white/10",
                )}
              >
                {step > s.number ? <Check className="h-3.5 w-3.5" /> : s.number}
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-[2px] flex-1 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: step > s.number ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* ── Step 1: Account ────────────────────────────────────── */}
          {step === 1 && (
            <div className="step-enter space-y-5" key="step-1">
              <div className="space-y-1.5">
                <h1 className="text-[24px] font-semibold tracking-tight text-white">
                  Create your account
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  14-day free trial — no credit card required
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </Button>

              <div className="relative">
                <Separator className="bg-white/10" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                  or
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="yourName" className="text-[13px] font-medium text-foreground/80">Your name</Label>
                  <Input id="yourName" placeholder="Alex Kumar" autoComplete="name" className="h-11 border-white/10 bg-white/[0.03] text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40" {...register("yourName")} />
                  {errors.yourName && <p className="text-xs text-destructive">{errors.yourName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[13px] font-medium text-foreground/80">Email</Label>
                  <Input id="signup-email" type="email" placeholder="admin@myclubname.com" autoComplete="email" className="h-11 border-white/10 bg-white/[0.03] text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-[13px] font-medium text-foreground/80">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      className="h-11 border-white/10 bg-white/[0.03] pr-11 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
              </div>

              <Button
                type="button"
                className="h-11 w-full text-[14px] font-semibold shadow-lg shadow-primary/20"
                onClick={goNext}
              >
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>

              <p className="text-center text-[13px] text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── Step 2: Club setup ─────────────────────────────────── */}
          {step === 2 && (
            <div className="step-enter space-y-5" key="step-2">
              <div className="space-y-1.5">
                <h1 className="text-[24px] font-semibold tracking-tight text-white">
                  Set up your club
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  Tell us about your venue — you can change this later
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clubName" className="text-[13px] font-medium text-foreground/80">Club / business name</Label>
                  <Input id="clubName" placeholder="The Snooker Club" className="h-11 border-white/10 bg-white/[0.03] text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40" {...register("clubName", { onChange: handleClubNameChange })} />
                  {errors.clubName && <p className="text-xs text-destructive">{errors.clubName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-[13px] font-medium text-foreground/80">Club URL</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 whitespace-nowrap text-[12px] text-muted-foreground">cuetronix.com /</span>
                    <div className="relative flex-1">
                      <Input id="slug" placeholder="my-club" className="h-11 border-white/10 bg-white/[0.03] pr-8 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40" {...register("slug")} />
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        {slugStatus === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        {slugStatus === "available" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        {slugStatus === "taken" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                    </div>
                  </div>
                  {slugStatus === "taken" && <p className="text-xs text-destructive">URL already taken — try another</p>}
                  {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-foreground/80">Country</Label>
                  <Select defaultValue="IN" onValueChange={(v) => setValue("country", v)}>
                    <SelectTrigger className="h-11 border-white/10 bg-white/[0.03] text-[14px] focus:ring-primary/40">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 border-white/10 bg-white/[0.03] text-[14px] hover:bg-white/[0.06]"
                  onClick={goBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="h-11 flex-[2] text-[14px] font-semibold shadow-lg shadow-primary/20"
                  onClick={goNext}
                >
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Personalize ────────────────────────────────── */}
          {step === 3 && (
            <div className="step-enter space-y-5" key="step-3">
              <div className="space-y-1.5">
                <h1 className="text-[24px] font-semibold tracking-tight text-white">
                  Personalize your experience
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  Select the features you care about most — we&apos;ll tailor your dashboard
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {INTERESTS.map(({ id, label, icon: Icon, desc }) => {
                  const selected = interests.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleInterest(id)}
                      className={cn(
                        "group relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-200",
                        selected
                          ? "border-primary/50 bg-primary/[0.08] ring-1 ring-primary/30"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]",
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        selected ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground group-hover:text-foreground",
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={cn("text-[13px] font-semibold", selected ? "text-white" : "text-foreground/80")}>
                          {label}
                        </div>
                        <div className="text-[11px] leading-snug text-muted-foreground">{desc}</div>
                      </div>
                      {selected && (
                        <div className="absolute right-2 top-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                You can always enable more modules later in Settings
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 border-white/10 bg-white/[0.03] text-[14px] hover:bg-white/[0.06]"
                  onClick={goBack}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="h-11 flex-[2] text-[14px] font-semibold shadow-lg shadow-primary/20"
                  disabled={isSubmitting || slugStatus === "taken"}
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating your club…</>
                  ) : (
                    "Launch your club"
                  )}
                </Button>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                By signing up you agree to our{" "}
                <Link to="/terms-and-conditions" className="text-primary hover:underline">Terms</Link> and{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </div>
          )}
        </form>
      </div>
    </AuthShell>
  );
};

export default SignUp;
