import { Badge } from "@/components/ui/badge";

type Customer = {
  id: string;
  name: string;
  membership_type: string;
};

type Props = {
  customer: Customer | null;
  rate: number;
  stationType: string;
  sym: string;
};

export function isMembershipActive(customer: { membership_type: string } | null): boolean {
  if (!customer) return false;
  return customer.membership_type === "premium" || customer.membership_type === "vip";
}

export default function StationInfo({ customer, rate, stationType, sym }: Props) {
  const isMember = isMembershipActive(customer);
  const rateLabel = stationType === "darts" ? "15 Min Rate:" : "Hourly Rate:";

  return (
    <div className="space-y-1.5 text-sm mb-2">
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs">{rateLabel}</span>
        <span className="font-semibold text-white/90">
          {sym}{rate}/{stationType === "darts" ? "15m" : "hr"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs">Customer:</span>
        <span className="font-medium text-white/90 truncate max-w-[150px]">
          {customer?.name || "Walk-in"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs">Status:</span>
        {isMember ? (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs h-5">
            Member ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="text-white/50 border-white/20 text-xs h-5">
            Non-Member
          </Badge>
        )}
      </div>
      {isMember && (
        <p className="text-xs text-green-400 text-right">50% discount applied</p>
      )}
    </div>
  );
}
