import {
  LayoutDashboard, Monitor, Box, ShoppingCart, Users,
  BarChart3, CalendarDays, Trophy, UserCog, DollarSign,
  Vault, TrendingUp, Bot, Settings, HelpCircle, FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "POS", url: "/pos", icon: ShoppingCart },
  { title: "Stations", url: "/stations", icon: Monitor },
  { title: "Products", url: "/products", icon: Box },
  { title: "Customers", url: "/customers", icon: Users },
];

const operationsItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Bookings", url: "/booking-management", icon: CalendarDays },
  { title: "Tournaments", url: "/tournaments", icon: Trophy },
];

const managementItems = [
  { title: "Staff", url: "/staff", icon: UserCog },
  { title: "Staff Portal", url: "/staff-portal", icon: Users },
  { title: "Expenses", url: "/expenses", icon: DollarSign },
  { title: "Cash Management", url: "/cash", icon: Vault },
  { title: "Investors", url: "/investors", icon: TrendingUp },
];

const toolsItems = [
  { title: "AI Assistant", url: "/chat-ai", icon: Bot },
  { title: "Login Logs", url: "/login-logs", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "How to Use", url: "/how-to-use", icon: HelpCircle },
];

const groups = [
  { label: "Main", items: mainItems },
  { label: "Operations", items: operationsItems },
  { label: "Management", items: managementItems },
  { label: "Tools", items: toolsItems },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h1 className={`font-bold text-xl text-primary ${collapsed ? "text-center text-sm" : ""}`}>
            {collapsed ? "CX" : "Cuetronix"}
          </h1>
        </div>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
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
    </Sidebar>
  );
}
