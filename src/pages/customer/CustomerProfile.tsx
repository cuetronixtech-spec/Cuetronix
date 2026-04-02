import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const CustomerProfile = () => (
  <div>
    <PageHeader title="My Profile" description="Manage your account details" />
    <Card className="max-w-md">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2"><Label>Name</Label><Input placeholder="Your name" /></div>
        <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91 9999999999" /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@example.com" /></div>
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  </div>
);

export default CustomerProfile;
