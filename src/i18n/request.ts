import { cookies, headers } from "next/headers";

import { getRequestConfig } from "next-intl/server";

import {
  LOCALE_COOKIE,
  isLocale,
  negotiateLocale,
  pinnedLocale,
} from "./config";

/**
 * Resolves the active locale for every request.
 *
 * Detection is self-contained rather than delegated to the proxy: a first-time
 * visitor has no `NEXT_LOCALE` cookie yet, and we want their very first render
 * to already be in their language instead of correcting on a second request.
 * The proxy only persists the outcome.
 */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

async function resolveLocale() {
  // Checked before the cookie is even read. A cookie written before the site
  // was pinned would otherwise keep that reader in a language they can no
  // longer switch out of; and not reading the request at all is what lets
  // every page be rendered once and served from the CDN. Unpin, and pages go
  // back to rendering per request, since the cookie decides what they say.
  if (pinnedLocale) return pinnedLocale;

  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  const headerStore = await headers();
  return negotiateLocale(
    headerStore.get("accept-language"),
    headerStore.get("x-vercel-ip-country"),
  );
}
