import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Monitor, ShoppingCart } from "lucide-react";

const stats = [
  { title: "Today's Revenue", value: "₹0", icon: DollarSign },
  { title: "Active Sessions", value: "0", icon: Monitor },
  { title: "Total Customers", value: "0", icon: Users },
  { title: "Today's Orders", value: "0", icon: ShoppingCart },
];

const Dashboard = () => (
  <div>
    <PageHeader title="Dashboard" description="Overview of your club's performance" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <Card key={s.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{s.value}</p></CardContent>
        </Card>
      ))}
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue Chart</CardTitle></CardHeader>
        <CardContent><div className="h-48 flex items-center justify-center text-muted-foreground">Chart placeholder</div></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">No recent activity</p></CardContent>
      </Card>
    </div>
  </div>
);

export default Dashboard;
