import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Clock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillRow = {
  id: string;
  bill_number: string | null;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
};

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  total_amount: number | null;
  status: string;
  stations?: { name: string } | null;
};

type StaffBillCount = { name: string; count: number; total: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Reports() {
  const { config } = useTenant();
  const tenantId = config?.tenant_id;
  const sym = config?.currency_symbol || "₹";

  const [bills, setBills] = useState<BillRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));
    const iso = since.toISOString();

    const [bRes, sRes] = await Promise.all([
      supabase.from("bills").select("id, bill_number, total_amount, payment_method, status, created_at")
        .eq("tenant_id", tenantId).gte("created_at", iso).order("created_at", { ascending: false }),
      supabase.from("sessions").select("id, started_at, ended_at, duration_mins, total_amount, status, stations(name)")
        .eq("tenant_id", tenantId).gte("started_at", iso).order("started_at", { ascending: false }),
    ]);
    setBills((bRes.data || []) as BillRow[]);
    setSessions((sRes.data || []) as SessionRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRevenue = bills.filter(b => b.status !== "voided").reduce((s, b) => s + Number(b.total_amount), 0);
  const totalBills = bills.filter(b => b.status !== "voided").length;
  const avgBill = totalBills > 0 ? totalRevenue / totalBills : 0;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  // Daily revenue breakdown
  const dailyRevenue: Record<string, number> = {};
  bills.filter(b => b.status !== "voided").forEach(b => {
    const day = b.created_at.split("T")[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + Number(b.total_amount);
  });
  const sortedDays = Object.entries(dailyRevenue).sort(([a], [b]) => a.localeCompare(b));

  // Payment method breakdown
  const paymentBreakdown: Record<string, number> = {};
  bills.filter(b => b.status !== "voided").forEach(b => {
    paymentBreakdown[b.payment_method] = (paymentBreakdown[b.payment_method] || 0) + Number(b.total_amount);
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics and insights for your club"
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{sym}{totalRevenue.toLocaleString()}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground">Total Bills</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{totalBills}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground">Avg Bill Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{sym}{avgBill.toFixed(0)}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground">Sessions</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{completedSessions}</p>}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bills">
        <TabsList>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No bills in this period</TableCell></TableRow>
                ) : bills.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.bill_number || b.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(b.created_at).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{b.payment_method.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "completed" ? "default" : "secondary"} className={b.status === "voided" ? "bg-red-100 text-red-700" : ""}>{b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{sym}{Number(b.total_amount).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sessions in this period</TableCell></TableRow>
                ) : sessions.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{(s as any).stations?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(s.started_at).toLocaleString()}</TableCell>
                    <TableCell>{s.duration_mins != null ? `${s.duration_mins} min` : s.ended_at ? "—" : "Active"}</TableCell>
                    <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell className="text-right">{s.total_amount != null ? `${sym}${Number(s.total_amount).toLocaleString()}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue by Payment Method</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48" /> : (
                  <div className="space-y-3">
                    {Object.entries(paymentBreakdown).length === 0 ? (
                      <p className="text-muted-foreground text-sm">No data</p>
                    ) : Object.entries(paymentBreakdown).sort(([, a], [, b]) => b - a).map(([method, amount]) => {
                      const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                      return (
                        <div key={method}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize font-medium">{method.replace("_", " ")}</span>
                            <span>{sym}{amount.toLocaleString()} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          {loading ? (
            <Skeleton className="h-64" />
          ) : sortedDays.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No data for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDays.reverse().map(([day, rev]) => (
                  <TableRow key={day}>
                    <TableCell className="font-medium">{new Date(day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{sym}{rev.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{sym}{totalRevenue.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
