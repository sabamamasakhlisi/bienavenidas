import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { BookCover } from "@/features/catalog/BookCover";
import { NotifyLink } from "@/features/catalog/NotifyLink";
import {
  formatPrice,
  getAllBooks,
  getBookBySlug,
  localizeBook,
} from "@/features/catalog/catalog";
import { attachCover, shareImageFor } from "@/features/catalog/covers";
import { withLiveShopBook } from "@/features/checkout/live";
import { defaultLocale, isLocale } from "@/i18n/config";
import {
  SITE_NAME,
  absoluteUrl,
  jsonLd,
  openGraphFor,
  summarize,
} from "@/lib/site";
import type { Book } from "@/types/book";

type Props = {
  // `params` is a Promise as of Next.js 15 — it must be awaited.
  params: Promise<{ slug: string }>;
};

async function resolveLocale() {
  const locale = await getLocale();
  return isLocale(locale) ? locale : defaultLocale;
}

/** Every title is rendered at build time; see `revalidate` in the layout. */
export async function generateStaticParams() {
  const books = await getAllBooks();
  return books.map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);

  if (!book) {
    const t = await getTranslations("book");
    return { title: t("notFoundTitle") };
  }

  const locale = await resolveLocale();
  const { title, description } = localizeBook(book, locale);
  const summary = summarize(description);
  const image = shareImageFor(book);
  const path = `/libros/${book.slug}`;

  return {
    title,
    description: summary,
    alternates: { canonical: path },
    openGraph: openGraphFor({
      title,
      description: summary,
      path,
      locale,
      images: image ? [{ url: image, alt: title }] : undefined,
    }),
  };
}

/** schema.org availability for each stock status that can be ordered. */
const AVAILABILITY: Partial<Record<Book["stock"], string>> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  out_of_print: "https://schema.org/Discontinued",
};

/** ISBN-13 check digit. Placeholder numbers fail it and are left out. */
function isValidIsbn13(isbn: string) {
  if (!/^\d{13}$/.test(isbn)) return false;
  const sum = [...isbn.slice(0, 12)].reduce(
    (total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

/**
 * What search engines read about the title: a book that is also a product
 * for sale, so it can appear with its price and availability. Only facts
 * the page itself shows; nothing is offered for a title with no price.
 */
function bookJsonLd(book: Book, title: string, description: string) {
  const url = absoluteUrl(`/libros/${book.slug}`);
  const image = shareImageFor(book);
  const availability = AVAILABILITY[book.stock];

  return {
    "@context": "https://schema.org",
    "@type": ["Book", "Product"],
    name: title,
    url,
    description: summarize(description, 300),
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(isValidIsbn13(book.isbn) ? { isbn: book.isbn } : {}),
    author: book.authors.map((author) => ({
      "@type": "Person",
      name: author.name,
    })),
    publisher: { "@type": "Organization", name: SITE_NAME },
    numberOfPages: book.pageCount,
    datePublished: book.publishedAt,
    ...(availability && book.price.amount > 0
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: (book.price.amount / 100).toFixed(2),
            priceCurrency: book.price.currency,
            availability,
          },
        }
      : {}),
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const found = await getBookBySlug(slug);

  if (!found) {
    notFound();
  }

  const book = await withLiveShopBook(attachCover(found));

  const locale = await resolveLocale();
  const { title, subtitle, description } = localizeBook(book, locale);
  const t = await getTranslations("book");
  const tCommon = await getTranslations("common");

  const price = formatPrice(book.price, locale);
  const comingSoon = book.stock === "coming_soon";
  const soldOut =
    book.stock === "out_of_stock" || book.stock === "out_of_print";

  return (
    <Container className="py-20 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(bookJsonLd(book, title, description)),
        }}
      />

      <Link href="/libros" className="text-xs uppercase tracking-[0.2em] opacity-60">
        {tCommon("backToCatalogue")}
      </Link>

      <div
        className="mt-8 w-full max-w-[260px]"
        style={{
          aspectRatio: String(book.coverAspect ?? 0.66),
          containerType: "inline-size",
        }}
      >
        <BookCover
          book={book}
          title={title}
          image={book.detailImage}
          sizes="260px"
          priority
        />
      </div>

      <h1 className="bask-font mt-8 text-4xl md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 text-xl opacity-70">{subtitle}</p>}

      <p className="mt-6 text-sm opacity-60">
        {t("author")}: {book.authors.map((author) => author.name).join(", ")}
      </p>

      <p className="mt-10 max-w-2xl leading-relaxed">{description}</p>

      <dl className="mt-14 grid max-w-md grid-cols-2 gap-y-3 border-t border-foreground/10 pt-8 text-sm">
        <dt className="opacity-60">{t("isbn")}</dt>
        <dd>{book.isbn}</dd>

        <dt className="opacity-60">{t("pages")}</dt>
        <dd>{book.pageCount}</dd>

        <dt className="opacity-60">{t("published")}</dt>
        <dd>
          {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
            new Date(book.publishedAt),
          )}
        </dd>
      </dl>

      {/* Nothing is on sale until the book exists, so an unfinished title
          shows its status and a way to be told, not a price. */}
      {comingSoon ? (
        <div className="mt-10 max-w-[260px]">
          <p className="mb-3 text-lg">{t("stock.coming_soon")}</p>
          <NotifyLink title={title} />
        </div>
      ) : soldOut ? (
        <p className="mt-10 text-lg">{t(`stock.${book.stock}`)}</p>
      ) : (
        <p className="mt-10 text-lg">
          {price}{" "}
          <span className="text-sm opacity-60">{t(`stock.${book.stock}`)}</span>
        </p>
      )}
    </Container>
  );
}
