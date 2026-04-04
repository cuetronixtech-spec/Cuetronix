import { Link } from "react-router-dom";
import { ArrowLeft, Cpu, Monitor, Users, BarChart3, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  variant?: "default" | "customer";
};

const PROOFS = [
  { icon: Monitor, text: "Real-time session & POS management" },
  { icon: Users, text: "Customer CRM & loyalty engine" },
  { icon: BarChart3, text: "Analytics, reports & AI insights" },
  { icon: Shield, text: "Multi-tenant isolation & RLS security" },
];

const STATS = [
  { value: "16+", label: "Modules" },
  { value: "99.9%", label: "Uptime" },
  { value: "3", label: "Gateways" },
];

export function AuthShell({
  children,
  backTo = "/",
  backLabel = "Home",
  variant = "default",
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Left branding panel (lg+) ──────────────────────────────────── */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[46%] xl:w-[44%]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #06020f 0%, #0d0522 35%, #110830 55%, #08031a 100%)",
          }}
        />
        <div className="absolute left-[15%] top-[20%] h-[420px] w-[420px] animate-mesh-a rounded-full bg-[hsl(262,83%,58%)] opacity-[0.07] blur-[140px]" />
        <div className="absolute bottom-[15%] right-[10%] h-[320px] w-[320px] animate-mesh-b rounded-full bg-[hsl(190,85%,48%)] opacity-[0.055] blur-[120px]" />
        <div className="absolute left-[40%] top-[55%] h-[240px] w-[240px] animate-mesh-c rounded-full bg-[hsl(262,70%,48%)] opacity-[0.04] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.35) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent 75%)",
          }}
        />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-9 xl:p-12">
          <Link
            to="/"
            className="group flex items-center gap-3 no-underline outline-none"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(190,85%,48%)] shadow-lg shadow-purple-600/25 ring-1 ring-white/10 transition-transform group-hover:scale-[1.04]">
              <Cpu className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-['Poppins',sans-serif] text-[18px] font-extrabold tracking-tight text-white">
              Cuetronix
            </span>
          </Link>

          <div className="space-y-8">
            <div>
              <h2
                className="gradient-text-animated font-['Poppins',sans-serif] text-[clamp(1.7rem,2.6vw,2.5rem)] font-extrabold leading-[1.15] tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #f0eeff 0%, #c4b5fd 40%, #67e8f9 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {variant === "customer"
                  ? "Your club experience, all in one place"
                  : "The operating system for modern gaming clubs"}
              </h2>
              <p className="mt-4 max-w-[340px] text-[14px] leading-relaxed text-[hsl(240,10%,52%)]">
                {variant === "customer"
                  ? "Bookings, loyalty rewards, exclusive offers, and session history — access everything through your personal portal."
                  : "Sessions, billing, bookings, inventory, staff, tournaments, analytics — all in one white-label platform."}
              </p>
            </div>

            <div className="space-y-2.5">
              {PROOFS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[13px] text-[hsl(240,8%,60%)]">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[13px] font-medium text-[hsl(240,8%,60%)]">
                Trusted by gaming venues worldwide
              </span>
            </div>
            <div className="flex gap-3">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/[0.035] px-3.5 py-2.5 ring-1 ring-white/[0.06]"
                >
                  <div className="font-['JetBrains_Mono',monospace] text-[18px] font-bold text-white">
                    {s.value}
                  </div>
                  <div className="text-[11px] text-[hsl(240,10%,46%)]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right form panel ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
          <Link
            to={backTo}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 no-underline lg:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(190,85%,48%)] shadow-md shadow-primary/20">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <span className="font-['Poppins',sans-serif] text-[16px] font-extrabold tracking-tight text-white">
              Cuetronix
            </span>
          </Link>
        </div>

        <div className={cn("flex flex-1 items-center justify-center px-5 pb-10 sm:px-8")}>
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
