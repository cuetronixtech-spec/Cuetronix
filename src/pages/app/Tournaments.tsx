import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const Tournaments = () => (
  <div>
    <PageHeader title="Tournaments" description="Organize and manage gaming events" actions={<Button><Plus className="h-4 w-4 mr-2" />Create Tournament</Button>} />
    <div className="grid md:grid-cols-3 gap-4">
      {["Upcoming", "Active", "Completed"].map((status) => (
        <Card key={status}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{status}</CardTitle>
              <Badge variant="secondary">0</Badge>
            </div>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">No {status.toLowerCase()} tournaments</p></CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Tournaments;
