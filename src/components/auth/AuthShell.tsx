import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  classNameInner?: string;
  /** Hide the top brand row (e.g. nested states) */
  showBrand?: boolean;
};

/**
 * Shared marketing/auth layout: mesh gradients, subtle grid, centered content.
 */
export function AuthShell({ children, classNameInner, showBrand = true }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[hsl(240,27%,7%)] text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 85% 65% at 50% -25%, hsl(262 83% 58% / 0.22), transparent 55%),
            radial-gradient(ellipse 55% 45% at 100% 15%, hsl(190 90% 45% / 0.12), transparent 50%),
            radial-gradient(ellipse 50% 40% at 0% 60%, hsl(262 70% 45% / 0.08), transparent 45%),
            linear-gradient(170deg, hsl(240 32% 6%) 0%, hsl(240 27% 8%) 45%, hsl(240 28% 9%) 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(hsl(262 83% 58% / 0.055) 1px, transparent 1px),
            linear-gradient(90deg, hsl(262 83% 58% / 0.055) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, black, transparent)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-12 sm:py-16",
          classNameInner,
        )}
      >
        {showBrand && (
          <Link
            to="/"
            className="group mb-8 flex items-center gap-3 no-underline outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(240,27%,7%)] rounded-xl"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(190,85%,48%)] shadow-[0_8px_32px_hsl(262_83%_58%_/_0.35)] ring-1 ring-white/10 transition-transform group-hover:scale-[1.02]">
              <Cpu className="h-5 w-5 text-white" strokeWidth={2.25} />
            </div>
            <div className="text-left leading-tight">
              <div className="font-['Poppins',sans-serif] text-[18px] font-extrabold tracking-tight text-white">
                Cuetronix
              </div>
              <div className="text-[12px] font-medium text-[hsl(240,10%,58%)]">Club & venue operations</div>
            </div>
          </Link>
        )}

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
