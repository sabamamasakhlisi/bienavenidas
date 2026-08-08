"use client";

import { useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { AddToCart } from "./AddToCart";
import { BookCover } from "./BookCover";
import { Shelf } from "./Shelf";
import type { ShelfItem } from "./catalog";
import type { BookView } from "./view";

/**
 * The page below the shelf.
 *
 * Reading state lives here because the shelf and the quotes share it: a quote
 * shows on its own until it is opened, and clicking a title up on the shelf is
 * just another way of opening the same section.
 *
 * Hovering a quote lifts that book's cover onto the pointer. The follower is
 * positioned by writing `style.transform` directly on each pointermove — at
 * pointer frequency, routing that through state would re-render every section.
 * Which book is hovered is derived from the event target rather than per-quote
 * enter/leave handlers, so the two can never disagree.
 */
export function Reader({
  views,
  layout,
  shelfHint,
}: {
  views: BookView[];
  layout: ShelfItem[];
  shelfHint: string;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [hovered, setHovered] = useState<BookView | null>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("libros");

  const titled = Object.fromEntries(
    views.map((view) => [view.book.slug, { book: view.book, title: view.title }]),
  );

  function open(slug: string) {
    setOpenSlug(slug);
    const target = document.getElementById(`book-${slug}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
  }

  function trackPointer(event: React.PointerEvent) {
    const node = followerRef.current;
    if (node) {
      node.style.transform = `translate3d(${event.clientX + 18}px, ${
        event.clientY - 40
      }px, 0)`;
    }

    const slug = (event.target as Element | null)
      ?.closest<HTMLElement>("[data-quote-slug]")
      ?.dataset.quoteSlug;

    const next = slug
      ? (views.find((view) => view.book.slug === slug) ?? null)
      : null;
    if (next?.book.slug !== hovered?.book.slug) setHovered(next);
  }

  return (
    <>
      <Shelf
        layout={layout}
        books={titled}
        hint={shelfHint}
        onSelect={open}
      />

      <div onPointerMove={trackPointer} onPointerLeave={() => setHovered(null)}>
        {views.map((view, index) => {
          const isOpen = openSlug === view.book.slug;
          const quoteFirst = index % 2 === 0;

          const quote = (
            <button
              type="button"
              data-quote-slug={view.book.slug}
              aria-expanded={isOpen}
              aria-controls={isOpen ? `details-${view.book.slug}` : undefined}
              onClick={() => setOpenSlug(isOpen ? null : view.book.slug)}
              className="quote max-w-[46ch] cursor-pointer text-start text-[15px] whitespace-pre-line text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground md:text-[17px]"
            >
              {view.quote}
            </button>
          );

          // Rendered only when open, rather than hidden with CSS: the closed
          // state is genuinely just the quote.
          const details = !isOpen ? null : (
            <div id={`details-${view.book.slug}`} className="contents">
              <div
                className="aspect-[2/3] w-full max-w-[220px] justify-self-center"
                style={{
                  aspectRatio: String(view.book.coverAspect ?? 0.66),
                  containerType: "inline-size",
                }}
              >
                <BookCover
                  book={view.book}
                  title={view.title}
                  sizes="(max-width: 768px) 60vw, 220px"
                />
              </div>

              <div className="flex max-w-[42ch] flex-col gap-3 text-[12px] leading-relaxed">
                <h2 className="bask-font text-[15px] italic">
                  {view.title}
                  <span className="not-italic">, {view.author}</span>
                </h2>

                <p className="text-muted">{view.description}</p>

                {view.credits && (
                  <p className="whitespace-pre-line text-muted">
                    {view.credits}
                  </p>
                )}

                <div className="mt-2">
                  {view.isOpenCall ? (
                    <p className="bg-brand px-4 py-2 text-center text-[13px]">
                      {t("openCall")}
                    </p>
                  ) : (
                    <AddToCart
                      book={view.book}
                      title={view.title}
                      price={view.price}
                    />
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <section
              key={view.book.slug}
              id={`book-${view.book.slug}`}
              tabIndex={-1}
              className="grid scroll-mt-16 grid-cols-1 items-start gap-10 px-6 py-20 md:grid-cols-[1fr_auto_1fr] md:gap-12 md:px-16 md:py-28"
            >
              {quoteFirst ? (
                <>
                  {quote}
                  {details}
                </>
              ) : (
                <>
                  {details}
                  {quote}
                </>
              )}
            </section>
          );
        })}
      </div>

      {/* Cover that rides the pointer while a quote is hovered. */}
      <div
        ref={followerRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-50 w-40 will-change-transform"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {hovered && (
          <div
            className="w-full shadow-2xl"
            style={{
              aspectRatio: String(hovered.book.coverAspect ?? 0.66),
              containerType: "inline-size",
            }}
          >
            <BookCover book={hovered.book} title={hovered.title} />
          </div>
        )}
      </div>
    </>
  );
}
