import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LogIn, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

type AttendanceRow = {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  working_hours: number | null;
  status: string;
};

type LeaveRequest = {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: string;
  created_at: string;
};

type Schedule = {
  day_of_week: number;
  shift_start: string | null;
  shift_end: string | null;
  is_off: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
  half_day: "bg-orange-100 text-orange-700",
  holiday: "bg-blue-100 text-blue-700",
  on_leave: "bg-purple-100 text-purple-700",
};

const LEAVE_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function StaffPortal() {
  const { config } = useTenant();
  const { user } = useAuth();
  const tenantId = config?.tenant_id;

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "casual", from_date: "", to_date: "", reason: "",
  });

  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    if (!tenantId || !user) return;
    setLoading(true);
    const [attRes, leaveRes, schedRes] = await Promise.all([
      supabase.from("staff_attendance").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).order("date", { ascending: false }).limit(30),
      supabase.from("staff_leave_requests").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("staff_work_schedules").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).order("day_of_week"),
    ]);
    const attRows = attRes.data || [];
    setAttendance(attRows);
    setLeaves(leaveRes.data || []);
    setSchedule(schedRes.data || []);
    setTodayRecord(attRows.find(a => a.date === today) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clockIn = async () => {
    if (!tenantId || !user) return;
    if (todayRecord?.clock_in) { toast.info("Already clocked in today"); return; }
    const { error } = await supabase.from("staff_attendance").upsert({
      tenant_id: tenantId,
      user_id: user.id,
      date: today,
      clock_in: new Date().toISOString(),
      status: "present",
    }, { onConflict: "tenant_id,user_id,date" });
    if (error) { toast.error(error.message); return; }
    toast.success("Clocked in successfully");
    load();
  };

  const clockOut = async () => {
    if (!todayRecord?.id) return;
    const clockInTime = todayRecord.clock_in ? new Date(todayRecord.clock_in) : null;
    const now = new Date();
    const workingHours = clockInTime ? (now.getTime() - clockInTime.getTime()) / (1000 * 3600) : null;
    const { error } = await supabase.from("staff_attendance").update({
      clock_out: now.toISOString(),
      working_hours: workingHours ? parseFloat(workingHours.toFixed(2)) : null,
    }).eq("id", todayRecord.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Clocked out successfully");
    load();
  };

  const submitLeave = async () => {
    if (!leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason.trim() || !tenantId || !user) return;
    setSaving(true);
    const from = new Date(leaveForm.from_date);
    const to = new Date(leaveForm.to_date);
    const days = (to.getTime() - from.getTime()) / (1000 * 3600 * 24) + 1;
    const { error } = await supabase.from("staff_leave_requests").insert({
      tenant_id: tenantId,
      user_id: user.id,
      leave_type: leaveForm.leave_type,
      from_date: leaveForm.from_date,
      to_date: leaveForm.to_date,
      days,
      reason: leaveForm.reason.trim(),
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Leave request submitted");
    setLeaveOpen(false);
    setSaving(false);
    load();
  };

  const thisMonthLeaves = leaves.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, l) => s + Number(l.days || 0), 0);

  const overtimeHrs = attendance.reduce((s, a) => {
    const worked = Number(a.working_hours || 0);
    return s + Math.max(0, worked - 8);
  }, 0);

  return (
    <div>
      <PageHeader title="My Portal" description="Your attendance, schedule, and leave management" />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className={todayRecord?.clock_in && !todayRecord?.clock_out ? "border-green-500/30 bg-green-500/5" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Status</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-6 w-32" /> : (
              <div>
                <p className="text-lg font-bold">
                  {!todayRecord ? "Not Checked In" : todayRecord.clock_in && !todayRecord.clock_out ? "Working" : "Completed"}
                </p>
                {todayRecord?.clock_in && (
                  <p className="text-xs text-muted-foreground mt-1">
                    In: {new Date(todayRecord.clock_in).toLocaleTimeString()}
                    {todayRecord.clock_out && ` · Out: ${new Date(todayRecord.clock_out).toLocaleTimeString()}`}
                    {todayRecord.working_hours && ` · ${todayRecord.working_hours}h`}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  {!todayRecord?.clock_in && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={clockIn}>
                      <LogIn className="h-3 w-3 mr-1" />Clock In
                    </Button>
                  )}
                  {todayRecord?.clock_in && !todayRecord?.clock_out && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={clockOut}>
                      <LogOut className="h-3 w-3 mr-1" />Clock Out
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Leaves This Month</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{thisMonthLeaves} day{thisMonthLeaves !== 1 ? "s" : ""}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overtime (This Month)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{overtimeHrs.toFixed(1)}h</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No attendance records yet</TableCell></TableRow>
                ) : attendance.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{new Date(a.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.clock_in ? new Date(a.clock_in).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell>{a.working_hours != null ? `${a.working_hours}h` : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[a.status] || "bg-gray-100 text-gray-700"}>{a.status.replace("_", " ")}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          {schedule.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No schedule assigned yet. Contact your manager.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Shift Start</TableHead>
                  <TableHead>Shift End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map(s => (
                  <TableRow key={s.day_of_week}>
                    <TableCell className="font-medium">{DAYS[s.day_of_week]}</TableCell>
                    <TableCell className="text-muted-foreground">{s.shift_start || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.shift_end || "—"}</TableCell>
                    <TableCell>
                      {s.is_off ? (
                        <Badge variant="secondary">Day Off</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Working</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setLeaveOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Apply for Leave
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>
              ) : leaves.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="capitalize">{l.leave_type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(l.from_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(l.to_date).toLocaleDateString()}</TableCell>
                  <TableCell>{l.days}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{l.reason}</TableCell>
                  <TableCell><Badge className={LEAVE_COLORS[l.status] || "bg-gray-100 text-gray-700"}>{l.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Leave Type</Label>
              <Select value={leaveForm.leave_type} onValueChange={v => setLeaveForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["casual", "sick", "emergency", "earned", "unpaid"].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Date</Label><Input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm(f => ({ ...f, from_date: e.target.value }))} className="mt-1.5" /></div>
              <div><Label>To Date</Label><Input type="date" value={leaveForm.to_date} onChange={e => setLeaveForm(f => ({ ...f, to_date: e.target.value }))} className="mt-1.5" /></div>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} className="mt-1.5" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button onClick={submitLeave} disabled={saving}>{saving ? "Submitting…" : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
