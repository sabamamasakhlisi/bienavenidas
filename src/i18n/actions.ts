"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "./config";

/**
 * Persists the reader's language choice.
 *
 * Deliberately does not redirect or otherwise touch the URL — the caller pairs
 * this with `router.refresh()` so Server Components re-render against the new
 * cookie while the path stays exactly where it was.
 */
export async function setLocale(locale: string) {
  // Reachable by anyone, so validate rather than coerce.
  if (!isLocale(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}
