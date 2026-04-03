import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ColorScheme = "purple" | "green" | "blue" | "orange" | "cyan";

type Props = {
  isOccupied: boolean;
  stationType: string;
  colorScheme: ColorScheme;
  hasCustomers: boolean;
  onStartSession: () => void;
  onEndSession: () => void;
  endingSession?: boolean;
};

const START_GRADIENTS: Record<ColorScheme, string> = {
  purple: "from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600",
  green:  "from-green-600 to-green-700 hover:from-green-500 hover:to-green-600",
  blue:   "from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600",
  orange: "from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600",
  cyan:   "from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600",
};

export default function StationActions({ isOccupied, colorScheme, hasCustomers, onStartSession, onEndSession, endingSession }: Props) {
  if (isOccupied) {
    return (
      <Button
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-semibold"
        onClick={onEndSession}
        disabled={endingSession}
      >
        {endingSession ? "Ending…" : "End Session"}
      </Button>
    );
  }

  return (
    <Button
      className={cn("w-full bg-gradient-to-r text-white border-0 font-semibold", START_GRADIENTS[colorScheme])}
      onClick={onStartSession}
      disabled={!hasCustomers}
    >
      {hasCustomers ? "Start Session" : "No Customers Available"}
    </Button>
  );
}
