import { getLocale, getTranslations } from "next-intl/server";

import { defaultLocale, isLocale } from "@/i18n/config";

import { Reader } from "./Reader";
import { getAllBooks, shelfLayout } from "./catalog";
import { attachCovers } from "./covers";
import { toView } from "./view";

/**
 * The catalogue view: shelf, then the quotes.
 *
 * Lives here rather than in a route file because it is served at both `/` and
 * `/libros` — the shelf is the front page. Sharing one component keeps the two
 * genuinely identical instead of two copies that drift.
 */
export async function CatalogPage() {
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const t = await getTranslations("libros");
  const books = attachCovers(await getAllBooks());

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>

      <Reader
        views={books.map((book) => toView(book, locale))}
        layout={shelfLayout}
        shelfHint={t("shelfHint")}
      />
    </>
  );
}
