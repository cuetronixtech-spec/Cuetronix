import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LoginLogs = () => (
  <div>
    <PageHeader title="Login Logs" description="Track login activity" />
    <Input placeholder="Search by email or IP..." className="max-w-sm mb-4" />
    <Table>
      <TableHeader><TableRow><TableHead>User</TableHead><TableHead>IP Address</TableHead><TableHead>Device</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No login logs</TableCell></TableRow></TableBody>
    </Table>
  </div>
);

export default LoginLogs;
