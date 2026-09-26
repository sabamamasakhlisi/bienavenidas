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
/** The active route is named in pink, whichever route it is. */
const ACTIVE_COLOUR = "#F5C8E8";

export function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

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
                style={active ? { color: ACTIVE_COLOUR } : undefined}
                // Set lowercase here rather than in the message catalogue: the
                // casing is how the design draws the nav, not how the words are
                // written. The catalogue keeps them capitalised for the mobile
                // drawer and for anything a screen reader reads out.
                className={`text-[15px] leading-none lowercase whitespace-nowrap transition-opacity hover:opacity-100 ${
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
