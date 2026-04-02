import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SATenants = () => (
  <div>
    <PageHeader title="Tenants" description="Manage all clubs on the platform" />
    <Input placeholder="Search tenants..." className="max-w-sm mb-4" />
    <Table>
      <TableHeader><TableRow><TableHead>Club Name</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No tenants yet</TableCell></TableRow></TableBody>
    </Table>
  </div>
);

export default SATenants;
