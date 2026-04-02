import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const SYSTEM_PROMPT = `You are a helpful AI assistant for Cuetronix, a club management platform for snooker and billiards clubs. You help club owners and staff with:
- Managing sessions and billing
- Product and inventory management
- Customer and loyalty management
- Staff and attendance
- Reports and analytics
- Tournament organization
- Booking management

Be concise, friendly, and practical. When giving advice about Cuetronix features, refer to the actual pages available: Dashboard, POS, Stations, Products, Customers, Reports, Bookings, Tournaments, Staff Management, Staff Portal, Expenses, Cash Management, Investors, Settings.`;

async function callGemini(messages: Message[], userMessage: string): Promise<string> {
  if (!GEMINI_KEY) {
    return "AI Assistant is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.";
  }

  const contents = [
    ...messages.slice(-10).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
}

export default function ChatAI() {
  const { config } = useTenant();
  const { user } = useAuth();
  const tenantId = config?.tenant_id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenantId || !user) return;
    // Load recent chat history
    supabase
      .from("ai_chat_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data as Message[]);
        }
      });
  }, [tenantId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMsg,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Save user message
    if (tenantId && user) {
      await supabase.from("ai_chat_history").insert({
        tenant_id: tenantId,
        user_id: user.id,
        session_id: sessionId,
        role: "user",
        content: userMsg,
      });
    }

    try {
      const reply = await callGemini(messages, userMsg);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      if (tenantId && user) {
        await supabase.from("ai_chat_history").insert({
          tenant_id: tenantId,
          user_id: user.id,
          session_id: sessionId,
          role: "assistant",
          content: reply,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI response");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    setMessages([]);
    if (tenantId && user) {
      await supabase.from("ai_chat_history").delete().eq("tenant_id", tenantId).eq("user_id", user.id).eq("session_id", sessionId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title="AI Assistant"
        description="Powered by Google Gemini — ask anything about your club"
        actions={
          messages.length > 0 ? (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-1" />Clear
            </Button>
          ) : undefined
        }
      />
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div className="space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3 text-sm text-foreground max-w-md">
                  <p>Hi! I'm your Cuetronix AI assistant powered by Google Gemini.</p>
                  <p className="mt-2 text-muted-foreground text-xs">I can help you with reports, club management tips, billing questions, and more. What would you like to know?</p>
                  {!GEMINI_KEY && (
                    <p className="mt-2 text-orange-400 text-xs">⚠️ Set <code>VITE_GEMINI_API_KEY</code> in your .env.local to enable AI responses.</p>
                  )}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-primary/10"}`}>
                  {msg.role === "user"
                    ? <User className="h-4 w-4 text-primary-foreground" />
                    : <Bot className="h-4 w-4 text-primary" />}
                </div>
                <div className={`rounded-lg p-3 text-sm max-w-[80%] whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4 flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask me anything about your club…"
            className="flex-1"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
