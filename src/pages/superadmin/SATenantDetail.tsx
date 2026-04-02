import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SATenantDetail = () => {
  const { id } = useParams();
  return (
    <div>
      <PageHeader title={`Tenant: ${id}`} description="View and manage tenant details" />
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Name: —</p><p>Plan: —</p><p>Status: —</p><p>Created: —</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full">Impersonate</Button>
            <Button variant="outline" className="w-full">Extend Trial</Button>
            <Button variant="destructive" className="w-full">Suspend</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SATenantDetail;
