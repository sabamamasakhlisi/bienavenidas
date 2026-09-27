import { getSellableBySlug } from "@/features/catalog/sellable";
import { recordOrder, type OrderItem } from "@/features/checkout/inventory";
import { getPaidOrder, verifyWebhook } from "@/features/checkout/stripe";
import { defaultLocale } from "@/i18n/config";

/**
 * Stripe → Supabase.
 *
 * When a Checkout session is paid, Stripe calls this endpoint; the order and
 * its delivery details are saved and the copies come off the stock count.
 * Cards that settle later (`async_payment_succeeded`) are recorded when the
 * money actually arrives, not before.
 *
 * Register it in the Stripe dashboard as `https://<site>/api/stripe/webhook`
 * for the two events below, and put its signing secret in
 * `STRIPE_WEBHOOK_SECRET`. Locally, Stripe cannot reach your machine at all:
 * run `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded
 * --forward-to localhost:3000/api/stripe/webhook` and use the secret it prints.
 */

/**
 * Fills in what Stripe could not say.
 *
 * A line bought through a linked Stripe price carries that product's name and
 * metadata, not ours — so an order can come back titled `joven-chica`, with no
 * ISBN, because that is what the Stripe product is called. The catalogue knows
 * both, keyed by the slug the lookup key already gave us.
 *
 * Only ever fills gaps: whatever Stripe did tell us is what the customer saw
 * on their receipt, and the order book should agree with the receipt.
 *
 * Titles fall back in the default locale, not the buyer's: this is the shop's
 * own record, read by whoever packs the parcel, and an order book in mixed
 * languages is harder to work from than one that is consistently in Spanish.
 * A merch line has no ISBN to fill, and stays null.
 */
async function withCatalogueDetails(items: OrderItem[]): Promise<OrderItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const sellable = item.slug
        ? await getSellableBySlug(item.slug, defaultLocale)
        : undefined;
      if (!sellable) return item;

      return {
        ...item,
        title:
          item.title && item.title !== item.slug ? item.title : sellable.title,
        isbn: item.isbn ?? sellable.isbn,
      };
    }),
  );
}
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event;
  try {
    // The raw body, byte for byte: the signature is computed over it.
    event = verifyWebhook(await request.text(), signature);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (session.payment_status !== "paid") {
      return new Response("Awaiting payment", { status: 200 });
    }

    try {
      const order = await getPaidOrder(session);
      await recordOrder({
        ...order,
        items: await withCatalogueDetails(order.items),
      });
    } catch (error) {
      // A 500 makes Stripe retry, and `record_order` is idempotent.
      console.error("Could not record order", session.id, error);
      return new Response("Could not record order", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
