import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

const Products = () => (
  <div>
    <PageHeader title="Products" description="Manage your menu and inventory" actions={<Button><Plus className="h-4 w-4 mr-2" />Add Product</Button>} />
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="beverages">Beverages</TabsTrigger>
        <TabsTrigger value="snacks">Snacks</TabsTrigger>
        <TabsTrigger value="accessories">Accessories</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        <Input placeholder="Search products..." className="max-w-sm mb-4" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No products yet</TableCell></TableRow>
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  </div>
);

export default Products;
