import { getTranslations } from "next-intl/server";

import { PannableImage } from "@/features/editorial/PannableImage";

export default async function BienvenidasPage() {
  const t = await getTranslations("bienvenidas");

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>

      {/* Rendered far larger than any viewport so there is always somewhere to
          pan to, in both axes. These must keep the source's own proportions
          (2966 × 4200, portrait) — `object-cover` would otherwise crop the
          poster to a slice.

          Derived from the 124 MB original; regenerate all three with
          `pnpm poster`. */}
      <PannableImage
        src="/poster_bienavenidas.jpg"
        avifSrc="/poster_bienavenidas.avif"
        webpSrc="/poster_bienavenidas.webp"
        alt={t("imageAlt")}
        width={2966}
        height={4200}
        label={t("panLabel")}
      />
    </>
  );
}
