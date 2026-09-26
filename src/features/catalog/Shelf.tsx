"use client";

import { useEffect, useRef, useState } from "react";

import type { Book } from "@/types/book";

import { ShelfBook } from "./ShelfBook";
import type { ShelfItem } from "./catalog";

type Titled = { book: Book; title: string };

/** Intro timing, in ms. */
const INTRO_START = 500;
/** How long a non-final book stays open before closing again. */
const INTRO_HOLD = 1400;
/** Beat between one book closing and the next opening. */
const INTRO_GAP = 450;

/** Gap between items, in px. Must match the `gap-*` class below. */
const GAP = 5;

/** An open book never takes more than this share of the shelf. */
const MAX_OPEN_SHARE = 0.35;

/** Below this the shelf scrolls instead of squeezing. Matches Tailwind's `md`. */
const COMPACT_QUERY = "(max-width: 767px)";

/**
 * Whether opening has to be a tap. Asked of the pointer rather than the screen:
 * a tablet in landscape is wide enough for the squeezed shelf but still has no
 * hover to open anything with.
 */
const TOUCH_QUERY = "(hover: none)";

/** Let the swing start before centring, or we'd centre the spine it left. */
const OPEN_SCROLL_DELAY = 350;

/** How many things stand on the shelf at once. */
const MAX_ITEMS = 10;

/**
 * Trims the shelf to `MAX_ITEMS`, keeping every catalogued title and filling
 * the rest with scenery in the order it was authored. Books are kept first so
 * a long run of spines can never push a real title off the shelf.
 */
function trimLayout(layout: ShelfItem[]) {
  if (layout.length <= MAX_ITEMS) return layout;

  const bookCount = layout.filter((item) => item.kind === "book").length;
  const spineBudget = Math.max(0, MAX_ITEMS - bookCount);

  const spinePositions = layout.reduce<number[]>((acc, item, index) => {
    if (item.kind === "spine") acc.push(index);
    return acc;
  }, []);

  // Sample the spines evenly across the row rather than taking the first few,
  // or every title would bunch up at whichever end still had budget left.
  const step = spinePositions.length / Math.max(1, spineBudget);
  const keep = new Set(
    Array.from(
      { length: spineBudget },
      (_, n) => spinePositions[Math.floor(n * step)],
    ),
  );

  return layout.filter((item, index) => item.kind === "book" || keep.has(index));
}

/** The width a book occupies while closed. */
function closedWidth(book: Book) {
  return book.spineImage ? (book.spineWidth ?? 52) : (book.spine?.width ?? 26);
}

/**
 * The full-height shelf.
 *
 * Widths are computed here and written as explicit pixels rather than left to
 * `flex-shrink`. That is not premature control: flex resolves the squeeze as a
 * *used* width, which CSS cannot transition — the spines would snap to their
 * compressed size instantly while the opening book swung over 700ms. Driving
 * the numbers ourselves lets every item ease together.
 *
 * All open/closed state lives here too: only one title is open at a time, and
 * the intro sequence spans several of them in turn. Precedence is hover → tap
 * → focus → resting.
 *
 * Narrow screens get a different shelf, not a smaller one. Squeezing ten items
 * into a phone turns every spine into a sliver and the open cover into a stamp,
 * so below `md` the row keeps each item's authored width and scrolls sideways —
 * you browse it by dragging, which is the gesture a shelf actually invites.
 * Hover has no meaning there either: a tap opens the book where it stands, and
 * a second tap on the open book goes down to its entry.
 */
export function Shelf({
  layout,
  books,
  intro,
  hint,
  onSelect,
}: {
  layout: ShelfItem[];
  books: Record<string, Titled>;
  /** Slugs to open in turn on first render; the last one stays open. */
  intro: readonly string[];
  hint: string;
  onSelect: (slug: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);
  const [touch, setTouch] = useState(false);
  const [restingSlug, setRestingSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [tappedSlug, setTappedSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  // Measure the row's content box, and keep measuring as the window changes.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const style = getComputedStyle(row);
      // `clientWidth` is what can be seen, not what the row contains — which is
      // the number we want on a scrolling shelf.
      setAvailable(
        row.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
      );
      setRowHeight(row.clientHeight);
      setCompact(window.matchMedia(COMPACT_QUERY).matches);
      setTouch(window.matchMedia(TOUCH_QUERY).matches);
    };

    // Measure once directly rather than waiting on the observer's first
    // callback: a page that is hidden at mount has its rendering lifecycle
    // suspended, so that callback may not arrive until the tab is looked at,
    // and the shelf would sit un-scaled until then.
    const initial = window.setTimeout(measure, 0);

    const observer = new ResizeObserver(measure);
    observer.observe(row);

    return () => {
      window.clearTimeout(initial);
      observer.disconnect();
    };
  }, []);

  // The intro runs regardless of motion preference — it's the shelf telling you
  // what's on it. `ShelfBook` drops the 3D swing when motion is reduced; the
  // sequence itself still plays.
  useEffect(() => {
    const timers: number[] = [];
    let at = INTRO_START;

    intro.forEach((slug, index) => {
      const openAt = at;
      timers.push(window.setTimeout(() => setRestingSlug(slug), openAt));

      if (index === intro.length - 1) return;

      timers.push(
        window.setTimeout(() => setRestingSlug(null), openAt + INTRO_HOLD),
      );
      at = openAt + INTRO_HOLD + INTRO_GAP;
    });

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [intro]);

  // Opening a book on a scrolling shelf grows it from a spine to a cover, which
  // can push it off the edge of the screen it was tapped on. Bring it back.
  useEffect(() => {
    if (!compact || !tappedSlug) return;

    const node = rowRef.current?.querySelector<HTMLElement>(
      `[data-book-slug="${tappedSlug}"]`,
    );
    if (!node) return;

    const id = window.setTimeout(
      () =>
        node.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          // Never scroll the page itself — only the row under the finger.
          block: "nearest",
        }),
      OPEN_SCROLL_DELAY,
    );

    return () => window.clearTimeout(id);
  }, [compact, tappedSlug]);

  /**
   * Which book the pointer is over, derived from the event target on every
   * move. Enter/leave handlers on each button can't be trusted here: opening a
   * book widens it, sliding its neighbours under a still cursor without ever
   * firing an enter for the book that arrived.
   */
  function trackPointer(event: React.PointerEvent) {
    // A finger or pen only "hovers" while it is pressed, so on a phone this
    // fires all the way through a drag and flicks every book it passes open.
    // There, opening is what a tap is for.
    if (event.pointerType !== "mouse") return;

    const slug =
      (event.target as Element | null)?.closest<HTMLElement>("[data-book-slug]")
        ?.dataset.bookSlug ?? null;
    if (slug !== hoveredSlug) setHoveredSlug(slug);
  }

  /**
   * A tap on a touch shelf does the job hover does on a pointer shelf — the
   * first one opens the book where it stands, and only a second tap, on a book
   * already open, follows through to its entry.
   */
  function handleSelect(slug: string) {
    if (touch && tappedSlug !== slug) {
      setTappedSlug(slug);
      return;
    }
    onSelect(slug);
  }

  const openSlug = hoveredSlug ?? tappedSlug ?? focusedSlug ?? restingSlug;

  const shelf = trimLayout(layout);

  // Natural widths, i.e. the shelf at rest with nothing open.
  const natural = shelf.map((item) =>
    item.kind === "spine" ? item.width : closedWidth(books[item.slug].book),
  );
  const naturalTotal = natural.reduce((sum, w) => sum + w, 0);
  const gaps = GAP * Math.max(0, shelf.length - 1);

  // Before the first measurement, fall back to natural widths so the server
  // render and the first client paint agree.
  const content = available === null ? naturalTotal + gaps : available;

  const openIndex = shelf.findIndex(
    (item) => item.kind === "book" && item.slug === openSlug,
  );

  // An open cover keeps its designed width — deliberately *not* multiplied by
  // `scale`. Scale exists to spread scenery across a sparse shelf; applying it
  // here too would make the cover balloon simply because there were few spines
  // beside it. It is only clamped so it can't swallow a narrow screen.
  //
  // Height is a clamp as well: `ShelfBook` derives its height from this width,
  // and a cover taller than the shelf would be cropped by `max-h-full` rather
  // than kept in proportion. On a scrolling shelf the cover may take the whole
  // visible width — there is more shelf either side of it.
  const openWidthOf = (book: Book) => {
    const byWidth = compact
      ? (available ?? content) - GAP * 2
      : (content - gaps) * MAX_OPEN_SHARE;
    const byHeight = rowHeight
      ? rowHeight * (book.coverAspect ?? 0.66)
      : Infinity;

    return Math.min(book.shelfWidth ?? 280, byWidth, byHeight);
  };

  const openPx = openIndex >= 0 ? openWidthOf(books[openSlug!].book) : 0;

  /**
   * Spine artwork is a picture with a fixed aspect, so stretching it to help
   * fill the row would just crop the title away under `object-cover`. Those
   * keep their authored width, as does the open cover; the plain colour spines
   * are the ones that flex to take up the slack.
   */
  const isFixed = (item: ShelfItem, index: number) =>
    index === openIndex ||
    (item.kind === "book" && Boolean(books[item.slug].book.spineImage));

  const fixedTotal = shelf.reduce(
    (sum, item, index) =>
      isFixed(item, index) ? sum + (index === openIndex ? openPx : natural[index]) : sum,
    0,
  );
  const flexibleNatural = shelf.reduce(
    (sum, item, index) => (isFixed(item, index) ? sum : sum + natural[index]),
    0,
  );

  // Whatever the fixed items take, the rest share what's left in proportion.
  // Not on a scrolling shelf: there is no "what's left" to share, because the
  // row is as long as its contents and the screen is a window onto it.
  const flexFactor =
    compact || flexibleNatural <= 0
      ? 1
      : (content - gaps - fixedTotal) / flexibleNatural;

  const widths = shelf.map((item, index) => {
    if (index === openIndex) return openPx;
    if (isFixed(item, index)) return natural[index];
    return natural[index] * flexFactor;
  });

  return (
    <section
      aria-label={hint}
      // Short of the full screen on a phone: a shelf that fills the viewport
      // leaves nothing below it to suggest the page continues, and the covers
      // are bounded by the row's height either way.
      className="relative flex h-[60svh] flex-col justify-end overflow-hidden md:h-[calc(100svh-var(--hdr-h))]"
    >
      <div
        ref={rowRef}
        onPointerMove={trackPointer}
        onPointerLeave={() => setHoveredSlug(null)}
        // Below `md` the row is longer than the screen and is dragged along.
        // `overscroll-x-contain` keeps a swipe past the end from being taken
        // for a back gesture; the scrollbar is hidden because the shelf's own
        // overhang already says there is more of it.
        className="flex flex-1 items-end gap-[5px] overflow-x-auto overflow-y-hidden overscroll-x-contain px-3 [-ms-overflow-style:none] [scrollbar-width:none] md:overflow-visible md:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {shelf.map((item, index) => {
          if (item.kind === "spine") {
            return (
              <div
                key={`spine-${index}`}
                aria-hidden
                style={{
                  backgroundColor: item.color,
                  width: `${widths[index]}px`,
                  height: `${item.height}%`,
                  transform: `rotate(${item.lean ?? 0}deg)`,
                  transitionDuration: "700ms",
                }}
                className="shrink-0 origin-bottom transition-[width] ease-out"
              />
            );
          }

          const entry = books[item.slug];
          if (!entry) return null;

          return (
            <ShelfBook
              key={item.slug}
              book={entry.book}
              title={entry.title}
              open={openSlug === item.slug}
              width={widths[index]}
              openWidth={openWidthOf(entry.book)}
              onSelect={handleSelect}
              onFocus={() => setFocusedSlug(item.slug)}
              onBlur={() =>
                setFocusedSlug((current) =>
                  current === item.slug ? null : current,
                )
              }
            />
          );
        })}
      </div>

      {/* The shelf the books stand on. */}
      <div className="h-9 w-full shrink-0 bg-shelf md:h-12" />
    </section>
  );
}
