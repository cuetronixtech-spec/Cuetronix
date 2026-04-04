import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const SignIn = () => {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) { toast.error(error.message); return; }
    navigate("/dashboard");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { toast.error(error.message); setGoogleLoading(false); }
  };

  return (
    <AuthShell backTo="/" backLabel="Home">
      <div className="space-y-6">
        {/* Header */}
        <div className="auth-fade-1 space-y-1.5">
          <h1 className="text-[26px] font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Sign in to your club workspace
          </p>
        </div>

        {/* Google */}
        <div className="auth-fade-2">
          <Button
            variant="outline"
            className="w-full border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            type="button"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>
        </div>

        <div className="auth-fade-3 relative">
          <Separator className="bg-white/10" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
            or
          </span>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="auth-fade-4 space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-foreground/80">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@myclubname.com"
              autoComplete="email"
              className="h-11 border-white/10 bg-white/[0.03] text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-medium text-foreground/80">
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-[12px] font-medium text-primary/80 transition-colors hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
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
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            className="h-11 w-full text-[14px] font-semibold shadow-lg shadow-primary/20"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="auth-fade-4 text-center text-[13px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            Start free trial
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default SignIn;
