import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const Expenses = () => (
  <div>
    <PageHeader title="Expenses" description="Track and manage expenses" actions={<Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>} />
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">This Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Last Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Categories</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">0</p></CardContent></Card>
    </div>
    <Table>
      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No expenses recorded</TableCell></TableRow></TableBody>
    </Table>
  </div>
);

export default Expenses;
