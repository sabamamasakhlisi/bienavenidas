/**
 * Navigation targets.
 *
 * The hrefs are locale-independent — only the labels translate — which is the
 * whole point of the no-prefix routing strategy. `key` indexes the `nav`
 * namespace in the message catalogues.
 */
export const NAV_ROUTES = [
  { href: "/libros", key: "libros" },
  { href: "/bienvenidas", key: "bienvenidas" },
  { href: "/contacto", key: "contacto" },
] as const;

export type NavRoute = (typeof NAV_ROUTES)[number];

/**
 * Extra paths that should light a nav link. `/` serves the catalogue view, so
 * it counts as being on Libros.
 */
const ALIASES: Record<string, readonly string[]> = {
  "/libros": ["/"],
};

/** `/libros/algun-titulo` should keep "Libros" lit, and so should `/`. */
export function isActiveRoute(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return ALIASES[href]?.includes(pathname) ?? false;
}
