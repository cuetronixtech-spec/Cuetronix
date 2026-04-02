import { PageHeader } from "@/components/shared/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const sections = [
  { q: "How do I set up stations?", a: "Go to Settings > Stations to add and configure your gaming tables." },
  { q: "How does the POS work?", a: "Select a station, add products, and checkout. Sessions are timed automatically." },
  { q: "How do I manage bookings?", a: "Enable online bookings in Settings, then manage them from the Bookings page." },
  { q: "How do I invite staff?", a: "Go to Staff Management and click Invite Staff to send email invitations." },
  { q: "How do I set up tournaments?", a: "Navigate to Tournaments and create a new event with bracket or round-robin format." },
  { q: "How do I track expenses?", a: "Use the Expenses page to record and categorize all club expenses." },
];

const HowToUse = () => (
  <div>
    <PageHeader title="How to Use" description="Guide and FAQ for using Cuetronix" />
    <Accordion type="single" collapsible className="max-w-2xl">
      {sections.map((s, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{s.q}</AccordionTrigger>
          <AccordionContent>{s.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export default HowToUse;
