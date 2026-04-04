import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CheckCircle2, XCircle, Loader2, Mail, Eye, EyeOff } from "lucide-react";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  yourName: z.string().min(2, "Enter your name (min 2 characters)"),
  clubName: z.string().min(2, "Enter your club or business name"),
  slug: z
    .string()
    .min(3, "Minimum 3 characters")
    .max(30, "Maximum 30 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  country: z.string().min(2, "Select your country"),
});

type FormData = z.infer<typeof schema>;

// ─── Country list ─────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "IN", name: "🇮🇳  India" },
  { code: "US", name: "🇺🇸  United States" },
  { code: "GB", name: "🇬🇧  United Kingdom" },
  { code: "AU", name: "🇦🇺  Australia" },
  { code: "CA", name: "🇨🇦  Canada" },
  { code: "AE", name: "🇦🇪  UAE" },
  { code: "SG", name: "🇸🇬  Singapore" },
  { code: "ZA", name: "🇿🇦  South Africa" },
  { code: "EU", name: "🇪🇺  Europe (EUR)" },
  { code: "OTHER", name: "🌍  Other" },
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

// ─── Pending tenant key ───────────────────────────────────────────────────────

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
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "IN" },
  });

  const watchedSlug = watch("slug");

  // Debounced slug availability check
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

  // ── Google OAuth sign-up ──────────────────────────────────────────────────

  const handleGoogleSignUp = async () => {
    const { clubName, slug, country, yourName } = getValues();

    if (!clubName || clubName.length < 2) {
      toast.error("Please fill in your club name first.");
      return;
    }
    if (!slug || slug.length < 3) {
      toast.error("Please choose a club URL first.");
      return;
    }
    if (slugStatus === "taken") {
      toast.error("That URL is already taken — pick another.");
      return;
    }
    if (slugStatus === "checking") {
      toast.info("Checking URL availability, please wait a moment…");
      return;
    }

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
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
      sessionStorage.removeItem(PENDING_TENANT_KEY);
    }
  };

  // ── Email + password submit ───────────────────────────────────────────────

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
      options: { data: { full_name: data.yourName } },
    });

    if (authError) {
      sessionStorage.removeItem(PENDING_TENANT_KEY);
      toast.error(authError.message);
      return;
    }

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

  // ── Email sent screen ─────────────────────────────────────────────────────

  if (emailSent) {
    return (
      <AuthShell>
        <Card className="border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-xl text-center">
            <CardContent className="pt-10 pb-8 px-8 space-y-5">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Check your inbox</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-foreground">{emailSent}</span>.
                  Click it to verify your email and finish creating your club.
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                <p>The link expires in <span className="font-medium text-foreground">24 hours</span>.</p>
                <p>Don't see it? Check your spam folder.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={async () => {
                const { error } = await supabase.auth.resend({
                  type: "signup", email: emailSent,
                  options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
                });
                if (error) toast.error(error.message);
                else toast.success("Confirmation email resent!");
              }}>
                Resend confirmation email
              </Button>
              <p className="text-xs text-muted-foreground">
                Wrong email?{" "}
                <button className="underline text-primary" onClick={() => {
                  sessionStorage.removeItem(PENDING_TENANT_KEY); setEmailSent(null);
                }}>
                  Go back
                </button>
              </p>
            </CardContent>
          </Card>
      </AuthShell>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <AuthShell>
      <Card className="border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-2 text-center">
            <CardTitle className="text-xl font-semibold tracking-tight">Create your club</CardTitle>
            <CardDescription>14-day free trial — no credit card required</CardDescription>
          </CardHeader>

          <CardContent className="pt-2 space-y-4">
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </Button>

            <div className="relative">
              <Separator className="bg-white/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or fill in details below
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Your Name */}
              <div className="space-y-1.5">
                <Label htmlFor="yourName">Your Name</Label>
                <Input id="yourName" placeholder="Alex Kumar" autoComplete="name" {...register("yourName")} />
                {errors.yourName && <p className="text-xs text-destructive">{errors.yourName.message}</p>}
              </div>

              {/* Club Name */}
              <div className="space-y-1.5">
                <Label htmlFor="clubName">Club / Business Name</Label>
                <Input id="clubName" placeholder="The Snooker Club" {...register("clubName", { onChange: handleClubNameChange })} />
                {errors.clubName && <p className="text-xs text-destructive">{errors.clubName.message}</p>}
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="slug">Club URL</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">cuetronix.com /</span>
                  <div className="relative flex-1">
                    <Input id="slug" placeholder="my-club" className="pr-7" {...register("slug")} />
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                      {slugStatus === "checking" && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
                      {slugStatus === "available" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {slugStatus === "taken" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                  </div>
                </div>
                {slugStatus === "taken" && <p className="text-xs text-destructive">Slug already taken — try another</p>}
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select defaultValue="IN" onValueChange={(v) => setValue("country", v)}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@myclubname.com" autoComplete="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    autoComplete="new-password"
                    className="border-white/10 bg-background/50 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button className="w-full shadow-lg shadow-primary/25" type="submit" disabled={isSubmitting || slugStatus === "taken"}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating your club…</> : "Start Free Trial"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By signing up you agree to our{" "}
                <Link to="/terms-and-conditions" className="text-primary hover:underline">Terms</Link>{" "}and{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>

            <p className="mt-1 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
    </AuthShell>
  );
};

export default SignUp;
