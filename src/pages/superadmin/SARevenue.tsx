import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SARevenue = () => (
  <div>
    <PageHeader title="Revenue" description="Platform revenue analytics" />
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">MRR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">ARR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Avg Revenue/Tenant</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Revenue Trend</CardTitle></CardHeader>
      <CardContent><div className="h-64 flex items-center justify-center text-muted-foreground">Chart placeholder</div></CardContent>
    </Card>
  </div>
);

export default SARevenue;
