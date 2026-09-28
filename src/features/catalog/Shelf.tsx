"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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

/**
 * And no more than this share of the screen on a phone. Measured against what
 * can be seen rather than the row's full length, which on a scrolling shelf is
 * longer than the window — without it the widest covers open to most of a
 * phone screen and read as a page, not a book on a shelf.
 */
const COMPACT_OPEN_SHARE = 0.68;

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

/** And on a phone, where the scenery crowds the titles out. */
const COMPACT_MAX_ITEMS = 5;

/**
 * Trims the shelf to `max` items, keeping every catalogued title and filling
 * the rest with scenery in the order it was authored. Books are kept first so
 * a long run of spines can never push a real title off the shelf.
 */
function trimLayout(layout: ShelfItem[], max: number) {
  if (layout.length <= max) return layout;

  const bookCount = layout.filter((item) => item.kind === "book").length;
  const spineBudget = Math.max(0, max - bookCount);

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

/**
 * Perceived distance between two hex colours — 0 for a match, ~255 for
 * opposites. Weighted the way `BookCover` weights luminance, because the eye
 * reads a difference in green far more readily than the same step in blue.
 */
function colourDistance(a: string, b: string) {
  const channels = (hex: string) => {
    const value = hex.replace("#", "");
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  };

  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);

  return Math.sqrt(
    0.299 * (r1 - r2) ** 2 + 0.587 * (g1 - g2) ** 2 + 0.114 * (b1 - b2) ** 2,
  );
}

/** Closer than this and two spines read as a repeat rather than two choices. */
const COLOUR_APART = 25;

/**
 * How the row's ends stand, on a shelf wide enough to show both.
 *
 * Square at the start and leaning at the finish: a row of books is held up at
 * one end and falls back against the rest at the other, the way the last of
 * them rests when nothing stands beyond it.
 * A phone sees neither end at once — the row runs off both sides of the screen
 * — so there it keeps the angles the layout was authored with.
 */
const FIRST_LEAN_MD = 0;
const LAST_LEAN_MD = -5;

/**
 * How far a leaning item reaches sideways into what stands next to it.
 *
 * Everything on the shelf pivots on its base, so a tilt swings the top corner
 * across its neighbour: at shelf height a 5° lean carries it some 38px, where
 * the gap between items is 5. Left unaccounted for, a spine looks sunk into
 * the one beside it rather than propped against it.
 *
 * Measured at the height of the neighbour's top edge, because that is the
 * highest point the two can actually meet — above it the leaning item simply
 * passes over open air.
 */
function leanReach(lean: number, width: number, neighbourHeight: number) {
  if (!lean || neighbourHeight <= 0) return 0;

  const radians = (Math.abs(lean) * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const half = width / 2;

  // How far up the tilted edge is when it arrives at the neighbour's top.
  const climb = (neighbourHeight + half * sin) / cos;

  return climb * sin - half * (1 - cos);
}

/**
 * The phone's shelf: every title, plus the few pieces of scenery that look
 * least like anything already standing there.
 *
 * Sampling evenly is right for a long row, where a near-repeat is lost among
 * thirty spines. On a row of five it is the first thing you see — and the
 * books' own spines count, so the pale pink scenery beside Open Call's pale
 * pink spine reads as one colour used twice. So each pick is the candidate
 * furthest from everything already on the shelf. Where nothing is far enough
 * the shelf simply comes up a spine short, which looks better than the repeat.
 */
function pickCompact(
  shelf: ShelfItem[],
  reserved: string[],
  max: number,
): Set<ShelfItem> {
  const titles = shelf.filter((item) => item.kind === "book");
  const spines = shelf.filter(
    (item): item is Extract<ShelfItem, { kind: "spine" }> =>
      item.kind === "spine",
  );

  const budget = Math.max(0, max - titles.length);
  const taken = [...reserved];
  const keep = new Set<ShelfItem>();

  for (let n = 0; n < budget; n += 1) {
    let best: ShelfItem | undefined;
    let bestApart = -1;

    for (const candidate of spines) {
      if (keep.has(candidate)) continue;

      const apart = taken.reduce(
        (nearest, colour) =>
          Math.min(nearest, colourDistance(colour, candidate.color)),
        Infinity,
      );

      if (apart > bestApart) {
        bestApart = apart;
        best = candidate;
      }
    }

    if (!best || bestApart < COLOUR_APART) break;

    keep.add(best);
    taken.push((best as Extract<ShelfItem, { kind: "spine" }>).color);
  }

  return new Set([...titles, ...keep]);
}

/**
 * The width a book occupies while closed.
 *
 * A book with spine artwork is as wide as that artwork is at the height the
 * book stands — `standing` is that height, and `spineAspect` its proportion.
 * Derived rather than authored because the spine box is filled with
 * `object-cover`: a width that disagrees with the picture crops it, and what
 * gets cropped off a spine is the title. An explicit `spineWidth` still wins,
 * for art that is meant to be trimmed.
 */
function closedWidth(book: Book, standing: number) {
  if (!book.spineImage) return book.spine?.width ?? 26;
  if (book.spineWidth) return book.spineWidth;
  return standing * (book.spineAspect ?? 0.2);
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

  const shelf = trimLayout(layout, MAX_ITEMS);

  // Colours the shelf is already committed to: every title's own spine, except
  // where artwork stands in for one. Scenery is then chosen to avoid them.
  const reserved = shelf.flatMap((item) => {
    if (item.kind !== "book") return [];
    const { book } = books[item.slug];
    return book.spineImage ? [] : [book.spine?.color ?? "#4d3738"];
  });

  // The phone's shorter shelf. Trimmed from the row that is actually rendered,
  // not from the full layout: sampled independently the two passes pick
  // different spines, and a spine the phone wants but the row never drew
  // simply goes missing. Doing it in CSS rather than in state also keeps the
  // server render and the first client paint identical — measuring first and
  // then dropping half the row would show the full shelf for a frame, then snap.
  const compactShelf = pickCompact(shelf, reserved, COMPACT_MAX_ITEMS);

  const gaps = GAP * Math.max(0, shelf.length - 1);

  /**
   * How tall a book stands, open or closed.
   *
   * Books keep the height their open cover would have, so they do not grow as
   * they swing (see `ShelfBook`) — which also makes it the height a spine has
   * to fill, and so the number `closedWidth` needs. Before the shelf has been
   * measured there is nothing to clamp against, so the designed width stands.
   */
  const standingOf = (book: Book) => {
    const aspect = book.coverAspect ?? 0.66;
    const open = available === null ? (book.shelfWidth ?? 280) : openWidthOf(book);
    return open / aspect;
  };

  // Natural widths, i.e. the shelf at rest with nothing open.
  const natural = shelf.map((item) =>
    item.kind === "spine"
      ? item.width
      : closedWidth(
          books[item.slug].book,
          standingOf(books[item.slug].book),
        ),
  );
  const naturalTotal = natural.reduce((sum, w) => sum + w, 0);

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
  function openWidthOf(book: Book) {
    // Reads the measurement directly rather than `content`: `content` now
    // falls back to the natural widths, and those are derived from this.
    const byWidth =
      available === null
        ? Infinity
        : compact
          ? available * COMPACT_OPEN_SHARE
          : (available - gaps) * MAX_OPEN_SHARE;
    const byHeight = rowHeight
      ? rowHeight * (book.coverAspect ?? 0.66)
      : Infinity;

    return Math.min(book.shelfWidth ?? 280, byWidth, byHeight);
  }

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

  /**
   * Whatever the fixed items take, the rest share what's left in proportion —
   * but only ever downwards.
   *
   * Shrinking is what makes room for a cover swinging open. Growing was the
   * same sum run the other way, and it made a wide screen fatten every spine
   * until the shelf read as a row of slabs: a 24px spine stood 86px wide at
   * 1440, which is no longer a spine. A book is the width it is, so the shelf
   * now stops at its natural length and leaves the rest of the row empty,
   * which is what the end of a shelf looks like.
   *
   * Not on a scrolling shelf either: there is no "what's left" to share,
   * because the row is as long as its contents and the screen is a window
   * onto it.
   */
  const flexFactor =
    compact || flexibleNatural <= 0
      ? 1
      : Math.min(1, (content - gaps - fixedTotal) / flexibleNatural);

  const widths = shelf.map((item, index) => {
    if (index === openIndex) return openPx;
    if (isFixed(item, index)) return natural[index];
    return natural[index] * flexFactor;
  });

  /** The angle an item stands at, which differs at the row's ends on a wide
   * shelf. Books lean the same however wide the screen is. */
  const leanOf = (item: ShelfItem, index: number, wide: boolean) => {
    if (item.kind !== "spine") return books[item.slug].book.shelfLean ?? 0;
    const lean = item.lean ?? 0;
    if (!wide) return lean;
    if (index === 0) return FIRST_LEAN_MD;
    if (index === shelf.length - 1) return LAST_LEAN_MD;
    return lean;
  };

  /** How tall an item stands, in px. */
  const heightOf = (item: ShelfItem) =>
    item.kind === "spine"
      ? (rowHeight ?? 0) * (item.height / 100)
      : standingOf(books[item.slug].book);

  /**
   * Extra space each item needs on its leading edge so nothing overlaps.
   *
   * Taken pair by pair, because either side can be the one intruding: an item
   * leaning back reaches into what precedes it, and one leaning forward reaches
   * into what follows. Whichever reach is longer decides the pair, and the
   * space is added in front of the second of the two — which is the same thing
   * as pushing a leaning book's foot out until its top rests on its neighbour
   * instead of passing through it.
   *
   * Computed per breakpoint: a phone hides most of the scenery, so the items
   * that end up side by side there are not the ones that are side by side on a
   * wide screen.
   */
  const clearances = (wide: boolean) => {
    const feet = shelf.map(() => 0);
    let previous = -1;

    shelf.forEach((item, index) => {
      if (!wide && !compactShelf.has(item)) return;

      if (previous >= 0) {
        const before = shelf[previous];
        const leanBefore = leanOf(before, previous, wide);
        const leanHere = leanOf(item, index, wide);

        // Added, not compared. Two items can lean *towards* each other — one
        // tipping forward while the next tips back — and then each eats into
        // the space from its own side, so the gap has to cover both reaches.
        // Taking the larger of the two left the pair short by exactly the
        // smaller one, which is how a +4° spine ended up 24px inside the −3°
        // spine beside it. Either term is zero when that side leans away.
        const need =
          (leanHere < 0
            ? leanReach(leanHere, widths[index], heightOf(before))
            : 0) +
          (leanBefore > 0
            ? leanReach(leanBefore, widths[previous], heightOf(item))
            : 0);

        // Rounded up: the browser lays out on fractional pixels and the last
        // tenth of a millimetre of contact still reads as a seam.
        feet[index] = Math.max(0, Math.ceil(need - GAP));
      }

      previous = index;
    });

    return feet;
  };

  const feetWide = clearances(true);
  const feetCompact = clearances(false);

  return (
    <section
      aria-label={hint}
      // Short of the full screen on a phone: a shelf that fills the viewport
      // leaves nothing below it to suggest the page continues, and the covers
      // are bounded by the row's height either way.
      className="relative flex h-[80svh] flex-col justify-end overflow-hidden md:h-[calc(100svh-var(--hdr-h))]"
    >
      <div
        ref={rowRef}
        onPointerMove={trackPointer}
        onPointerLeave={() => setHoveredSlug(null)}
        // Below `md` the row is longer than the screen and is dragged along.
        // `overscroll-x-contain` keeps a swipe past the end from being taken
        // for a back gesture; the scrollbar is hidden because the shelf's own
        // overhang already says there is more of it.
        // Centred only from `md`. Below it the row scrolls, and centring an
        // overflowing flex row pushes its first items off the start edge where
        // no amount of scrolling reaches them.
        className="flex flex-1 items-end gap-[5px] overflow-x-auto overflow-y-hidden overscroll-x-contain px-3 [-ms-overflow-style:none] [scrollbar-width:none] md:justify-center md:overflow-visible md:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {shelf.map((item, index) => {
          if (item.kind === "spine") {
            const lean = item.lean ?? 0;
            const leanMd = leanOf(item, index, true);


            return (
              <div
                key={`spine-${index}`}
                aria-hidden
                style={
                  {
                    backgroundColor: item.color,
                    width: `${widths[index]}px`,
                    height: `${item.height}%`,
                    // Read by `.shelf-spine`; see `globals.css`. Not set as a
                    // `transform` here, or the wide-screen rule could not win.
                    "--lean": `${lean}deg`,
                    "--lean-md": `${leanMd}deg`,
                    "--foot": `${feetCompact[index]}px`,
                    "--foot-md": `${feetWide[index]}px`,
                    transitionDuration: "700ms",
                  } as CSSProperties
                }
                className={`shelf-item shelf-spine shrink-0 origin-bottom transition-[width] ${
                  compactShelf.has(item) ? "" : "hidden md:block"
                }`}
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
              foot={feetCompact[index]}
              footWide={feetWide[index]}
              open={openSlug === item.slug}
              width={widths[index]}
              openWidth={openWidthOf(entry.book)}
              // The book's own thickness — the width it has closed, whatever
              // width it is being drawn at right now.
              closedWidth={natural[index]}
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
