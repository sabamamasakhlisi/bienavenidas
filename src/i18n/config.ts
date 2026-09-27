/**
 * Locale primitives shared by the proxy, the request config and the UI.
 *
 * This module is deliberately free of `next-intl` and `next/*` imports so it can
 * run in the proxy, in Server Components and in Client Components alike.
 */

export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

/**
 * Runs the site in a single language.
 *
 * While this is set, negotiation is bypassed everywhere — the proxy, the
 * request config and any stored cookie from an earlier visit — and the header
 * hides the `es/en` switch, because a switch that cannot change anything is
 * worse than no switch. Nothing else is removed: set this to `null` and both
 * locales come straight back.
 */
export const pinnedLocale: Locale | null = "es";

/** Cookie that carries the locale. The URL never does. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Text direction per locale. Both current locales are LTR; adding an RTL
 * locale should be a change here rather than a rewrite of the layout. */
const directions: Record<Locale, "ltr" | "rtl"> = {
  es: "ltr",
  en: "ltr",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function dirFor(locale: Locale) {
  return directions[locale];
}

/** Countries where English is the better first guess when the browser tells us
 * nothing useful. Everything else falls back to Spanish. */
const englishCountries = new Set(["US", "GB", "CA", "AU", "NZ", "IE"]);

/**
 * Picks a locale from an `Accept-Language` header, honouring q-weights.
 *
 * `country` is the IP-geolocation fallback (e.g. `x-vercel-ip-country`) and is
 * only consulted when the header yields no supported match.
 */
export function negotiateLocale(
  acceptLanguage?: string | null,
  country?: string | null,
): Locale {
  if (pinnedLocale) return pinnedLocale;

  const fromHeader = parseAcceptLanguage(acceptLanguage);
  if (fromHeader) return fromHeader;

  if (country) {
    return englishCountries.has(country.toUpperCase()) ? "en" : defaultLocale;
  }

  return defaultLocale;
}

function parseAcceptLanguage(header?: string | null): Locale | undefined {
  if (!header) return undefined;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);

      return {
        // `en-GB` and `EN` both need to match the `en` locale.
        language: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  return ranked.find((entry) => isLocale(entry.language))?.language as
    | Locale
    | undefined;
}
