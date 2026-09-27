import type { Merch } from "@/types/merch";
import type { Locale } from "@/i18n/config";

/**
 * The merch catalogue.
 *
 * Shaped like `catalog.ts` and kept beside it, but separate: these are not
 * books and do not stand on the shelf. Artwork resolves from `public/merch/`
 * by slug, the same way covers do — see `covers.ts`.
 */
const merch: Merch[] = [
  {
    slug: "camiseta-me-hirieron",
    title: "Camiseta < Me hirieron en lo más preciado >",
    price: { amount: 2000, currency: "EUR" },
    credits:
      "Edición limitada de 20 unidades.\nSerigrafía por PinkRed.\nDiseño por Bernardina Studio",
    // The photograph is very nearly square; `object-contain` keeps the whole
    // shirt in frame, so this only reserves the right box before it loads.
    imageAspect: 0.964,
    imageTilt: -9.31,
    // Between the two books, where the design puts it.
    after: "joven-chica",
    // Each size is its own sellable slug, and its own row in `stock`.
    variants: [
      { slug: "camiseta-me-hirieron-baby-tee", label: "baby tee" },
      { slug: "camiseta-me-hirieron-xl", label: "XL" },
    ],
    translations: {
      en: {
        title: "T-shirt < Me hirieron en lo más preciado >",
        credits:
          "Limited edition of 20.\nScreen printing by PinkRed.\nDesign by Bernardina Studio",
      },
    },
  },
];

export async function getAllMerch(): Promise<Merch[]> {
  return merch;
}

/** Resolves display copy for a locale, falling back to the item's own fields. */
export function localizeMerch(item: Merch, locale: Locale) {
  const translation = item.translations?.[locale];

  return {
    title: translation?.title ?? item.title,
    credits: translation?.credits ?? item.credits,
  };
}

/**
 * Finds the item a sellable slug belongs to, and which size it is.
 *
 * Callers hold a slug from a cart line or a Stripe lookup key and have no idea
 * it is a size of anything — which is the point of keying everything by slug.
 */
export async function getMerchVariantBySlug(slug: string) {
  for (const item of merch) {
    const variant = item.variants.find((candidate) => candidate.slug === slug);
    if (variant) return { item, variant };
  }
  return undefined;
}

/** The price a given size is sold at: its own, or the item's. */
export function variantPrice(item: Merch, variant: Merch["variants"][number]) {
  return variant.price ?? item.price;
}
