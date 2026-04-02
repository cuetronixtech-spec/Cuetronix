import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Reports = () => (
  <div>
    <PageHeader title="Reports" description="Analytics and insights for your club" />
    <Tabs defaultValue="sales">
      <TabsList>
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="staff">Staff</TabsTrigger>
      </TabsList>
      {["sales", "revenue", "sessions", "staff"].map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg capitalize">{tab} Report</CardTitle></CardHeader>
            <CardContent><div className="h-64 flex items-center justify-center text-muted-foreground">Chart placeholder</div></CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  </div>
);

export default Reports;
