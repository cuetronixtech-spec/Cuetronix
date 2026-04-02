import { useNavigate } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Topbar() {
  const navigate = useNavigate();
  const { user, appMeta, signOut } = useAuth();
  const { config } = useTenant();

  const fullName: string | null =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null;
  const email = user?.email ?? null;
  const initials = getInitials(fullName, email);
  const displayName = fullName ?? email ?? "User";
  const role = appMeta.role ?? "staff";
  const planSlug = appMeta.plan_slug ?? config?.currency_code ?? "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
      {/* Left — sidebar toggle */}
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>

      {/* Right — notifications + user menu */}
      <div className="flex items-center gap-1">
        {/* Notification bell — placeholder badge, wired up in Phase 2 */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Notifications"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Red dot — will show real count from Realtime in Phase 2 */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-secondary" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 px-2 ml-1"
            >
              <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
                {initials}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-none max-w-32 truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">
                  {role}{planSlug ? ` · ${planSlug}` : ""}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-semibold truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate">{email}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/staff-portal")} className="md:hidden">
              <User className="mr-2 h-4 w-4" />
              My Portal
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
