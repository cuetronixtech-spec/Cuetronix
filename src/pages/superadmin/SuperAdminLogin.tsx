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

export const SA_FLAG = "_cuetronix_sa";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [saVerified, setSaVerified] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  // Navigate once AuthContext has the session AND we've verified SA status
  useEffect(() => {
    if (saVerified && !authLoading && session) {
      navigate("/super-admin", { replace: true });
    }
  }, [saVerified, authLoading, session, navigate]);

  const onSubmit = async (data: Form) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) { toast.error(error.message); return; }

    // Verify super admin via the superadmins table (RLS policy allows self-select)
    const { data: sa } = await supabase
      .from("superadmins")
      .select("id, is_active")
      .eq("id", authData.user!.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!sa) {
      await supabase.auth.signOut();
      toast.error("Access denied. You are not a super admin.");
      return;
    }

    // Persist flag so RequireSuperAdmin guard can verify without async DB call
    sessionStorage.setItem(SA_FLAG, "1");
    setSaVerified(true);
    // useEffect above will navigate once session propagates into AuthContext
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
