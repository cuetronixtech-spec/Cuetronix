import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User } from "lucide-react";

const ChatAI = () => (
  <div className="flex flex-col h-[calc(100vh-8rem)]">
    <PageHeader title="AI Assistant" description="Get help managing your club" />
    <Card className="flex-1 flex flex-col">
      <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-primary" /></div>
          <div className="bg-muted rounded-lg p-3 text-sm text-foreground max-w-md">
            Hi! I'm your AI assistant. I can help you with reports, insights, and club management tasks. How can I help?
          </div>
        </div>
      </CardContent>
      <div className="border-t p-4 flex gap-2">
        <Input placeholder="Ask me anything..." className="flex-1" />
        <Button size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  </div>
);

export default ChatAI;
