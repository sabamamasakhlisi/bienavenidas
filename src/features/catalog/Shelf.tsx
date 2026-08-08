"use client";

import type { Book } from "@/types/book";

import { BookCover } from "./BookCover";
import type { ShelfItem } from "./catalog";

type Titled = { book: Book; title: string };

/**
 * The full-height shelf.
 *
 * Presentational: clicking a title asks the reader below to open that book's
 * section. Hover behaviour lives with the quotes, not here.
 */
export function Shelf({
  layout,
  books,
  hint,
  onSelect,
}: {
  layout: ShelfItem[];
  books: Record<string, Titled>;
  hint: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <section
      aria-label={hint}
      className="relative flex h-[calc(100svh-2.25rem)] flex-col justify-end overflow-hidden"
    >
      {/* justify-between, because the design spreads the row edge to edge and
          lets the gaps fall between groups rather than packing everything in. */}
      <div className="flex flex-1 items-end justify-between gap-[3px] px-3 md:gap-[5px] md:px-6">
        {layout.map((item, index) => {
          if (item.kind === "spine") {
            return (
              <div
                key={`spine-${index}`}
                aria-hidden
                style={{
                  backgroundColor: item.color,
                  width: `${item.width}px`,
                  height: `${item.height}%`,
                  transform: `rotate(${item.lean ?? 0}deg)`,
                }}
                className="origin-bottom shrink-0"
              />
            );
          }

          const entry = books[item.slug];
          if (!entry) return null;

          return (
            <button
              key={item.slug}
              type="button"
              data-book-slug={item.slug}
              onClick={() => onSelect(item.slug)}
              style={{
                // Sized from width, not height: a cover's physical proportions
                // shouldn't change with the height of the reader's window.
                width: entry.book.shelfWidth ?? "min(20vw, 280px)",
                aspectRatio: String(entry.book.coverAspect ?? 0.66),
                transform: `rotate(${entry.book.shelfLean ?? 0}deg)`,
                containerType: "inline-size",
              }}
              className="relative max-h-full origin-bottom shrink-0 cursor-pointer transition-transform duration-300 hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            >
              <BookCover
                book={entry.book}
                title={entry.title}
                sizes="(max-width: 768px) 40vw, 22vw"
              />
            </button>
          );
        })}
      </div>

      {/* The shelf the books stand on. */}
      <div className="h-9 w-full shrink-0 bg-shelf md:h-12" />
    </section>
  );
}
