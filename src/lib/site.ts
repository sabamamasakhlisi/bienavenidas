/**
 * Where the site lives and what it's called, for anything that has to write
 * an absolute address: canonical links, the sitemap, share cards, structured
 * data.
 */

export const SITE_NAME = "BIEN*VENIDAS";

export const CONTACT_EMAIL = "hola@bienavenidas.com";

/**
 * Absolute origin for canonical links. `NEXT_PUBLIC_SITE_URL` wins when set;
 * otherwise Vercel's production domain, which it exposes on every deployment
 * (previews included, so a preview never claims to be the canonical copy).
 */
export function siteUrl(): URL | undefined {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  return undefined;
}

/** A path on this site as a full URL; the path itself when no origin is known. */
export function absoluteUrl(path: string): string {
  const base = siteUrl();
  return base ? new URL(path, base).toString() : path;
}

/**
 * Text cut to what a search result or share card shows (about 155
 * characters), at a word boundary so it never ends mid-word.
 */
export function summarize(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:—-]+$/, "")}…`;
}

/** JSON-LD for a <script> tag. `<` is escaped so no string can close it. */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The site-wide share card: the monogram on the brand colour, 1200×630. */
export const DEFAULT_SHARE_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: SITE_NAME,
};

/**
 * Open Graph for one page.
 *
 * Next.js replaces a parent's `openGraph` wholesale rather than merging it, so
 * every page that sets its own states the site-wide fields again; this keeps
 * them in one place.
 */
export function openGraphFor({
  title,
  description,
  path,
  locale,
  images = [DEFAULT_SHARE_IMAGE],
}: {
  title: string;
  description: string;
  /** The page's own address; left out on the site-wide defaults. */
  path?: string;
  locale: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
}) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: locale === "en" ? "en_GB" : "es_ES",
    ...(path ? { url: path } : {}),
    title,
    description,
    images,
  };
}

/**
 * The shop's tax ID, for the legal pages.
 */
export const OWNER_NIF = "71955193S";
