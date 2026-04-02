import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PublicTournaments = () => (
  <div className="min-h-screen bg-muted/30">
    <header className="h-14 border-b flex items-center px-6 bg-background"><span className="font-bold text-lg text-primary">Cuetronix</span></header>
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Tournaments</h1>
      <p className="text-muted-foreground">No upcoming tournaments at the moment. Check back soon!</p>
    </div>
  </div>
);

export default PublicTournaments;
