import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

const steps = ["Club Info", "Stations", "Products", "Staff", "Done"];

const Onboarding = () => {
  const [step, setStep] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Setup Your Club</CardTitle>
          <CardDescription>Step {step + 1} of {steps.length}: {steps[step]}</CardDescription>
          <div className="flex gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={s} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2"><Label>Club Name</Label><Input placeholder="My Club" /></div>
              <div className="space-y-2"><Label>City</Label><Input placeholder="Mumbai" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91 9999999999" /></div>
            </>
          )}
          {step === 1 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Configure your stations (Snooker, Pool, etc.)</p>
              <p className="text-sm mt-2">You'll be able to add station types, names, and pricing here.</p>
            </div>
          )}
          {step === 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add your products & menu items</p>
              <p className="text-sm mt-2">Beverages, snacks, and accessories for your POS.</p>
            </div>
          )}
          {step === 3 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Invite your staff members</p>
              <p className="text-sm mt-2">Add staff emails and assign roles.</p>
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-8">
              <Check className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground">You're all set!</p>
              <p className="text-muted-foreground mt-2">Your club is ready to go.</p>
            </div>
          )}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button>Go to Dashboard</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
