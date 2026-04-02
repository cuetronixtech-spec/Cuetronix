import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PublicStations = () => (
  <div className="min-h-screen bg-muted/30">
    <header className="h-14 border-b flex items-center px-6 bg-background"><span className="font-bold text-lg text-primary">Cuetronix</span></header>
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Live Station Availability</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {["Table 1", "Table 2", "Table 3", "Table 4"].map((t) => (
          <Card key={t}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">{t}</CardTitle></CardHeader>
            <CardContent><Badge variant="secondary">Available</Badge></CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export default PublicStations;
