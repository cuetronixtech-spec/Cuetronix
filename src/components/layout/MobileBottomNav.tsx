import { LayoutDashboard, ShoppingCart, Monitor, Users, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "POS", url: "/pos", icon: ShoppingCart },
  { title: "Stations", url: "/stations", icon: Monitor },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "More", url: "/settings", icon: Menu },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around md:hidden z-50">
      {items.map((item) => (
        <NavLink
          key={item.title}
          to={item.url}
          className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
          activeClassName="text-primary"
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
