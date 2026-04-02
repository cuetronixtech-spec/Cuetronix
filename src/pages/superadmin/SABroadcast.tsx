import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Rocket } from "lucide-react";

export default function SABroadcast() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Broadcast</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Send messages to all tenants</p>
      </div>

      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Rocket className="h-3.5 w-3.5 text-amber-500" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Coming Soon</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Broadcast messaging to all tenants is under development.
              Notifications will be delivered via email using Resend.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground mt-2">
            {["Email broadcasts", "In-app notifications", "SMS (planned)", "Targeting by status"].map((f) => (
              <span key={f} className="px-3 py-1 rounded-full border border-border bg-muted/50">
                {f}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
