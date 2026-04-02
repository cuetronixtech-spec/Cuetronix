import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PaymentSuccess = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="max-w-md w-full text-center">
      <CardContent className="pt-8 pb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
        <p className="text-muted-foreground mt-2">Your booking has been confirmed.</p>
        <Link to="/"><Button className="mt-6">Go Home</Button></Link>
      </CardContent>
    </Card>
  </div>
);

export default PaymentSuccess;
