import { supabase } from "@/integrations/supabase/client";

export type BillDeleteInput = {
  id: string;
  customer_id: string | null;
  loyalty_points_earned: number;
  loyalty_points_used: number;
  total_amount: number;
};

/** Revert stock, customer aggregates, remove items and bill row. */
export async function deleteBillAndRevert(b: BillDeleteInput): Promise<{ error: Error | null }> {
  try {
    const { data: items } = await supabase.from("bill_items").select("*").eq("bill_id", b.id);
    for (const item of items || []) {
      const row = item as { product_id?: string | null; item_type?: string; qty?: number };
      if (row.product_id && row.item_type === "product") {
        const { data: prod } = await supabase.from("products").select("stock").eq("id", row.product_id).single();
        if (prod) {
          await supabase
            .from("products")
            .update({ stock: (prod as { stock: number }).stock + (Number(row.qty) || 0) })
            .eq("id", row.product_id);
        }
      }
    }

    if (b.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("loyalty_points, total_spend, visit_count")
        .eq("id", b.customer_id)
        .single();
      if (cust) {
        const c = cust as { loyalty_points: number; total_spend: number; visit_count: number };
        await supabase
          .from("customers")
          .update({
            loyalty_points: Math.max(0, (c.loyalty_points || 0) - (b.loyalty_points_earned || 0) + (b.loyalty_points_used || 0)),
            total_spend: Math.max(0, (c.total_spend || 0) - Number(b.total_amount)),
            visit_count: Math.max(0, (c.visit_count || 1) - 1),
          })
          .eq("id", b.customer_id);
      }
    }

    await supabase.from("bill_items").delete().eq("bill_id", b.id);
    const { error } = await supabase.from("bills").delete().eq("id", b.id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
