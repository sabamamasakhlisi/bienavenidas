"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

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
 *   start → monogram | centre → navigation | end → es/en
 *
 * The bar itself is a thin strip; the monogram is deliberately taller than the
 * bar and hangs over the page below it, so the header wrapper cannot clip its
 * overflow.
 *
 * Colour is published as two custom properties and inherited by everything
 * inside — the monogram, the links and the language toggle all read the same
 * pair, so the bienvenidas inversion is one decision made in one place.
 */
const THEMES = {
  default: { bg: "var(--brand)", fg: "var(--foreground)", logo: null },
  // The bienvenidas poster is light, so the bar flips to match it.
  bienvenidas: { bg: "#E5E2E2", fg: "#4B3B3B", logo: null },
  // Contacto keeps the dark bar but takes the monogram in pink.
  contacto: { bg: "var(--brand)", fg: "var(--foreground)", logo: "#F5C8E8" },
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
      <div className="relative h-9 bg-[var(--hdr-bg)] text-[var(--hdr-fg)]">
        <div className="mx-auto grid h-full max-w-[1512px] grid-cols-[1fr_auto_1fr] items-center gap-4 ps-4 pe-6">
          <span aria-hidden />

          <NavLinks className="hidden justify-self-center md:block" />
          <MobileNav className="justify-self-center md:hidden" />

          <LanguageSelector className="justify-self-end" />
        </div>

        {/* Overhangs the bar, so it lives outside the grid and above the page.
            Takes the bar's colour unless a route tints it, or it would vanish
            on the light theme. */}
        <Link
          href="/libros"
          aria-label="BIEN*VENIDAS"
          className="absolute start-0 top-0 z-10 block w-[104px] text-[var(--hdr-logo)] md:w-[150px]"
        >
          <Logo className="h-auto w-full" />
        </Link>
      </div>
    </header>
  );
}
