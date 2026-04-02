import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPassword = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter your email to receive a reset link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="admin@example.com" />
        </div>
        <Button className="w-full">Send Reset Link</Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/signin" className="text-primary hover:underline">Back to Sign In</Link>
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ForgotPassword;
