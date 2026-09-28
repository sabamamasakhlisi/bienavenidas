"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CONTACT_EMAIL } from "@/lib/site";

import { isActiveRoute } from "./routes";

/** Pages drawn on the light ground, where the footer takes the same colours. */
const LIGHT = ["/bienvenidas", "/contacto", "/aviso-legal", "/condiciones"];

/**
 * Pages exactly one screen tall. The footer sits over their foot instead of
 * below it, so it stays in view and the page gains no scroll. (The poster
 * pans on touch, so a footer below it couldn't be reached on a phone.)
 */
const PINNED = ["/bienvenidas", "/contacto"];

/**
 * Site footer: mail at the start, the legal pages in the centre, credit at the
 * end. Stacks and centres on narrow screens.
 */
export function Footer() {
  const pathname = usePathname();
  const light = LIGHT.some((href) => isActiveRoute(pathname, href));
  const pinned = PINNED.some((href) => isActiveRoute(pathname, href));
  const onContacto = isActiveRoute(pathname, "/contacto");

  return (
    <footer
      className={[
        "grid gap-y-2 px-6 py-6 text-center text-[12px] md:grid-cols-[1fr_auto_1fr] md:items-center",
        light ? "text-[#4B3B3B]" : "text-foreground",
        pinned && "absolute inset-x-0 bottom-0",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Contacto already gives the address its own line, in type meant to be
          read; repeating it in the footer of a one-screen page only crowds a
          phone. It stays from `md`, where there is room for the full row. */}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className={`opacity-70 transition-opacity hover:opacity-100 md:justify-self-start ${
          onContacto ? "hidden md:block" : ""
        }`}
      >
        {CONTACT_EMAIL}
      </a>

      <nav
        aria-label="Legal"
        className="flex flex-wrap justify-center gap-x-8 gap-y-2"
      >
        <Link
          href="/aviso-legal"
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          Aviso legal y privacidad
        </Link>
        <Link
          href="/condiciones"
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          Condiciones y términos
        </Link>
      </nav>

      <p className="opacity-70 md:justify-self-end">
        © Bernardina Studio · 2026
      </p>
    </footer>
  );
}
