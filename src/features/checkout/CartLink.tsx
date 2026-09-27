"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { useCart } from "./cart";

/** The accent, as in `NavLinks`. */
const ACCENT = "#F5C8E8";

/**
 * The cart mark from the design (MDI `cart-heart`).
 *
 * Painted the accent outright rather than inheriting the bar's colour: unlike
 * the words beside it the mark is always pink, on every route, which is how the
 * export draws it.
 */
function CartHeart({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill={ACCENT} className={className}>
      <path d="M9 20C9 21.1 8.1 22 7 22C5.9 22 5 21.1 5 20C5 18.9 5.9 18 7 18C8.1 18 9 18.9 9 20ZM17 18C15.9 18 15 18.9 15 20C15 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18ZM7.2 14.8V14.7L8.1 13H15.5C16.2 13 16.9 12.6 17.2 12L21.1 5L19.4 4L15.5 11H8.5L4.3 2H1V4H3L6.6 11.6L5.2 14C5.1 14.3 5 14.6 5 15C5 16.1 5.9 17 7 17H19V15H7.4C7.3 15 7.2 14.9 7.2 14.8ZM12 9.3L11.4 8.8C9.4 6.9 8 5.7 8 4.2C8 3 9 2 10.2 2C10.9 2 11.6 2.3 12 2.8C12.4 2.3 13.1 2 13.8 2C15 2 16 2.9 16 4.2C16 5.7 14.6 6.9 12.6 8.8L12 9.3Z" />
    </svg>
  );
}

/** Header entry to the cart. Colour is inherited from the header bar. */
export function CartLink({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  const { count } = useCart();
  const t = useTranslations();

  return (
    <Link
      href="/carrito"
      aria-label={t("cart.link", { count })}
      aria-current={active ? "page" : undefined}
      style={active ? { color: ACCENT } : undefined}
      className={`flex items-center gap-1 text-[15px] leading-none lowercase whitespace-nowrap transition-opacity hover:opacity-100 ${
        active || count > 0 ? "opacity-100" : "opacity-55"
      } ${className}`}
    >
      {/* The mark stands in for the word on mobile, where the bar belongs to
          the nav; from `md` the design's wording comes back. */}
      <CartHeart className="h-5 w-5 md:hidden" />
      <span className="hidden md:inline">{t("nav.cart")}</span>
      {count > 0 && <span className="tabular-nums">({count})</span>}
    </Link>
  );
}
