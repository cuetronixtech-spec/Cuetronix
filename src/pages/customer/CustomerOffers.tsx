import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CustomerOffers = () => (
  <div>
    <PageHeader title="Offers" description="Active promotions and deals" />
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-lg">No Active Offers</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Check back later for exclusive deals and promotions.</p></CardContent>
      </Card>
    </div>
  </div>
);

export default CustomerOffers;
