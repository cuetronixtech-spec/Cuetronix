import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { appMeta, loading: authLoading } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  // Once AuthContext processes the sign-in and confirms role=super_admin, navigate
  useEffect(() => {
    if (!authLoading && appMeta.role === "super_admin") {
      navigate("/super-admin", { replace: true });
    }
  }, [appMeta.role, authLoading, navigate]);

  const onSubmit = async (data: Form) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) { toast.error(error.message); return; }

    // Verify role from the JWT — if not super_admin, sign out immediately
    const { data: { session } } = await supabase.auth.getSession();
    let role: string | undefined;
    try {
      const token = session?.access_token;
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        role = payload?.app_metadata?.role;
      }
    } catch { /* fallback to useEffect */ }

    if (role !== "super_admin") {
      await supabase.auth.signOut();
      toast.error("Access denied. You are not a super admin.");
    }
    // If role IS super_admin, the useEffect above handles navigation
    // once AuthContext picks up the new session from onAuthStateChange
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Cuetronix platform administration</p>
        </div>
        <Card className="border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Super admin access only</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="admin@cuetronix.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in…</> : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
