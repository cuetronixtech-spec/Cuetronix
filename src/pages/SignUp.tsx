import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SignUp = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Your Club</CardTitle>
        <CardDescription>Start your 14-day free trial</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clubName">Club Name</Label>
          <Input id="clubName" placeholder="My Snooker Club" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Club URL</Label>
          <Input id="slug" placeholder="my-snooker-club" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="admin@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
        <Button className="w-full">Create Account</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/signin" className="text-primary hover:underline">Sign In</Link>
        </p>
      </CardContent>
    </Card>
  </div>
);

export default SignUp;
