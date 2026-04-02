import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SAAuditLog = () => (
  <div>
    <PageHeader title="Audit Log" description="Track all platform actions" />
    <Input placeholder="Search logs..." className="max-w-sm mb-4" />
    <Table>
      <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No audit logs</TableCell></TableRow></TableBody>
    </Table>
  </div>
);

export default SAAuditLog;
