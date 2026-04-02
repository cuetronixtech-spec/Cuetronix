import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PublicBooking = () => (
  <div className="min-h-screen bg-muted/30">
    <header className="h-14 border-b flex items-center px-6 bg-background"><span className="font-bold text-lg text-primary">Cuetronix</span></header>
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Book a Station</h1>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
          <div className="space-y-2"><Label>Time</Label><Input type="time" /></div>
          <div className="space-y-2"><Label>Station</Label><Input placeholder="Select station" /></div>
          <div className="space-y-2"><Label>Your Name</Label><Input placeholder="Full name" /></div>
          <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91 9999999999" /></div>
          <Button className="w-full">Book Now</Button>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default PublicBooking;
