import { Outlet, Link } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, CalendarDays, Tag, UserCircle } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/customer", icon: LayoutDashboard },
  { title: "Bookings", url: "/customer/bookings", icon: CalendarDays },
  { title: "Offers", url: "/customer/offers", icon: Tag },
  { title: "Profile", url: "/customer/profile", icon: UserCircle },
];

const CustomerShell = () => (
  <div className="min-h-screen flex flex-col">
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
      <Link to="/customer" className="font-bold text-lg text-primary">Cuetronix</Link>
      <nav className="hidden md:flex items-center gap-4">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/customer"}
            className="text-sm text-muted-foreground hover:text-foreground"
            activeClassName="text-primary font-medium"
          >
            {item.title}
          </NavLink>
        ))}
      </nav>
    </header>
    <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
      <Outlet />
    </main>
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around md:hidden z-50">
      {items.map((item) => (
        <NavLink
          key={item.title}
          to={item.url}
          end={item.url === "/customer"}
          className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
          activeClassName="text-primary"
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  </div>
);

export default CustomerShell;
