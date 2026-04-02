import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const CustomerBookings = () => (
  <div>
    <PageHeader title="My Bookings" description="View and manage your reservations" actions={<Button><Plus className="h-4 w-4 mr-2" />New Booking</Button>} />
    <Table>
      <TableHeader><TableRow><TableHead>Station</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No bookings yet</TableCell></TableRow></TableBody>
    </Table>
  </div>
);

export default CustomerBookings;
