import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export type ProductForCard = {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock: number;
  track_stock: boolean;
  categories: { name: string } | null;
};

type Props = {
  product: ProductForCard;
  cartQty: number;   // how many already in cart
  onAddToCart: () => void;
  sym: string;
};

// ── Category visual config ─────────────────────────────────────────────────

const CAT_STYLES: Record<string, { border: string; glow: string }> = {
  food:       { border: "border-l-orange-500",  glow: "" },
  drinks:     { border: "border-l-blue-500",    glow: "" },
  tobacco:    { border: "border-l-red-500",     glow: "" },
  challenges: { border: "border-l-green-500",   glow: "" },
  membership: { border: "border-l-violet-500",  glow: "hover:shadow-violet-500/20 hover:shadow-lg" },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function ProductCard({ product, cartQty, onAddToCart, sym }: Props) {
  const catName = product.categories?.name?.toLowerCase()?.trim() || "";
  const styles = CAT_STYLES[catName] || { border: "border-l-muted-foreground/30", glow: "" };

  const isMembership = catName === "membership";
  const isChallenge = catName === "challenges";

  const remainingStock = product.track_stock ? product.stock - cartQty : Infinity;
  const isOutOfStock = !isMembership && product.track_stock && remainingStock <= 0;

  const showProfit = !isMembership && !isChallenge && product.cost_price !== null && product.cost_price >= 0;
  const profit = showProfit ? product.price - (product.cost_price ?? 0) : 0;

  const lowStock = product.track_stock && product.stock <= 10 && !isMembership;

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border border-l-4 p-3 flex flex-col gap-2 transition-all duration-200 bg-card",
        styles.border,
        styles.glow,
        isOutOfStock && "opacity-50"
      )}
    >
      {/* Cart badge */}
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-1 z-10 shadow">
          {cartQty}
        </div>
      )}

      {/* Name */}
      <p className="text-sm font-semibold leading-tight min-h-[2.5rem] line-clamp-2 flex-1">{product.name}</p>

      {/* Price + profit */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-base font-bold">{sym}{product.price.toFixed(0)}</span>
        {showProfit && profit > 0 && (
          <span className="text-xs text-green-500 font-medium">+{sym}{profit.toFixed(0)}</span>
        )}
      </div>

      {/* Stock indicator */}
      {!isMembership && product.track_stock && (
        <p className={cn("text-xs", lowStock ? "text-red-400 font-medium" : "text-muted-foreground")}>
          {remainingStock === Infinity ? "∞" : remainingStock}/{product.stock} left
        </p>
      )}

      {/* Add to Cart */}
      <Button
        size="sm"
        className="w-full h-7 text-xs mt-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-0 text-white"
        onClick={onAddToCart}
        disabled={isOutOfStock}
      >
        {isOutOfStock ? "Out of Stock" : (
          <><Plus className="h-3 w-3 mr-1" />Add to Cart</>
        )}
      </Button>
    </div>
  );
}
