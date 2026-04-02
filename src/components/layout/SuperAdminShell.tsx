import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Building2, DollarSign, CreditCard, Megaphone, FileSearch, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SA_FLAG } from "@/pages/superadmin/SuperAdminLogin";

const items = [
  { title: "Dashboard", url: "/super-admin", icon: LayoutDashboard },
  { title: "Tenants", url: "/super-admin/tenants", icon: Building2 },
  { title: "Revenue", url: "/super-admin/revenue", icon: DollarSign },
  { title: "Plans", url: "/super-admin/plans", icon: CreditCard },
  { title: "Broadcast", url: "/super-admin/broadcast", icon: Megaphone },
  { title: "Audit Log", url: "/super-admin/audit-log", icon: FileSearch },
];

function SANav() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h1 className={`font-bold text-xl text-primary ${collapsed ? "text-center text-sm" : ""}`}>
            {collapsed ? "SA" : "Super Admin"}
          </h1>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/super-admin"} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const SuperAdminShell = () => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    sessionStorage.removeItem(SA_FLAG);
    await supabase.auth.signOut();
    navigate("/super-admin/login", { replace: true });
  };
  return (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <SANav />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-4 bg-background gap-3">
          <SidebarTrigger />
          <span className="ml-2 font-semibold text-foreground flex-1">Super Admin Panel</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-1.5" />Sign out
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  </SidebarProvider>
  );
};

export default SuperAdminShell;
