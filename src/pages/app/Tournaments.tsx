import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Trophy, Edit } from "lucide-react";
import { toast } from "sonner";

type Tournament = {
  id: string;
  name: string;
  format: string;
  game_type: string;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  entry_fee: number;
  prize_pool: number;
  status: string;
  is_public: boolean;
  created_at: string;
};

type Registration = {
  id: string;
  tournament_id: string;
  player_name: string;
  player_phone: string | null;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  registration_open: "bg-green-100 text-green-700",
  ongoing: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const blank = () => ({
  name: "", format: "knockout", game_type: "snooker",
  start_date: "", end_date: "", registration_deadline: "",
  max_participants: "", entry_fee: "0", prize_pool: "0",
  first_prize: "", second_prize: "", third_prize: "",
  rules: "", status: "upcoming", is_public: true,
});

export default function Tournaments() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());
  const [regForm, setRegForm] = useState({ player_name: "", player_phone: "", player_email: "" });

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTournaments(data || []);
    setLoading(false);
  };

  const loadRegs = async (tournamentId: string) => {
    const { data } = await supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at");
    setRegistrations(data || []);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.name.trim() || !tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("tournaments").insert({
      tenant_id: tenantId,
      name: form.name.trim(),
      format: form.format,
      game_type: form.game_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      registration_deadline: form.registration_deadline || null,
      max_participants: parseInt(form.max_participants) || null,
      entry_fee: parseFloat(form.entry_fee) || 0,
      prize_pool: parseFloat(form.prize_pool) || 0,
      first_prize: form.first_prize.trim() || null,
      second_prize: form.second_prize.trim() || null,
      third_prize: form.third_prize.trim() || null,
      rules: form.rules.trim() || null,
      status: form.status,
      is_public: form.is_public,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Tournament created");
    setOpen(false);
    setSaving(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tournaments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    load();
  };

  const addRegistration = async () => {
    if (!regForm.player_name.trim() || !selectedTournament || !tenantId) return;
    const { error } = await supabase.from("tournament_registrations").insert({
      tenant_id: tenantId,
      tournament_id: selectedTournament.id,
      player_name: regForm.player_name.trim(),
      player_phone: regForm.player_phone.trim() || null,
      player_email: regForm.player_email.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Player registered");
    setRegForm({ player_name: "", player_phone: "", player_email: "" });
    loadRegs(selectedTournament.id);
  };

  const openReg = (t: Tournament) => {
    setSelectedTournament(t);
    loadRegs(t.id);
    setRegOpen(true);
  };

  const grouped = {
    upcoming: tournaments.filter(t => t.status === "upcoming" || t.status === "registration_open"),
    active: tournaments.filter(t => t.status === "ongoing"),
    completed: tournaments.filter(t => t.status === "completed" || t.status === "cancelled"),
  };

  return (
    <div>
      <PageHeader
        title="Tournaments"
        description="Organize and manage gaming events"
        actions={<Button onClick={() => { setForm(blank()); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Tournament</Button>}
      />

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({grouped.upcoming.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({grouped.active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({grouped.completed.length})</TabsTrigger>
          </TabsList>

          {(["upcoming", "active", "completed"] as const).map(key => (
            <TabsContent key={key} value={key} className="mt-4">
              {grouped[key].length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No {key} tournaments</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {grouped[key].map(t => (
                    <Card key={t.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{t.name}</CardTitle>
                          <Badge className={STATUS_COLORS[t.status]}>{t.status.replace("_", " ")}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{t.format} · {t.game_type}</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex gap-4 text-sm">
                          {t.start_date && <span className="text-muted-foreground">Start: {new Date(t.start_date).toLocaleDateString()}</span>}
                          {t.entry_fee > 0 && <span className="font-medium">Entry: {sym}{t.entry_fee}</span>}
                          {t.prize_pool > 0 && <span className="text-green-600 font-medium">Prize: {sym}{t.prize_pool}</span>}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openReg(t)}>
                            <Users className="h-3 w-3 mr-1" />Players
                          </Button>
                          {t.status === "upcoming" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "registration_open")}>
                              Open Registration
                            </Button>
                          )}
                          {t.status === "registration_open" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "ongoing")}>
                              Start
                            </Button>
                          )}
                          {t.status === "ongoing" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "completed")}>
                              <Trophy className="h-3 w-3 mr-1" />Finish
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Create Tournament Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Tournament</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Tournament Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Format</Label>
                <Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["knockout", "league", "round_robin", "double_elimination", "custom"].map(f => (
                      <SelectItem key={f} value={f} className="capitalize">{f.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Game Type</Label>
                <Select value={form.game_type} onValueChange={v => setForm(f => ({ ...f, game_type: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["snooker", "pool", "8-ball", "9-ball", "other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entry Fee ({sym})</Label><Input type="number" min="0" value={form.entry_fee} onChange={e => setForm(f => ({ ...f, entry_fee: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>Prize Pool ({sym})</Label><Input type="number" min="0" value={form.prize_pool} onChange={e => setForm(f => ({ ...f, prize_pool: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>1st Prize</Label><Input value={form.first_prize} onChange={e => setForm(f => ({ ...f, first_prize: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>2nd Prize</Label><Input value={form.second_prize} onChange={e => setForm(f => ({ ...f, second_prize: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>3rd Prize</Label><Input value={form.third_prize} onChange={e => setForm(f => ({ ...f, third_prize: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div><Label>Rules</Label><Textarea value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create Tournament"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrations Dialog */}
      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Players — {selectedTournament?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Player name" value={regForm.player_name} onChange={e => setRegForm(f => ({ ...f, player_name: e.target.value }))} />
              <Input placeholder="Phone" value={regForm.player_phone} onChange={e => setRegForm(f => ({ ...f, player_phone: e.target.value }))} />
              <Button size="sm" onClick={addRegistration}><Plus className="h-4 w-4" /></Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No players registered yet</TableCell></TableRow>
                ) : registrations.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.player_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.player_phone || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
