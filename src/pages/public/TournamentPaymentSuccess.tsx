import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const TournamentPaymentSuccess = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="max-w-md w-full text-center">
      <CardContent className="pt-8 pb-8">
        <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Registration Confirmed!</h1>
        <p className="text-muted-foreground mt-2">You've been registered for the tournament.</p>
        <Link to="/"><Button className="mt-6">Go Home</Button></Link>
      </CardContent>
    </Card>
  </div>
);

export default TournamentPaymentSuccess;
