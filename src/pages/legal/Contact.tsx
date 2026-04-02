import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Contact = () => (
  <div className="min-h-screen">
    <header className="h-14 border-b flex items-center px-6 bg-background"><Link to="/" className="font-bold text-lg text-primary">Cuetronix</Link></header>
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Contact Us</h1>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2"><Label>Name</Label><Input placeholder="Your name" /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@example.com" /></div>
          <div className="space-y-2"><Label>Message</Label><Textarea placeholder="How can we help?" rows={5} /></div>
          <Button className="w-full">Send Message</Button>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default Contact;
