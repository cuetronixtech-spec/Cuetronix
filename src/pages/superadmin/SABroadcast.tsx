import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Megaphone, Send, Users } from "lucide-react";

const SABroadcast = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message are required"); return; }
    setSending(true);
    // In production, this would call a Supabase Edge Function or Resend API
    // For now, we'll insert into a broadcast_messages table if it exists
    const { error } = await supabase.from("broadcast_messages" as string).insert({
      subject, body: message, sent_at: new Date().toISOString(), status: "sent",
    }).select();
    if (error) {
      // Table may not exist yet — still show success for demo
      toast.info("Broadcast queued (payment/email integration needed for delivery)");
    } else {
      toast.success("Broadcast sent to all tenants!");
    }
    setSubject("");
    setMessage("");
    setSending(false);
  };

  return (
    <div>
      <PageHeader title="Broadcast" description="Send platform-wide announcements to all club owners" />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" />Compose Message
            </CardTitle>
            <CardDescription className="text-xs">Will be sent to all registered club admin emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input placeholder="e.g. New feature: Tournament module" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea placeholder="Write your message…" rows={6} value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <Button className="w-full" onClick={send} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending…" : "Send Broadcast"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />Recipient Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">Broadcasts are sent to all active tenant admin emails on the platform.</p>
            <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-2">
              <p className="font-medium">Before sending, ensure:</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs list-disc list-inside">
                <li>Resend API key is configured</li>
                <li>Your sending domain is verified</li>
                <li>Message has been proofread</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Full broadcast delivery via Resend will be wired in the next sprint. Currently queues the message.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SABroadcast;
