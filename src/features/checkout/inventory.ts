import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Stock and orders, kept in Supabase (schema in `supabase/migrations/`).
 *
 * Server only: the client this uses bypasses row-level security. Never import
 * it from a client component.
 *
 * Without Supabase configured, stock isn't checked and orders aren't recorded,
 * so the shop still runs locally without it.
 */

/** Kept as a named re-export: callers ask about inventory, not about a client. */
export const isInventoryConfigured = isSupabaseConfigured;

/**
 * Where Supabase answers get written down.
 *
 * Checkout logs in every environment: it runs once per order, and when someone
 * says they were charged the wrong price or sold a book that wasn't on the
 * shelf, this is the only record of what the shop actually knew at the time.
 * Page renders log in development only — they fire on every request and would
 * bury the lines that matter.
 */
function log(always: boolean, message: string) {
  if (always || process.env.NODE_ENV !== "production") {
    console.log(`[supabase] ${message}`);
  }
}

/** Minor units as money, for a log line. `null` reads as what it means. */
function money(cents: number | null) {
  return cents === null ? "unpriced" : `€${(cents / 100).toFixed(2)}`;
}

/** What the shop's own record says about one title. */
export type InventoryRow = {
  /** Copies on hand. */
  quantity: number;
  /**
   * Unit price in minor units, or null where the title has not been priced
   * here. Never zero-as-free: a row priced 0 is one nobody has filled in, and
   * the catalogue's own price stands until it is.
   *
   * Read from `price_cents`, which the database derives from the euros in
   * `price` — that is the column a person edits, and this is the one that gets
   * charged. Reading the derived column rather than converting here is what
   * keeps the two from ever disagreeing.
   */
  price: number | null;
};

/**
 * Stock and price for each slug. A slug missing from the result isn't tracked
 * here at all. Returns null when Supabase isn't configured — which callers
 * must treat as "unknown", never as "none in stock".
 */
export async function getInventory(
  slugs: string[],
  { label, always = false }: { label: string; always?: boolean },
): Promise<Map<string, InventoryRow> | null> {
  const wanted = slugs.filter(Boolean);

  if (!isInventoryConfigured()) {
    // Loud, and not behind the `always` flag. This is the state that looks
    // exactly like a working shop and isn't one: no stock is being checked
    // and every price is coming from the catalogue.
    console.warn(
      `[supabase] ${label}: NOT CONFIGURED — stock unchecked, prices from the catalogue. Set SUPABASE_URL and SUPABASE_SECRET_KEY.`,
    );
    return null;
  }

  log(always, `${label}: asking for ${wanted.length} — ${wanted.join(", ")}`);

  const startedAt = Date.now();
  const { data, error } = await supabase()
    .from("stock")
    .select("slug, quantity, price_cents")
    .in("slug", wanted);

  if (error) {
    console.error(`[supabase] ${label}: query failed`, {
      wanted,
      code: error.code,
      message: error.message,
      hint: error.hint,
    });
    throw error;
  }

  const rows = new Map(
    data.map((row) => [
      row.slug as string,
      {
        quantity: row.quantity as number,
        price:
          typeof row.price_cents === "number" && row.price_cents > 0
            ? row.price_cents
            : null,
      } satisfies InventoryRow,
    ]),
  );

  const summary =
    [...rows]
      .map(([slug, row]) => `${slug} ×${row.quantity} @ ${money(row.price)}`)
      .join(" · ") || "(no rows — nothing here is stock-tracked)";

  log(
    always,
    `${label}: got ${rows.size}/${wanted.length} in ${Date.now() - startedAt}ms — ${summary}`,
  );

  // A slug the shop has never heard of sells freely and at its catalogue
  // price, which is correct but worth seeing while a catalogue is being set up.
  const untracked = wanted.filter((slug) => !rows.has(slug));
  if (untracked.length > 0) {
    log(always, `${label}: no row for ${untracked.join(", ")} — not tracked`);
  }

  return rows;
}

/**
 * A single round trip that proves the whole path: the key is present, the
 * client builds, the request is authorised and the table answers. Used by the
 * development-only health route, so a misconfiguration shows up as a plain
 * answer rather than as stock checks quietly not happening.
 */
export async function checkInventoryConnection(): Promise<
  | { ok: true; rows: { slug: string; quantity: number; price: number | null }[] }
  | { ok: false; reason: string }
> {
  if (!isInventoryConfigured()) {
    return {
      ok: false,
      reason:
        "SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are not both set",
    };
  }

  try {
    const { data, error } = await supabase()
      .from("stock")
      .select("slug, quantity, price_cents")
      .order("slug");
    if (error) throw error;

    return {
      ok: true,
      rows: data.map((row) => ({
        slug: row.slug as string,
        quantity: row.quantity as number,
        price: (row.price_cents as number | null) ?? null,
      })),
    };
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
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
  /** The stock hold this payment settles, from the session's metadata. */
  reservation: string | null;
};

/**
 * Holds copies while a customer is on Stripe's payment page, so a second
 * customer can't pay for the same last copy.
 *
 * All or nothing: returns the slugs that are short (and nothing is held), or
 * an empty list when every tracked line is now reserved under `reference`.
 * Returns null when Supabase isn't configured. Untracked titles are never
 * held. See `supabase/migrations/20260927130000_stock_reservations.sql`.
 */
export async function reserveStock(
  reference: string,
  items: { slug: string; quantity: number }[],
  expiresAt: Date,
): Promise<string[] | null> {
  if (!isInventoryConfigured()) return null;

  const { data, error } = await supabase().rpc("reserve_stock", {
    p_reference: reference,
    p_items: items.map(({ slug, quantity }) => ({ slug, quantity })),
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  const short = (data as { short_slug: string }[]).map((row) => row.short_slug);
  log(
    true,
    `reserve ${reference}: ${
      short.length ? `SHORT ${short.join(", ")}` : `held until ${expiresAt.toISOString()}`
    }`,
  );
  return short;
}

/** Lets a hold go early: its Stripe session expired or was never created. */
export async function releaseStock(reference: string): Promise<void> {
  if (!isInventoryConfigured()) return;
  const { error } = await supabase().rpc("release_stock", {
    p_reference: reference,
  });
  if (error) throw error;
  log(true, `released ${reference}`);
}

/**
 * Saves a paid order, settles its stock hold and decrements stock in one
 * transaction. Safe to call again for the same session (Stripe retries
 * webhooks): returns false and changes nothing. An order that takes stock
 * below zero is still saved — the money has been taken — and flagged
 * `oversold` in the table.
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
    p_reservation: order.reservation,
  });
  if (error) throw error;
  return data === true;
}
