import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const Customers = () => (
  <div>
    <PageHeader title="Customers" description="Manage your customer base" actions={<Button><Plus className="h-4 w-4 mr-2" />Add Customer</Button>} />
    <Input placeholder="Search customers..." className="max-w-sm mb-4" />
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Visits</TableHead>
          <TableHead>Loyalty Points</TableHead>
          <TableHead>Last Visit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No customers yet</TableCell></TableRow>
      </TableBody>
    </Table>
  </div>
);

export default Customers;
