import type { Metadata } from "next";

import { getLocale, getTranslations } from "next-intl/server";

import { PannableImage } from "@/features/editorial/PannableImage";
import { openGraphFor } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bienvenidas");
  const tMeta = await getTranslations("metadata.pages");
  const description = tMeta("bienvenidas");

  return {
    title: t("title"),
    description,
    alternates: { canonical: "/bienvenidas" },
    openGraph: openGraphFor({
      title: t("title"),
      description,
      path: "/bienvenidas",
      locale: await getLocale(),
    }),
  };
}

export default async function BienvenidasPage() {
  const t = await getTranslations("bienvenidas");

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>

      <PannableImage
        src="/poster_bienavenidas.jpg"
        avifSrc="/poster_bienavenidas.avif"
        webpSrc="/poster_bienavenidas.webp"
        alt={t("imageAlt")}
        width={2966}
        height={4200}
        label={t("panLabel")}
        // Sampled from the poster's own corners and edge midpoints, which sit
        // between #c7c7c7 and #d0d0d0.
        background="#cfcfcf"
      />
    </>
  );
}
