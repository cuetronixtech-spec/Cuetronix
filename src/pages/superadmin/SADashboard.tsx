import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SADashboard = () => (
  <div>
    <PageHeader title="Super Admin Dashboard" description="Platform overview" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Tenants</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">MRR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active Trials</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Churn Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0%</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Growth Chart</CardTitle></CardHeader>
      <CardContent><div className="h-64 flex items-center justify-center text-muted-foreground">Chart placeholder</div></CardContent>
    </Card>
  </div>
);

export default SADashboard;
