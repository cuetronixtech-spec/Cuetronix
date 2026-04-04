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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    if (error) {
      toast.error(error.message);
      return;
    }
    setSentTo(data.email.trim());
    toast.success("Check your inbox for the reset link.");
  };

  if (sentTo) {
    return (
      <AuthShell>
        <Card className="border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-2 text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/25">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-balance">
              If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we sent a link
              to set a new password. It may take a minute to arrive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-lg border border-white/5 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
              Add <span className="font-mono text-foreground/90">{window.location.origin}/reset-password</span> to
              Supabase Authentication → URL configuration → Redirect URLs if the link does not work.
            </p>
            <Button variant="outline" className="w-full border-white/10 bg-white/[0.03]" asChild>
              <Link to="/signin">Back to sign in</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setSentTo(null)}
            >
              Use a different email
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
          <CardTitle className="text-xl font-semibold tracking-tight">Forgot password</CardTitle>
          <CardDescription>We&apos;ll email you a secure link to choose a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@myclubname.com"
                autoComplete="email"
                className="border-white/10 bg-background/50"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button className="w-full shadow-lg shadow-primary/25" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send reset link"
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

export default ForgotPassword;
