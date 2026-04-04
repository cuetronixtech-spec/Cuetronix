import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[0-9]/, "One number"),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

type FormData = z.infer<typeof schema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [noSession, setNoSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 400));
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setReady(true);
      if (!session) setNoSession(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. You can sign in with your new password.");
    await supabase.auth.signOut();
    navigate("/signin", { replace: true });
  };

  if (!ready) {
    return (
      <AuthShell backTo="/signin" backLabel="Sign in">
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
        </div>
      </AuthShell>
    );
  }

  if (noSession) {
    return (
      <AuthShell backTo="/signin" backLabel="Sign in">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-white">Link expired or invalid</h1>
            <p className="text-sm text-muted-foreground">
              Open the reset link from your email again, or request a new one.
            </p>
          </div>
          <Button className="w-full" asChild>
            <Link to="/forgot-password">Request new link</Link>
          </Button>
          <Button variant="outline" className="w-full border-white/10 bg-white/[0.03]" asChild>
            <Link to="/signin">Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell backTo="/signin" backLabel="Sign in">
      <div className="space-y-6">
        <div className="auth-fade-1 space-y-1.5">
          <h1 className="text-[26px] font-semibold tracking-tight text-white">New password</h1>
          <p className="text-[14px] text-muted-foreground">
            Use a strong password you haven&apos;t used elsewhere.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-fade-2 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="reset-pw" className="text-[13px] font-medium text-foreground/80">New password</Label>
            <div className="relative">
              <Input
                id="reset-pw"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 border-white/10 bg-white/[0.03] pr-11 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                {...register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm" className="text-[13px] font-medium text-foreground/80">Confirm password</Label>
            <div className="relative">
              <Input
                id="reset-confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 border-white/10 bg-white/[0.03] pr-11 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                {...register("confirm")}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>

          <Button
            className="h-11 w-full text-[14px] font-semibold shadow-lg shadow-primary/20"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</>
            ) : (
              "Update password"
            )}
          </Button>
        </form>

        <p className="auth-fade-3 text-center text-[13px] text-muted-foreground">
          <Link to="/signin" className="font-semibold text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
