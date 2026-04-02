import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, ShoppingCart, Users, BarChart3, CalendarDays, Trophy } from "lucide-react";

const features = [
  { icon: Monitor, title: "Station Management", desc: "Track availability & sessions in real-time" },
  { icon: ShoppingCart, title: "Smart POS", desc: "Fast billing with timer-based pricing" },
  { icon: Users, title: "Customer CRM", desc: "Loyalty, wallets & engagement tools" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Revenue, sessions & staff insights" },
  { icon: CalendarDays, title: "Online Booking", desc: "Let customers book stations online" },
  { icon: Trophy, title: "Tournaments", desc: "Organize & manage gaming events" },
];

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-background">
        <span className="font-bold text-xl text-primary">Cuetronix</span>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          <Link to="/signin"><Button variant="ghost" size="sm">Sign In</Button></Link>
          <Link to="/signup"><Button size="sm">Start Free Trial</Button></Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-muted/30">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl">
          Manage Your Snooker & Pool Club Like a Pro
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          All-in-one SaaS platform for station management, billing, bookings, tournaments, and customer engagement.
        </p>
        <div className="mt-8 flex gap-4">
          <Link to="/signup"><Button size="lg">Start Free Trial</Button></Link>
          <Link to="/pricing"><Button variant="outline" size="lg">View Pricing</Button></Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 md:px-6">
        <h2 className="text-3xl font-bold text-center mb-10 text-foreground">Everything You Need</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <Link to="/privacy-policy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms-and-conditions" className="hover:text-foreground">Terms</Link>
          <Link to="/refund-policy" className="hover:text-foreground">Refunds</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </div>
        <p>© 2026 Cuetronix. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
