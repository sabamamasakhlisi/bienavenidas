import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * The newsletter list (schema in `supabase/migrations/`).
 *
 * Server only — the key this uses can read the whole list, which is personal
 * data. Never import it from a client component.
 */

export type SubscribeOutcome = "saved" | "already" | "unconfigured" | "failed";

/**
 * Adds an address to the list, or quietly does nothing if it is already there.
 *
 * Re-subscribing is an upsert rather than an error: someone who signs up twice
 * has not done anything wrong, and telling them "you are already on the list"
 * would leak who is on it to anyone who cares to guess. Both cases say the
 * same thing to the visitor; the distinction here is only for the logs.
 *
 * A previously unsubscribed address is revived, because asking again is asking
 * again — but `created_at` is left alone, so the original sign-up date stands.
 */
export async function addSubscriber(
  email: string,
  locale: string,
): Promise<SubscribeOutcome> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[supabase] newsletter: NOT CONFIGURED — sign-up discarded. Set SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
    return "unconfigured";
  }

  const address = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase()
      .from("newsletter_subscribers")
      .upsert(
        { email: address, locale, unsubscribed_at: null },
        { onConflict: "email", ignoreDuplicates: false },
      )
      .select("created_at");

    if (error) throw error;

    // A row whose `created_at` predates this request was already on the list.
    const createdAt = data?.[0]?.created_at as string | undefined;
    const isNew = createdAt
      ? Date.now() - new Date(createdAt).getTime() < 5000
      : true;

    console.log(
      `[supabase] newsletter: ${isNew ? "added" : "already subscribed"} (${locale})`,
    );

    return isNew ? "saved" : "already";
  } catch (error) {
    console.error("[supabase] newsletter: could not save sign-up", error);
    return "failed";
  }
}
