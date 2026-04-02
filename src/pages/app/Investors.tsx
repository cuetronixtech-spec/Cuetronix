import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Investors = () => (
  <div>
    <PageHeader title="Investors" description="Financial overview and investor reports" />
    <div className="grid md:grid-cols-4 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Growth Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0%</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Revenue Trend</CardTitle></CardHeader>
      <CardContent><div className="h-64 flex items-center justify-center text-muted-foreground">Chart placeholder</div></CardContent>
    </Card>
  </div>
);

export default Investors;
