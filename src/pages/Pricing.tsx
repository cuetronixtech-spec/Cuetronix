import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  { name: "Starter", price: "₹999", period: "/mo", features: ["Up to 5 stations", "Basic POS", "Email support"] },
  { name: "Growth", price: "₹1,999", period: "/mo", features: ["Up to 15 stations", "Bookings & CRM", "Priority support", "Reports"] },
  { name: "Pro", price: "₹3,999", period: "/mo", features: ["Unlimited stations", "Tournaments", "AI Assistant", "Investor reports", "Custom branding"] },
  { name: "Business", price: "₹7,999", period: "/mo", features: ["Everything in Pro", "Multi-location", "Dedicated support", "API access", "White-label"] },
];

const Pricing = () => (
  <div className="min-h-screen">
    <header className="h-16 border-b flex items-center justify-between px-6 bg-background">
      <Link to="/" className="font-bold text-xl text-primary">Cuetronix</Link>
      <Link to="/signup"><Button size="sm">Start Free Trial</Button></Link>
    </header>
    <div className="py-16 px-4">
      <h1 className="text-3xl font-bold text-center text-foreground">Simple, Transparent Pricing</h1>
      <p className="text-center text-muted-foreground mt-2">14-day free trial on all plans</p>
      <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-10">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.name === "Pro" ? "border-primary shadow-md" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-3xl font-bold text-foreground">{plan.price}<span className="text-sm text-muted-foreground">{plan.period}</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup"><Button className="w-full mt-6" variant={plan.name === "Pro" ? "default" : "outline"}>Get Started</Button></Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export default Pricing;
