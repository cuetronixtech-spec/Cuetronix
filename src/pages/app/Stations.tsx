import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const mockStations = [
  { name: "Table 1", type: "Snooker", status: "available" },
  { name: "Table 2", type: "Pool", status: "occupied" },
  { name: "Table 3", type: "Snooker", status: "available" },
  { name: "Table 4", type: "Pool", status: "maintenance" },
  { name: "Table 5", type: "Snooker", status: "occupied" },
  { name: "Table 6", type: "Pool", status: "available" },
];

const statusColor: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-red-100 text-red-800",
  maintenance: "bg-yellow-100 text-yellow-800",
};

const Stations = () => (
  <div>
    <PageHeader title="Stations" description="Manage your tables and gaming stations" actions={<Button><Plus className="h-4 w-4 mr-2" />Add Station</Button>} />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {mockStations.map((s) => (
        <Card key={s.name}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{s.name}</CardTitle>
              <Badge variant="secondary" className={statusColor[s.status]}>{s.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{s.type}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Stations;
