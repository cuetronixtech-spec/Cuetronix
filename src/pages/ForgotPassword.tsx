import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

const ForgotPassword = () => {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    setSentTo(data.email.trim());
    toast.success("Check your inbox for the reset link.");
  };

  if (sentTo) {
    return (
      <AuthShell backTo="/signin" backLabel="Sign in">
        <div className="space-y-6 text-center">
          <div className="auth-fade-1 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="auth-fade-2 space-y-2">
            <h1 className="text-xl font-semibold text-white">Check your email</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{sentTo}</span>,
              we sent a link to set a new password. It may take a minute.
            </p>
          </div>
          <div className="auth-fade-3">
            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              asChild
            >
              <Link to="/signin">Back to sign in</Link>
            </Button>
          </div>
          <button
            className="auth-fade-4 text-[13px] font-medium text-primary hover:underline"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell backTo="/signin" backLabel="Sign in">
      <div className="space-y-6">
        <div className="auth-fade-1 space-y-1.5">
          <h1 className="text-[26px] font-semibold tracking-tight text-white">Forgot password</h1>
          <p className="text-[14px] text-muted-foreground">
            We&apos;ll email you a secure link to choose a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-fade-2 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email" className="text-[13px] font-medium text-foreground/80">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="admin@myclubname.com"
              autoComplete="email"
              className="h-11 border-white/10 bg-white/[0.03] text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button
            className="h-11 w-full text-[14px] font-semibold shadow-lg shadow-primary/20"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <p className="auth-fade-3 text-center text-[13px] text-muted-foreground">
          Remember your password?{" "}
          <Link to="/signin" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
