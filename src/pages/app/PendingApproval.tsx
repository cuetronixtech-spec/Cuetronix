import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/context/TenantContext";

const steps = [
  "Reviewing your club details",
  "Setting up your workspace",
  "Populating sample data",
  "Configuring your sandbox",
];

export default function PendingApproval() {
  const navigate = useNavigate();
  const { config, loading, refetch } = useTenant();
  const [checking, setChecking] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  // Animate through the steps for visual interest
  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // Auto-poll every 12 seconds
  useEffect(() => {
    const t = setInterval(async () => {
      await refetch();
    }, 12000);
    return () => clearInterval(t);
  }, [refetch]);

  // Once approved, redirect to dashboard
  useEffect(() => {
    if (!loading && config?.is_approved) {
      navigate("/dashboard", { replace: true });
    }
  }, [config?.is_approved, loading, navigate]);

  const handleCheck = async () => {
    setChecking(true);
    await refetch();
    setChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div>
          <span className="text-3xl font-bold text-primary tracking-tight">Cuetronix</span>
          <p className="text-sm text-muted-foreground mt-1">Club Management Platform</p>
        </div>

        {/* Central illustration */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <div className="absolute h-36 w-36 rounded-full border-2 border-primary/20 animate-ping" />
          <div className="absolute h-28 w-28 rounded-full border border-primary/30 animate-pulse" />
          {/* Icon */}
          <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center z-10">
            <Sparkles className="h-9 w-9 text-primary" />
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Setting up your sandbox</h1>
          <p className="text-muted-foreground leading-relaxed">
            Our team is reviewing your account and populating it with sample data so you can
            explore every feature. This usually takes just a few minutes.
          </p>
        </div>

        {/* Animated step list */}
        <div className="bg-muted/30 rounded-xl border border-border/50 p-5 text-left space-y-3">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center transition-all duration-500 ${
                i < stepIdx
                  ? "bg-primary/20 text-primary"
                  : i === stepIdx
                  ? "border-2 border-primary border-t-transparent animate-spin"
                  : "border border-border"
              }`}>
                {i < stepIdx && <CheckCircle2 className="h-3 w-3" />}
              </div>
              <span className={`text-sm transition-colors ${
                i === stepIdx ? "text-foreground font-medium" : i < stepIdx ? "text-muted-foreground line-through" : "text-muted-foreground/50"
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleCheck}
            disabled={checking || loading}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(checking || loading) ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check activation status"}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Auto-checks every 12 seconds</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Questions?{" "}
          <a href="mailto:support@cuetronix.com" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
