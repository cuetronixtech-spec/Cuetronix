import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, UserX, Edit } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  email?: string;
  full_name?: string;
  staff_profiles?: { full_name: string; phone: string | null; position: string | null } | null;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
};

export default function StaffManagement() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "staff" });
  const [newRole, setNewRole] = useState("staff");

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_members")
      .select("*, staff_profiles(full_name, phone, position)")
      .eq("tenant_id", tenantId)
      .order("joined_at", { ascending: false });
    if (error) toast.error(error.message);
    setMembers((data || []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const invite = async () => {
    if (!inviteForm.email.trim() || !tenantId) return;
    setSaving(true);

    // Check if user exists in auth.users via email
    // We can't directly invite via Supabase admin API from client, so we use signInWithOtp approach
    // For now, we use the RPC pattern or just insert into tenant_members if user already exists
    // Best approach: create an invite record and send email
    // Since we don't have a server function, we'll show a message
    toast.info(`Invitation system requires backend setup. Email: ${inviteForm.email} with role: ${inviteForm.role}`);
    setSaving(false);
    setInviteOpen(false);
  };

  const toggleActive = async (member: Member) => {
    const { error } = await supabase
      .from("tenant_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);
    if (error) { toast.error(error.message); return; }
    toast.success(member.is_active ? "Staff deactivated" : "Staff activated");
    load();
  };

  const changeRole = async () => {
    if (!selectedMember) return;
    const { error } = await supabase
      .from("tenant_members")
      .update({ role: newRole })
      .eq("id", selectedMember.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    setRoleOpen(false);
    load();
  };

  const openRoleChange = (m: Member) => {
    setSelectedMember(m);
    setNewRole(m.role);
    setRoleOpen(true);
  };

  const activeCount = members.filter(m => m.is_active).length;

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description={`${activeCount} active staff member${activeCount !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />Invite Staff
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No staff members yet</TableCell></TableRow>
            ) : members.map(m => (
              <TableRow key={m.id} className={!m.is_active ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  {(m as any).staff_profiles?.full_name || `User ${m.user_id.slice(0, 8)}…`}
                </TableCell>
                <TableCell>
                  <Badge className={ROLE_COLORS[m.role] || "bg-gray-100 text-gray-700"}>{m.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{(m as any).staff_profiles?.position || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{(m as any).staff_profiles?.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openRoleChange(m)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 px-2 ${m.is_active ? "text-red-500 hover:text-red-500" : "text-green-600 hover:text-green-600"}`}
                      onClick={() => toggleActive(m)}
                    >
                      <UserX className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite Staff Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Email Address *</Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="mt-1.5" placeholder="staff@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              An invitation email will be sent to the provided address. The staff member must sign up with this email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} disabled={saving}>{saving ? "Sending…" : "Send Invite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Change Role</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
            <Button onClick={changeRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
