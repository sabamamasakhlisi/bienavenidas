"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

import { CartLink } from "@/features/checkout/CartLink";
import { pinnedLocale } from "@/i18n/config";

import { LanguageSelector } from "./LanguageSelector";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { isActiveRoute } from "./routes";

/**
 * Header, reproduced from the INSPO frame.
 *
 * Note this mirrors the original written brief: the design puts the monogram at
 * the start and the language toggle at the end, not the other way round.
 *
 *   start → monogram | centre → navigation | end → cart, es/en
 *
 * The bar itself is a thin strip; the monogram is deliberately taller than the
 * bar and hangs over the page below it, so the header wrapper cannot clip its
 * overflow.
 *
 * The monogram is not laid over the bar — the bar stops where the monogram
 * begins, inset by `--logo-w`. Painting the strip the whole way across would show brown through
 * every counter and gap in the flourish, which is not how the mark is drawn.
 *
 * Nothing is painted behind the mark below the bar. The mark is taller than
 * the strip and hangs over the page; what shows through its open spaces there
 * is the page itself, which is the overlay the design asks for. A panel big
 * enough to back the whole mark would be a hard-edged rectangle sitting on top
 * of the shelf — so the only colour behind the flourish is the bar's own, and
 * only as far down as the bar's contoured edge goes.
 *
 * Paint order is therefore: bar → monogram.
 *
 * Colour is published as two custom properties and inherited by everything
 * inside — the monogram, the links and the language toggle all read the same
 * pair, so the bienvenidas inversion is one decision made in one place.
 */
const THEMES = {
  default: {
    bg: "var(--brand)",
    fg: "var(--foreground)",
    logo: null,
  },
  // The bienvenidas poster is light, so the bar flips to match it.
  bienvenidas: {
    bg: "#E5E2E2",
    fg: "#4B3B3B",
    // The nav goes dark on the light bar, but the monogram stays cream: over
    // the poster it reads as a watermark, which is the whole effect. So it is
    // named here rather than inheriting `fg`.
    logo: "var(--foreground)",
  },
  // Contacto keeps the dark bar but takes the monogram in pink, over its own
  // watermark. Same reasoning as above.
  contacto: {
    bg: "var(--brand)",
    fg: "var(--foreground)",
    logo: "#F5C8E8",
  },
} as const;

function themeFor(pathname: string) {
  if (isActiveRoute(pathname, "/bienvenidas")) return THEMES.bienvenidas;
  if (isActiveRoute(pathname, "/contacto")) return THEMES.contacto;
  return THEMES.default;
}

export function Header() {
  const pathname = usePathname();
  const theme = themeFor(pathname);

  return (
    <header
      className="sticky top-0 z-40"
      style={
        {
          "--hdr-bg": theme.bg,
          "--hdr-fg": theme.fg,
          // Falls back to the bar's own colour unless a route overrides it.
          "--hdr-logo": theme.logo ?? theme.fg,
        } as CSSProperties
      }
    >
      <div className="relative h-[var(--hdr-h)] text-[var(--hdr-fg)]">
        {/* The bar's shaped left end, at natural size — never scaled. Its whole
            job is to weave around the monogram, so on mobile, where there is no
            monogram, it would be a notch cut out of nothing. */}
        <svg
          aria-hidden
          width="147"
          height="39"
          viewBox="0 0 147 39"
          fill="currentColor"
          className="absolute start-0 top-0 hidden text-[var(--hdr-bg)] md:block"
        >
          {/* The notch's right vertex is at 135, not the 132 it was drawn at:
              the diagonal running from there to (147,28) used to clip the
              inside of the flourish's upper-right counter, leaving about one
              square pixel of bar colour walled in by the mark — a brown speck
              in the middle of the monogram. Measured against the real artwork,
              132 traps 1.4px² and 134 traps none; 135 keeps a pixel in hand
              for subpixel rounding at other device ratios. */}
          <path d="M0 0H147V28L135 14.5H103.5L94 30.5L73.5 28L46.5 39L40 36.5L26.5 28L8 19L0 15.5Z" />
        </svg>

        {/* The plain remainder. Overlaps the shape by a pixel so no seam
            shows where the two meet — and on mobile it is the whole bar. */}
        <div
          aria-hidden
          className="absolute start-0 end-0 top-0 h-[var(--hdr-h)] bg-[var(--hdr-bg)] md:start-[146px]"
        />

        {/* `relative` so it paints above the two absolute layers behind it. */}
        {/* Two layouts, one row of markup. Below `md` the monogram is gone, so
            the links take the bar across its whole width and the cart sits at
            the end; from `md` the empty first column returns and the links go
            back to the true centre, with the monogram overhanging the start. */}
        <div className="relative mx-auto grid h-full max-w-[1512px] grid-cols-[1fr_auto] items-center gap-3 px-3 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:ps-4 md:pe-6">
          {/* Counterweight to the cart, so the links land in the middle. Not
              rendered below `md`, where there is no middle to land in. */}
          <span aria-hidden className="hidden md:block" />

          {/* The same row of links at every width — the design has no drawer,
              and three short words fit. */}
          <NavLinks className="min-w-0 md:justify-self-center" />

          <div className="flex items-center gap-5 justify-self-end md:gap-8">
            <CartLink active={isActiveRoute(pathname, "/carrito")} />
            {/* Hidden, not removed: while the site is pinned to one language
                the switch has nothing to switch, and `display: none` also
                takes it out of the tab order and the accessibility tree. */}
            <LanguageSelector className={pinnedLocale ? "hidden" : ""} />
          </div>
        </div>

        {/* Overhangs the bar, so it lives outside the grid and above the page.
            Takes the bar's colour unless a route tints it, or it would vanish
            on the light theme. Its width must match the bar's inset above.
            Dropped below `md`: at phone width the mark eats a third of the bar
            and leaves the links nowhere to go. */}
        <Link
          href="/libros"
          aria-label="BIEN*VENIDAS"
          className="absolute start-0 top-0 z-10 hidden w-[var(--logo-w)] text-[var(--hdr-logo)] md:block"
        >
          <Logo className="h-auto w-full" />
        </Link>
      </div>
    </header>
  );
}
