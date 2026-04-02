import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CashManagement = () => (
  <div>
    <PageHeader title="Cash Management" description="Track vault balance and transactions" />
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Vault Balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Today's Inflow</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Today's Outflow</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">₹0</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader><CardTitle className="text-lg">Transaction Log</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions</TableCell></TableRow></TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

export default CashManagement;
