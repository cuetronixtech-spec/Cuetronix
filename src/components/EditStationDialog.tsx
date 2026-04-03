import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Station = { id: string; name: string; rate_per_hour: number };

type Props = {
  station: Station | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sym: string;
};

export default function EditStationDialog({ station, open, onClose, onSaved, sym }: Props) {
  const [name, setName] = useState(station?.name || "");
  const [rate, setRate] = useState(String(station?.rate_per_hour || ""));
  const [saving, setSaving] = useState(false);

  // Sync with station prop when it changes
  const handleOpen = (o: boolean) => {
    if (o && station) { setName(station.name); setRate(String(station.rate_per_hour)); }
    if (!o) onClose();
  };

  const handleSave = async () => {
    if (!station || !name.trim() || parseFloat(rate) <= 0) return;
    setSaving(true);
    const { error } = await supabase.from("stations").update({ name: name.trim(), rate_per_hour: parseFloat(rate) }).eq("id", station.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Station updated");
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Station</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Station Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" placeholder="e.g. PS5 Station 1" />
          </div>
          <div>
            <Label>Hourly Rate ({sym})</Label>
            <Input type="number" min="0" step="0.5" value={rate} onChange={e => setRate(e.target.value)} className="mt-1.5" placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || parseFloat(rate) <= 0}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
