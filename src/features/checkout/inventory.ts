import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Stock and orders, kept in Supabase (schema in `supabase/migrations/`).
 *
 * Server only: this uses the service-role key, which bypasses row-level
 * security. Never import it from a client component.
 *
 * Without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` stock isn't checked
 * and orders aren't recorded, so the shop still runs locally without it.
 */

let client: SupabaseClient | null = null;

export function isInventoryConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Copies on hand for each slug. A slug missing from the result isn't
 * stock-tracked. Returns null when Supabase isn't configured.
 */
export async function getStock(
  slugs: string[],
): Promise<Map<string, number> | null> {
  if (!isInventoryConfigured()) return null;

  const { data, error } = await supabase()
    .from("stock")
    .select("slug, quantity")
    .in("slug", slugs);
  if (error) throw error;

  return new Map(data.map((row) => [row.slug as string, row.quantity as number]));
}

export type OrderItem = {
  slug: string;
  isbn: string | null;
  title: string;
  quantity: number;
  /** Unit price, minor units. */
  amount: number;
};

export type NewOrder = {
  stripeSessionId: string;
  email: string | null;
  phone: string | null;
  shippingName: string | null;
  shippingAddress: Record<string, string | null> | null;
  items: OrderItem[];
  amountTotal: number;
  currency: string;
};

/**
 * Saves a paid order and decrements stock in one transaction. Safe to call
 * again for the same session (Stripe retries webhooks): returns false and
 * changes nothing.
 */
export async function recordOrder(order: NewOrder): Promise<boolean> {
  const { data, error } = await supabase().rpc("record_order", {
    p_stripe_session_id: order.stripeSessionId,
    p_email: order.email,
    p_phone: order.phone,
    p_shipping_name: order.shippingName,
    p_shipping_address: order.shippingAddress,
    p_items: order.items,
    p_amount_total: order.amountTotal,
    p_currency: order.currency,
  });
  if (error) throw error;
  return data === true;
}
