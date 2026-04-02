import {
  LayoutDashboard,
  Monitor,
  Box,
  ShoppingCart,
  Users,
  BarChart3,
  CalendarDays,
  Trophy,
  UserCog,
  DollarSign,
  Vault,
  TrendingUp,
  Bot,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  CreditCard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

// ─── Nav items — role/feature filtering happens in Phase 2 ────────────────────

const mainItems = [
  { title: "Dashboard",  url: "/dashboard", icon: LayoutDashboard },
  { title: "POS",        url: "/pos",        icon: ShoppingCart },
  { title: "Stations",   url: "/stations",   icon: Monitor },
  { title: "Products",   url: "/products",   icon: Box },
  { title: "Customers",  url: "/customers",  icon: Users },
];

const operationsItems = [
  { title: "Reports",     url: "/reports",              icon: BarChart3 },
  { title: "Bookings",    url: "/booking-management",   icon: CalendarDays },
  { title: "Tournaments", url: "/tournaments",           icon: Trophy },
];

const managementItems = [
  { title: "Staff",           url: "/staff",        icon: UserCog },
  { title: "Staff Portal",    url: "/staff-portal", icon: Users },
  { title: "Expenses",        url: "/expenses",     icon: DollarSign },
  { title: "Cash Management", url: "/cash",         icon: Vault },
  { title: "Investors",       url: "/investors",    icon: TrendingUp },
];

const toolsItems = [
  { title: "AI Assistant",  url: "/chat-ai",      icon: Bot },
  { title: "Login Logs",    url: "/login-logs",   icon: FileText },
  { title: "Subscription",  url: "/subscription", icon: CreditCard },
  { title: "Settings",      url: "/settings",     icon: Settings },
  { title: "How to Use",    url: "/how-to-use",   icon: HelpCircle },
];

const groups = [
  { label: "Main",       items: mainItems },
  { label: "Operations", items: operationsItems },
  { label: "Management", items: managementItems },
  { label: "Tools",      items: toolsItems },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user, appMeta, signOut } = useAuth();
  const { config } = useTenant();

  const brandName = config?.brand_name ?? "Cuetronix";
  const shortName =
    brandName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CX";

  const fullName: string | null =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null;
  const email = user?.email ?? "";
  const role = appMeta.role ?? "staff";

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <Sidebar collapsible="icon">
      {/* ── Logo / Brand ─────────────────────────────────── */}
      <div className={`flex items-center ${collapsed ? "justify-center p-3" : "px-4 py-4"}`}>
        {collapsed ? (
          <span className="text-lg font-bold text-primary">{shortName}</span>
        ) : (
          <div className="flex flex-col">
            <span className="font-bold text-lg text-primary leading-tight tracking-tight">
              {brandName}
            </span>
            {config?.currency_code && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {config.currency_code} · {config.timezone?.split("/")[1]?.replace(/_/g, " ") ?? ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Nav groups ───────────────────────────────────── */}
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild title={collapsed ? item.title : undefined}>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/60 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-2"}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer — user info + sign out ─────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        ) : (
          <div className="px-3 py-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {(fullName?.[0] ?? email?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {fullName ?? email}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
