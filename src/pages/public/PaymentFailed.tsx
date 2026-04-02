import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PaymentFailed = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="max-w-md w-full text-center">
      <CardContent className="pt-8 pb-8">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
        <p className="text-muted-foreground mt-2">Something went wrong. Please try again.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <Button>Retry Payment</Button>
          <Link to="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default PaymentFailed;
