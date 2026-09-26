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
 * the intro sequence spans several of them in turn. Precedence is hover →
 * focus → resting.
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
  const [restingSlug, setRestingSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  // Measure the row's content box, and keep measuring as the window changes.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const style = getComputedStyle(row);
      setAvailable(
        row.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
      );
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

  /**
   * Which book the pointer is over, derived from the event target on every
   * move. Enter/leave handlers on each button can't be trusted here: opening a
   * book widens it, sliding its neighbours under a still cursor without ever
   * firing an enter for the book that arrived.
   */
  function trackPointer(event: React.PointerEvent) {
    const slug =
      (event.target as Element | null)?.closest<HTMLElement>("[data-book-slug]")
        ?.dataset.bookSlug ?? null;
    if (slug !== hoveredSlug) setHoveredSlug(slug);
  }

  const openSlug = hoveredSlug ?? focusedSlug ?? restingSlug;

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
  const openWidthOf = (book: Book) =>
    Math.min(book.shelfWidth ?? 280, (content - gaps) * MAX_OPEN_SHARE);

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
  const flexFactor =
    flexibleNatural > 0 ? (content - gaps - fixedTotal) / flexibleNatural : 1;

  const widths = shelf.map((item, index) => {
    if (index === openIndex) return openPx;
    if (isFixed(item, index)) return natural[index];
    return natural[index] * flexFactor;
  });

  return (
    <section
      aria-label={hint}
      className="relative flex h-[calc(100svh-var(--hdr-h))] flex-col justify-end overflow-hidden"
    >
      <div
        ref={rowRef}
        onPointerMove={trackPointer}
        onPointerLeave={() => setHoveredSlug(null)}
        className="flex flex-1 items-end gap-[5px] px-3 md:px-6"
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
              onSelect={onSelect}
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
