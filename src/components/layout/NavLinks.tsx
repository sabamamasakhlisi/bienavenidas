"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { NAV_ROUTES, isActiveRoute } from "./routes";

/**
 * Renders `Bien*venidas` with the asterisk set in the display serif, matching
 * the way the wordmark is drawn throughout the design.
 */
export function NavLabel({ label }: { label: string }) {
  const parts = label.split("*");
  if (parts.length === 1) return <>{label}</>;

  return (
    <>
      {parts[0]}
      <span className="bask-font">*</span>
      {parts.slice(1).join("*")}
    </>
  );
}

/**
 * Centre navigation. Client-side only because it needs `usePathname` for the
 * active state — which works identically in both languages, since the URL
 * carries no locale.
 */
/** Bien*venidas marks its own page in pink; every other link inherits the
 * header's colour, which Header itself flips for this route. */
const BIENVENIDAS_ACTIVE = "#F5C8E8";

export function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const onBienvenidas = isActiveRoute(pathname, "/bienvenidas");

  return (
    <nav className={className}>
      <ul className="flex items-center gap-10 lg:gap-20">
        {NAV_ROUTES.map(({ href, key }) => {
          const active = isActiveRoute(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                style={
                  onBienvenidas && active
                    ? { color: BIENVENIDAS_ACTIVE }
                    : undefined
                }
                className={`text-[15px] leading-none whitespace-nowrap transition-opacity hover:opacity-100 ${
                  active ? "opacity-100" : "opacity-75"
                }`}
              >
                <NavLabel label={t(key)} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
