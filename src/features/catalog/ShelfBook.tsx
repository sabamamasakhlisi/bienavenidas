"use client";

import type { CSSProperties } from "react";

import type { Book } from "@/types/book";

import { BookCover } from "./BookCover";

/** How long the cover takes to swing open, in ms. */
const SWING_MS = 700;

/**
 * A real title on the shelf.
 *
 * It stands closed — a spine, like everything around it — and swings open on
 * its left edge to show the cover. Its width is handed down by the shelf,
 * which computes every item's width together so the whole row eases as one.
 *
 * Under reduced motion the 3D swing is dropped and the cover simply fades up
 * in place: less movement, but the shelf still shows you what it's doing.
 */
export function ShelfBook({
  book,
  title,
  open,
  width,
  openWidth,
  onSelect,
  onFocus,
  onBlur,
  foot = 0,
  footWide = 0,
}: {
  book: Book;
  title: string;
  open: boolean;
  /** Current width in px, already scaled and squeezed by the shelf. */
  width: number;
  /** Width this book takes when open — fixes the height so it never jumps. */
  openWidth: number;
  onSelect: (slug: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  /** Space on the leading edge so a leaning neighbour rests against this
   * rather than through it. The shelf works it out; see `clearances`. */
  foot?: number;
  footWide?: number;
}) {
  const coverAspect = book.coverAspect ?? 0.66;

  // Height comes from the open width and stays put through the swing, so the
  // book opens sideways rather than growing in every direction.
  const height = openWidth / coverAspect;

  return (
    <button
      type="button"
      data-book-slug={book.slug}
      aria-expanded={open}
      onClick={() => onSelect(book.slug)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${book.shelfLean ?? 0}deg)`,
        transitionDuration: `${SWING_MS}ms`,
        containerType: "inline-size",
        "--foot": `${foot}px`,
        "--foot-md": `${footWide}px`,
      } as CSSProperties}
      className="shelf-item relative max-h-full shrink-0 origin-bottom cursor-pointer transition-[width] ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
    >
      <div className="relative h-full w-full [perspective:900px]">
        {/* The cover, hinged on the spine edge. */}
        <div
          style={{
            transform: open ? "rotateY(0deg)" : "rotateY(-88deg)",
            transitionDuration: `${SWING_MS}ms`,
          }}
          className="absolute inset-0 origin-left transition-transform ease-out [backface-visibility:hidden] motion-reduce:opacity-100 motion-reduce:[transform:none]"
        >
          <BookCover
            book={book}
            title={title}
            sizes="(max-width: 768px) 40vw, 22vw"
          />
        </div>

        {/* The spine, showing while the book is closed. With the swing removed
            this is the only thing distinguishing the two states, so it fades
            rather than cutting. */}
        <div
          aria-hidden
          style={{
            width: `${Math.min(width, openWidth)}px`,
            opacity: open ? 0 : 1,
            backgroundColor: book.spineImage
              ? undefined
              : (book.spine?.color ?? "#4d3738"),
            transitionDuration: `${SWING_MS / 2}ms`,
          }}
          className="absolute inset-y-0 left-0 overflow-hidden transition-opacity ease-out"
        >
          {book.spineImage && (
            <BookCover
              book={book}
              title={title}
              image={book.spineImage}
              // Only bites when the picture is wider than the spine box, i.e.
              // when the art is borrowed from elsewhere and being cropped.
              position={book.spineFrom ? (book.spineFocus ?? "left") : undefined}
              // Wide enough for the broadest spine on the shelf at a high
              // pixel ratio — 60px asked for a source barely wider than the
              // box, which a retina screen then had to stretch.
              sizes="120px"
            />
          )}
        </div>
      </div>
    </button>
  );
}
