"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

import { CartLink } from "@/features/checkout/CartLink";

import { LanguageSelector } from "./LanguageSelector";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
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
 * Beneath all of it, on routes whose content scrolls under the header, the
 * monogram stands on a plate of the page's own colour — without it, book
 * covers would ride up through the mark's open spaces. Routes that are a
 * single fixed screen of artwork skip the plate and show that artwork instead.
 *
 * Paint order is therefore: plate → bar → monogram.
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
    plate: "var(--background)",
  },
  // The bienvenidas poster is light, so the bar flips to match it. No plate:
  // these two routes are a single screen of artwork that never scrolls under
  // the header, and any solid colour here would stamp a rectangle over the
  // poster — exactly what the mark is supposed to sit *in*.
  bienvenidas: {
    bg: "#E5E2E2",
    fg: "#4B3B3B",
    // The nav goes dark on the light bar, but the monogram stays cream: over
    // the poster it reads as a watermark, which is the whole effect. So it is
    // named here rather than inheriting `fg`.
    logo: "var(--foreground)",
    plate: "transparent",
  },
  // Contacto keeps the dark bar but takes the monogram in pink, over its own
  // watermark. Same reasoning as above.
  contacto: {
    bg: "var(--brand)",
    fg: "var(--foreground)",
    logo: "#F5C8E8",
    plate: "transparent",
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
          "--hdr-plate": theme.plate,
        } as CSSProperties
      }
    >
      <div className="relative h-[var(--hdr-h)] text-[var(--hdr-fg)]">
        {/* The ground the monogram stands on: the page's colour, carried up
            through the strip and down past it to the full height of the mark. */}
        <div
          aria-hidden
          className="absolute start-0 top-0 h-[var(--logo-h)] w-[var(--logo-w)] bg-[var(--hdr-plate)]"
        />

        {/* The bar's shaped left end, at natural size — never scaled. */}
        <svg
          aria-hidden
          width="147"
          height="39"
          viewBox="0 0 147 39"
          fill="currentColor"
          className="absolute start-0 top-0 text-[var(--hdr-bg)]"
        >
          <path d="M0 0H147V28L132 14.5H103.5L94 30.5L73.5 28L46.5 39L40 36.5L26.5 28L8 19L0 15.5Z" />
        </svg>

        {/* The plain remainder. Overlaps the shape by a pixel so no seam
            shows where the two meet. */}
        <div
          aria-hidden
          className="absolute start-[146px] end-0 top-0 h-[var(--hdr-h)] bg-[var(--hdr-bg)]"
        />

        {/* `relative` so it paints above the two absolute layers behind it. */}
        <div className="relative mx-auto grid h-full max-w-[1512px] grid-cols-[1fr_auto_1fr] items-center gap-4 ps-4 pe-6">
          <span aria-hidden />

          <NavLinks className="hidden justify-self-center md:block" />
          <MobileNav className="justify-self-center md:hidden" />

          <div className="flex items-center gap-5 justify-self-end md:gap-8">
            <CartLink active={isActiveRoute(pathname, "/carrito")} />
            <LanguageSelector />
          </div>
        </div>

        {/* Overhangs the bar, so it lives outside the grid and above the page.
            Takes the bar's colour unless a route tints it, or it would vanish
            on the light theme. Its width must match the bar's inset above. */}
        <Link
          href="/libros"
          aria-label="BIEN*VENIDAS"
          className="absolute start-0 top-0 z-10 block w-[var(--logo-w)] text-[var(--hdr-logo)]"
        >
          <Logo className="h-auto w-full" />
        </Link>
      </div>
    </header>
  );
}
