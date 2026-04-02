import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

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

// ─── Country list (matches Appendix A of PRD) ─────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

// Pending tenant data stored in sessionStorage until email is confirmed
interface PendingTenant {
  slug: string;
  clubName: string;
  country: string;
  email: string;
  yourName: string;
}

export const PENDING_TENANT_KEY = "cuetronix_pending_tenant";

const SignUp = () => {
  const navigate = useNavigate();
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "IN" },
  });

  const watchedSlug = watch("slug");

  // Debounced slug availability check
  useEffect(() => {
    if (!watchedSlug || watchedSlug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("check_slug_available", {
        p_slug: watchedSlug,
      });
      setSlugStatus(data ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedSlug]);

  const handleClubNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("slug", toSlug(e.target.value), { shouldValidate: false });
    setSlugStatus("idle");
  };

  const onSubmit = async (data: FormData) => {
    if (slugStatus === "taken") {
      toast.error("That slug is already taken — choose a different one.");
      return;
    }

    // Save pending tenant data so AuthCallback can create it after confirmation
    const pending: PendingTenant = {
      slug: data.slug,
      clubName: data.clubName,
      country: data.country,
      email: data.email,
      yourName: data.yourName,
    };
    sessionStorage.setItem(PENDING_TENANT_KEY, JSON.stringify(pending));

    // 1. Create Supabase auth user; redirectTo ensures the confirmation link
    //    lands back on our /auth/callback route (works on any domain).
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.yourName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      sessionStorage.removeItem(PENDING_TENANT_KEY);
      toast.error(authError.message);
      return;
    }

    // session is null  → email confirmation is required (Supabase default)
    // session is set   → auto-confirm is on, we can create the tenant now
    if (!authData.session) {
      setEmailSent(data.email);
      return;
    }

    // Auto-confirm path: create tenant immediately
    await finishTenantCreation(pending);
  };

  const finishTenantCreation = async (pending: PendingTenant) => {
    const { error: tenantError } = await supabase.rpc("create_tenant", {
      p_slug: pending.slug,
      p_name: pending.clubName,
      p_country: pending.country,
      p_owner_email: pending.email,
    });

    if (tenantError) {
      toast.error(
        tenantError.message || "Failed to create club workspace. Please contact support."
      );
      return;
    }

    sessionStorage.removeItem(PENDING_TENANT_KEY);
    await supabase.auth.refreshSession();
    toast.success(`Welcome to Cuetronix, ${pending.yourName}! Let's set up your club.`);
    navigate("/onboarding");
  };

  // ── Email sent screen ────────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-3xl font-bold text-primary tracking-tight">Cuetronix</span>
            <p className="text-sm text-muted-foreground mt-1">Club Management Platform</p>
          </div>
          <Card className="border-border/50 shadow-2xl shadow-primary/5 text-center">
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
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const { error } = await supabase.auth.resend({
                    type: "signup",
                    email: emailSent,
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
                  className="underline text-primary"
                  onClick={() => {
                    sessionStorage.removeItem(PENDING_TENANT_KEY);
                    setEmailSent(null);
                  }}
                >
                  Go back
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <span className="text-3xl font-bold text-primary tracking-tight">
            Cuetronix
          </span>
          <p className="text-sm text-muted-foreground mt-1">
            Club Management Platform
          </p>
        </div>

        <Card className="border-border/50 shadow-2xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Create your club</CardTitle>
            <CardDescription>
              14-day free trial — no credit card required
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Your Name */}
              <div className="space-y-1.5">
                <Label htmlFor="yourName">Your Name</Label>
                <Input
                  id="yourName"
                  placeholder="Alex Kumar"
                  autoComplete="name"
                  {...register("yourName")}
                />
                {errors.yourName && (
                  <p className="text-xs text-destructive">{errors.yourName.message}</p>
                )}
              </div>

              {/* Club Name → auto-generates slug */}
              <div className="space-y-1.5">
                <Label htmlFor="clubName">Club / Business Name</Label>
                <Input
                  id="clubName"
                  placeholder="The Snooker Club"
                  {...register("clubName", { onChange: handleClubNameChange })}
                />
                {errors.clubName && (
                  <p className="text-xs text-destructive">{errors.clubName.message}</p>
                )}
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="slug">Club URL</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    cuetronix.com /
                  </span>
                  <div className="relative flex-1">
                    <Input
                      id="slug"
                      placeholder="my-club"
                      className="pr-7"
                      {...register("slug")}
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                      {slugStatus === "checking" && (
                        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                      )}
                      {slugStatus === "available" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                      {slugStatus === "taken" && (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
                {slugStatus === "taken" && (
                  <p className="text-xs text-destructive">Slug already taken — try another</p>
                )}
                {errors.slug && (
                  <p className="text-xs text-destructive">{errors.slug.message}</p>
                )}
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select
                  defaultValue="IN"
                  onValueChange={(v) => setValue("country", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-xs text-destructive">{errors.country.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@myclubname.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={isSubmitting || slugStatus === "taken"}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your club…
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By signing up you agree to our{" "}
                <Link to="/terms-and-conditions" className="text-primary hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
