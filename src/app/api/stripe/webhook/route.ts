import { recordOrder } from "@/features/checkout/inventory";
import { getPaidOrder, verifyWebhook } from "@/features/checkout/stripe";

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
 * `STRIPE_WEBHOOK_SECRET`.
 */
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
      await recordOrder(await getPaidOrder(session));
    } catch (error) {
      // A 500 makes Stripe retry, and `record_order` is idempotent.
      console.error("Could not record order", session.id, error);
      return new Response("Could not record order", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
