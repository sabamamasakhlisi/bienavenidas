"use client";

import { useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { AddToCart } from "./AddToCart";
import { BookCover } from "./BookCover";
import { FadedText } from "./FadedText";
import { NotifyLink } from "./NotifyLink";
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
 * Two layouts, because the interaction differs and not just the widths. On a
 * pointer the entry is a quote you open; on a phone there is nothing to hover,
 * so every entry stands open from the start and the long text is what gives —
 * quote and description each get a fixed height and scroll inside it. Both are
 * in the markup and CSS picks one, which keeps the server render and the first
 * client paint identical at either size.
 *
 * Hovering a quote lifts that book's cover onto the pointer. The follower is
 * positioned by writing `style.transform` directly on each pointermove — at
 * pointer frequency, routing that through state would re-render every section.
 * Which book is hovered is derived from the event target rather than per-quote
 * enter/leave handlers, so the two can never disagree.
 */
/** The quote is set in the accent on mobile, as in the design. */
const QUOTE_COLOUR = "#F5C8E8";

export function Reader({
  views,
  layout,
  intro,
  shelfHint,
}: {
  views: BookView[];
  layout: ShelfItem[];
  intro: readonly string[];
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
    // The follower is a cover carried on the cursor; a finger has no cursor to
    // carry it on, and a drag would leave it stranded mid-page.
    if (event.pointerType !== "mouse") return;

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

  // The open call is a submissions notice, not a title to read and buy, so it
  // stands on the shelf but gets no reading block.
  const reading = views.filter(
    (view) => view.book.slug !== "open-call-sad-girls",
  );

  return (
    <>
      <Shelf
        layout={layout}
        books={titled}
        intro={intro}
        hint={shelfHint}
        onSelect={open}
      />

      <div onPointerMove={trackPointer} onPointerLeave={() => setHovered(null)}>
        {reading.map((view, index) => {
          const isOpen = openSlug === view.book.slug;

          // Zig-zag: the first block sits left, the next right, alternating
          // down the page. Keyed off display position rather than catalogue
          // position, so hiding an entry doesn't break the rhythm.
          const onLeft = index % 2 === 0;

          // Mirrored rather than merely nudged across: a right-hand block runs
          // its columns in reverse and sets its text to match, so the quote
          // still hugs the outer edge and the two sides read as a pair.
          // Logical properties (`text-start`/`text-end`) keep that true if an
          // RTL locale is ever added.
          // `items-*` does double duty: stacked on mobile it decides which
          // edge the blocks line up against, but in a desktop row it becomes
          // vertical alignment — so both sides are pinned to the top there, or
          // the right-hand quote would sink to the bottom of its row.
          const alignment = onLeft
            ? "items-start text-start md:flex-row md:items-start"
            : "items-end text-end md:flex-row-reverse md:items-start";

          // Whatever stands where the price stands. Built once and placed by
          // both layouts, so the three cases can't drift apart.
          const control = view.isOpenCall ? (
            <p className="bg-brand px-4 py-2 text-center text-[13px]">
              {t("openCall")}
            </p>
          ) : view.isComingSoon ? (
            <NotifyLink title={view.title} />
          ) : (
            <AddToCart
              book={view.book}
              title={view.title}
              price={view.price}
            />
          );

          return (
            <section
              key={view.book.slug}
              id={`book-${view.book.slug}`}
              tabIndex={-1}
              className="scroll-mt-16 px-6 py-12 md:px-16 md:py-28"
            >
              {/* Phones and small tablets. Always expanded: with no hover there
                  is nothing to reveal the entry with, and a tap that only
                  unfolds text is a tap that reads as a dead end. */}
              <div className="md:hidden">
                <div className="grid grid-cols-2 gap-x-2">
                  <div className="flex flex-col gap-3 text-[12px] leading-relaxed">
                    <h2 className="bask-font text-[15px] italic">
                      {view.title}
                      <span className="not-italic">, {view.author}</span>
                    </h2>

                    {view.credits && (
                      <p className="whitespace-pre-line text-muted">
                        {view.credits}
                      </p>
                    )}

                    {/* Pushed to the foot of its column so it lands level with
                        the bottom of the cover beside it. */}
                    <div className="mt-auto w-full">{control}</div>
                  </div>

                  <div
                    className="w-full"
                    style={{
                      aspectRatio: String(view.book.coverAspect ?? 0.66),
                      containerType: "inline-size",
                    }}
                  >
                    <BookCover
                      book={view.book}
                      title={view.title}
                      image={view.book.detailImage}
                      sizes="45vw"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 items-start gap-x-2">
                  <FadedText>
                    <p
                      className="quote text-[15px] whitespace-pre-line"
                      style={{ color: QUOTE_COLOUR }}
                    >
                      {view.quote}
                    </p>
                  </FadedText>

                  <FadedText>
                    <p className="text-[15px] leading-relaxed">
                      {view.description}
                    </p>
                  </FadedText>
                </div>
              </div>

              {/* From `md`: the quote on its own until you open it. */}
              <div className="hidden w-full md:block">
                <div
                  className={`flex w-full flex-col gap-8 md:gap-12 ${alignment}`}
                >
                  <button
                    type="button"
                    data-quote-slug={view.book.slug}
                    aria-expanded={isOpen}
                    aria-controls={
                      isOpen ? `details-${view.book.slug}` : undefined
                    }
                    onClick={() => setOpenSlug(isOpen ? null : view.book.slug)}
                    // Buttons are centred by the UA stylesheet, which beats
                    // the alignment inherited from the block — so state it.
                    className={`quote max-w-[46ch] cursor-pointer text-[15px] whitespace-pre-line text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground md:text-[17px] ${
                      onLeft ? "text-start" : "text-end"
                    }`}
                  >
                    {view.quote}
                  </button>

                  {/* Opens alongside the quote, not beneath it — and only when
                      open, because the closed state is genuinely just the
                      quote. */}
                  {isOpen && (
                    <div
                      id={`details-${view.book.slug}`}
                      // Takes the width the quote doesn't, rather than sizing
                      // to its own contents — otherwise the cover and colophon
                      // are squeezed into a column barely wider than the cover.
                      // `min-w-0` lets it shrink past its content when the
                      // quote is long.
                      className={`flex w-full min-w-0 flex-col gap-8 md:gap-12 ${alignment}`}
                    >
                      <div
                        className="w-full max-w-[200px] shrink-0"
                        style={{
                          aspectRatio: String(view.book.coverAspect ?? 0.66),
                          containerType: "inline-size",
                        }}
                      >
                        <BookCover
                          book={view.book}
                          title={view.title}
                          image={view.book.detailImage}
                          sizes="(max-width: 768px) 60vw, 200px"
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

                        <div className="mt-2 w-full">{control}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
