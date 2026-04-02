import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const BookingManagement = () => (
  <div>
    <PageHeader title="Booking Management" description="Manage online reservations" actions={<Button><Plus className="h-4 w-4 mr-2" />New Booking</Button>} />
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Calendar View</CardTitle></CardHeader>
          <CardContent><div className="h-64 flex items-center justify-center text-muted-foreground">Calendar placeholder</div></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Today's Bookings</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No bookings today</p></CardContent>
      </Card>
    </div>
    <Card className="mt-6">
      <CardHeader><CardTitle className="text-lg">All Bookings</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead><TableHead>Station</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No bookings yet</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

export default BookingManagement;
