import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const POS = () => (
  <div>
    <PageHeader title="Point of Sale" description="Create orders and manage billing" />
    <div className="grid md:grid-cols-3 gap-6">
      {/* Left — Station & Product Selector */}
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Select Station</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"].map((t) => (
                <Button key={t} variant="outline" className="h-16">{t}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Products</CardTitle></CardHeader>
          <CardContent>
            <Input placeholder="Search products..." className="mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {["Coffee", "Tea", "Water", "Coke", "Chips", "Sandwich"].map((p) => (
                <Button key={p} variant="outline" className="h-12">{p}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Right — Cart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Cart</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">No items in cart</p>
          <Separator />
          <div className="flex justify-between font-medium text-foreground">
            <span>Total</span><span>₹0</span>
          </div>
          <Button className="w-full">Checkout</Button>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default POS;
