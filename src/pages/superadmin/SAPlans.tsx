import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const SAPlans = () => (
  <div>
    <PageHeader title="Plans" description="Manage subscription plans" actions={<Button><Plus className="h-4 w-4 mr-2" />Add Plan</Button>} />
    <Table>
      <TableHeader><TableRow><TableHead>Plan Name</TableHead><TableHead>Price</TableHead><TableHead>Features</TableHead><TableHead>Subscribers</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No plans configured</TableCell></TableRow></TableBody>
    </Table>
  </div>
);

export default SAPlans;
