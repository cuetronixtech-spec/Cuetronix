import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/hooks/useCustomerSession";
import { LayoutDashboard, CalendarDays, Tag, UserCircle } from "lucide-react";

const CustomerShell = () => {
  const session = getCustomerSession();
  const [unreadOffers, setUnreadOffers] = useState(0);

  useEffect(() => {
    if (!session?.id) return;
    supabase
      .from("customer_offer_assignments")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", session.id)
      .eq("status", "assigned")
      .then(({ count }) => setUnreadOffers(count ?? 0));
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = [
    { title: "Dashboard", url: "/customer/dashboard", icon: LayoutDashboard },
    { title: "Bookings",  url: "/customer/bookings",  icon: CalendarDays },
    { title: "Offers",    url: "/customer/offers",    icon: Tag, badge: unreadOffers },
    { title: "Profile",   url: "/customer/profile",   icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base text-foreground">
            {session?.name ? `Hi, ${session.name.split(" ")[0]}` : "Customer Portal"}
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {items.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={false}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md relative"
              activeClassName="text-primary bg-primary/10 font-medium"
            >
              {item.title}
              {(item.badge ?? 0) > 0 && (
                <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around md:hidden z-50">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={false}
            className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground px-2 relative"
            activeClassName="text-primary"
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {(item.badge ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default CustomerShell;
