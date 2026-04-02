import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CustomerDashboard = () => (
  <div>
    <PageHeader title="Welcome Back!" description="Your loyalty dashboard" />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Loyalty Points</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Visits</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Upcoming Bookings</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Recent Visits</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">No recent visits</p></CardContent>
    </Card>
  </div>
);

export default CustomerDashboard;
