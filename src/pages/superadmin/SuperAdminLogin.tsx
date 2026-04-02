import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SuperAdminLogin = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Super Admin</CardTitle>
        <CardDescription>Access the admin panel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="admin@cuetronix.com" /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="••••••••" /></div>
        <Button className="w-full">Sign In</Button>
      </CardContent>
    </Card>
  </div>
);

export default SuperAdminLogin;
