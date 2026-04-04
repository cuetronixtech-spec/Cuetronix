import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setReady(true);
      if (!session) setNoSession(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You can sign in with your new password.");
    await supabase.auth.signOut();
    navigate("/signin", { replace: true });
  };

  if (!ready) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
        </div>
      </AuthShell>
    );
  }

  if (noSession) {
    return (
      <AuthShell>
        <Card className="border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Link expired or invalid</CardTitle>
            <CardDescription>
              Open the reset link from your email again, or request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request new link</Link>
            </Button>
            <Button variant="outline" asChild className="w-full border-white/10 bg-white/[0.03]">
              <Link to="/signin">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-2 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight">Choose a new password</CardTitle>
          <CardDescription>Use a strong password you have not used elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
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
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="border-white/10 bg-background/50 pr-10"
                  {...register("confirm")}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-destructive">{errors.confirm.message}</p>
              )}
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/signin" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default ResetPassword;
