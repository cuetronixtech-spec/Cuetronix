import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SABroadcast = () => (
  <div>
    <PageHeader title="Broadcast" description="Send messages to tenants" />
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">New Broadcast</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Subject</Label><Input placeholder="Announcement subject" /></div>
          <div className="space-y-2"><Label>Message</Label><Textarea placeholder="Write your message..." rows={5} /></div>
          <Button>Send Broadcast</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">History</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No broadcasts sent yet</p></CardContent>
      </Card>
    </div>
  </div>
);

export default SABroadcast;
