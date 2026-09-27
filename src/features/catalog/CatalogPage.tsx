import type { ReactNode } from "react";

import { getLocale, getTranslations } from "next-intl/server";

import { withLiveMerch, withLiveShop } from "@/features/checkout/live";
import { defaultLocale, isLocale } from "@/i18n/config";

import { MerchSection } from "./MerchSection";
import { Reader } from "./Reader";
import { getAllBooks, shelfIntro, shelfLayout } from "./catalog";
import { attachCovers, attachMerchArtAll } from "./covers";
import { getAllMerch } from "./merch";
import { toMerchView, toView } from "./view";

/**
 * The catalogue view: shelf, the quotes, then what else the shop sells.
 *
 * Lives here rather than in a route file because it is served at both `/` and
 * `/libros` — the shelf is the front page. Sharing one component keeps the two
 * genuinely identical instead of two copies that drift.
 */
export async function CatalogPage() {
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const t = await getTranslations("libros");
  const tBook = await getTranslations("book");
  const books = await withLiveShop(attachCovers(await getAllBooks()));
  const merch = await withLiveMerch(attachMerchArtAll(await getAllMerch()));

  // Merch says which entry it sits below; anything that names no entry, or
  // names one that isn't shown, falls to the end rather than vanishing.
  const shown = new Set(books.map((book) => book.slug));
  const afterEntry: Record<string, ReactNode[]> = {};
  const trailing: ReactNode[] = [];

  for (const item of merch) {
    const section = (
      <MerchSection
        key={item.slug}
        merch={toMerchView(item, locale, tBook("stock.out_of_stock"))}
      />
    );

    if (item.after && shown.has(item.after)) {
      (afterEntry[item.after] ??= []).push(section);
    } else {
      trailing.push(section);
    }
  }

  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>

      <Reader
        views={books.map((book) =>
          toView(book, locale, tBook(`stock.${book.stock}`)),
        )}
        layout={shelfLayout}
        intro={shelfIntro}
        shelfHint={t("shelfHint")}
        afterEntry={afterEntry}
      />

      {trailing}
    </>
  );
}
