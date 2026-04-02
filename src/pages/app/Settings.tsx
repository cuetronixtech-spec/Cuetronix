import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tabs = ["General", "Branding", "Stations", "Products", "Billing", "Payment Gateway", "Notifications", "Receipts", "Staff", "Data"];

const Settings = () => (
  <div>
    <PageHeader title="Settings" description="Configure your club settings" />
    <Tabs defaultValue="General">
      <TabsList className="flex-wrap h-auto">
        {tabs.map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t} value={t} className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t} Settings</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground text-sm">Configure {t.toLowerCase()} settings here. This section will be implemented with Supabase.</p></CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  </div>
);

export default Settings;
