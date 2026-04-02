import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const CustomerLogin = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Customer Login</CardTitle>
        <CardDescription>Enter your phone number to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Phone Number</Label><Input placeholder="+91 9999999999" /></div>
        <Button className="w-full">Send OTP</Button>
        <div className="space-y-2"><Label>OTP</Label><Input placeholder="Enter 6-digit OTP" /></div>
        <Button className="w-full" variant="outline">Verify & Login</Button>
      </CardContent>
    </Card>
  </div>
);

export default CustomerLogin;
