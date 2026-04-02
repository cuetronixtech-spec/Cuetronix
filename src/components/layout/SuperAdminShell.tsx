import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SA_FLAG } from "@/pages/superadmin/SuperAdminLogin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  CreditCard,
  Megaphone,
  ScrollText,
  LogOut,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/super-admin",            label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { to: "/super-admin/tenants",    label: "Tenants",    icon: Building2 },
  { to: "/super-admin/revenue",    label: "Revenue",    icon: TrendingUp },
  { to: "/super-admin/plans",      label: "Plans",      icon: CreditCard },
  { to: "/super-admin/broadcast",  label: "Broadcast",  icon: Megaphone },
  { to: "/super-admin/audit-log",  label: "Audit Log",  icon: ScrollText },
];

const SuperAdminShell = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    sessionStorage.removeItem(SA_FLAG);
    await supabase.auth.signOut();
    navigate("/super-admin/login", { replace: true });
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border",
      mobile ? "w-72" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Cuetronix</p>
          <p className="text-xs text-muted-foreground">Super Admin</p>
        </div>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Super Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminShell;
