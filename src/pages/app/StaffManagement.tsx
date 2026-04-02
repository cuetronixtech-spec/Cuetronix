import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const StaffManagement = () => (
  <div>
    <PageHeader title="Staff Management" description="Manage your team" actions={<Button><Plus className="h-4 w-4 mr-2" />Invite Staff</Button>} />
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No staff members yet</TableCell></TableRow>
      </TableBody>
    </Table>
  </div>
);

export default StaffManagement;
