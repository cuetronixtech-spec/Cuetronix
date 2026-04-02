import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const StaffPortal = () => (
  <div>
    <PageHeader title="Staff Portal" description="Attendance, schedule & leave management" />
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Today's Status</CardTitle></CardHeader><CardContent><p className="text-lg font-bold text-foreground">Not Checked In</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Leaves This Month</CardTitle></CardHeader><CardContent><p className="text-lg font-bold text-foreground">0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Overtime Hours</CardTitle></CardHeader><CardContent><p className="text-lg font-bold text-foreground">0</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Schedule</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No schedule assigned</TableCell></TableRow></TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

export default StaffPortal;
