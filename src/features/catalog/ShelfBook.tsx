"use client";

import type { CSSProperties } from "react";

import type { Book } from "@/types/book";

import { BookCover } from "./BookCover";

/** How long the book takes to turn round, in ms. */
const SWING_MS = 700;

/**
 * Open: the cover square to the reader, the turn carried right through.
 *
 * Zero, so the book finishes what it started. Stopping a few degrees short
 * leaves a sliver of spine showing and keeps the thing reading as an object
 * rather than a picture — but it also reads as a turn that ran out of travel,
 * and a cover you are being asked to look at is better looked at straight on.
 * The dimensionality has to carry in the turn itself now, not in the pose it
 * lands in.
 */
const OPEN_DEG = 0;

/** Closed: the cover is edge-on behind the spine, and nothing of it shows. */
const SHUT_DEG = 90;

const RAD = Math.PI / 180;

/**
 * A real title on the shelf.
 *
 * Not a cover that fades in over a spine: a book is a box, and both faces of
 * it are here — the front cover and the spine, set at a right angle to one
 * another the way they are on the real thing. Opening turns the whole box on
 * the axis running down its own middle, so the spine sweeps round and out of
 * sight while the cover comes round to face you. Halfway through, both are in
 * view at once, and that is the moment that reads as thickness.
 *
 * Turning on its own axis rather than on one edge is the difference between a
 * book being *turned round* and a cover being *swung open*. An edge pivot
 * nails one corner to the shelf and sweeps the cover off it like a door — the
 * book never moves, only the flap does. Here nothing is nailed down: the box
 * revolves in place, which is what your hand does to a book you have picked
 * up to look at.
 *
 * The turn runs cover-first — closed, the cover is edge-on *behind* the
 * spine, and it comes round towards the reader. Going the other way is the
 * same rotation read backwards, and looks like the book being put away.
 *
 * Its width is handed down by the shelf, which computes every item's together
 * so the whole row eases as one, and the angle travels as a custom property
 * that `.shelf-turn` in `globals.css` reads.
 */
export function ShelfBook({
  book,
  title,
  open,
  width,
  openWidth,
  closedWidth,
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
  /** Width of the spine, i.e. how thick the book is. */
  closedWidth: number;
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

  const swing = open ? OPEN_DEG : SHUT_DEG;

  /**
   * How far back the turning box is set, so that it never comes through the
   * front of the shelf.
   *
   * A box revolving on its own axis swings half of itself towards the reader,
   * and the corner leading that half would otherwise stand a good half-cover
   * proud of everything beside it — near enough to the eye to be visibly
   * magnified, so a closed book would sit larger than the spines it stands
   * among. This is the depth of that leading corner at the angle the book is
   * at, pushed back out again: closed, the spine lands exactly on the shelf's
   * own plane, and open, the cover does.
   */
  const rad = swing * RAD;
  const push = -(
    (openWidth / 2) * Math.sin(rad) +
    (closedWidth / 2) * Math.cos(rad)
  );

  return (
    <button
      type="button"
      data-book-slug={book.slug}
      aria-expanded={open}
      onClick={() => onSelect(book.slug)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={
        {
          width: `${width}px`,
          height: `${height}px`,
          transform: `rotate(${book.shelfLean ?? 0}deg)`,
          transitionDuration: `${SWING_MS}ms`,
          containerType: "inline-size",
          "--foot": `${foot}px`,
          "--foot-md": `${footWide}px`,
          // Read by the `.shelf-*` rules in `globals.css`. Declared here on
          // the button rather than on the box they describe, so the
          // reduced-motion rules further down can redeclare them.
          // The two faces of the box, which are also what places them: each
          // is centred on the axis the whole thing turns about.
          "--spine-w": `${closedWidth}px`,
          "--face": `${openWidth}px`,
          // How far the eye stands off the shelf. Tied to the book's own width
          // so a narrow cover and a wide one turn through the same amount of
          // foreshortening, rather than the wide one looking flatter.
          "--eye": `${openWidth * 3.2}px`,
          "--swing": `${swing}deg`,
          "--push": `${push}px`,
          "--swing-ms": `${SWING_MS}ms`,
          "--shut": open ? "0" : "1",
        } as CSSProperties
      }
      className="shelf-item relative max-h-full shrink-0 origin-bottom cursor-pointer transition-[width] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
    >
      <div className="shelf-box absolute inset-0">
        <div className="shelf-turn">
          {/* The front cover, standing a half-spine in front of the axis. */}
          <div className="shelf-cover absolute inset-y-0">
            <BookCover
              book={book}
              title={title}
              sizes="(max-width: 768px) 40vw, 22vw"
            />

            {/* Light falls across the shelf from the front left, so whichever
                edge turns away from it goes down. Only the strength moves;
                the fall itself is fixed to the face. */}
            <div
              aria-hidden
              className="shelf-shade shelf-shade--cover absolute inset-0"
            />
          </div>

          {/* The spine, set at a right angle across the cover's leading edge:
              square to the reader while the book is closed, and swinging away
              behind it as the box comes round. */}
          <div
            aria-hidden
            style={{
              backgroundColor: book.spineImage
                ? undefined
                : (book.spine?.color ?? "#4d3738"),
            }}
            className="shelf-spine-face absolute inset-y-0 overflow-hidden"
          >
            {book.spineImage && (
              <BookCover
                book={book}
                title={title}
                image={book.spineImage}
                // Only bites when the picture is wider than the spine box,
                // i.e. when the art is borrowed from elsewhere and cropped.
                position={
                  book.spineFrom ? (book.spineFocus ?? "left") : undefined
                }
                // Wide enough for the broadest spine on the shelf at a high
                // pixel ratio — 60px asked for a source barely wider than the
                // box, which a retina screen then had to stretch.
                sizes="120px"
              />
            )}

            <div
              aria-hidden
              className="shelf-shade shelf-shade--spine absolute inset-0"
            />
          </div>
        </div>
      </div>
    </button>
  );
}
