"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { useCart } from "./cart";

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
      className={`text-[15px] leading-none lowercase whitespace-nowrap transition-opacity hover:opacity-100 ${
        active || count > 0 ? "opacity-100" : "opacity-55"
      } ${className}`}
    >
      {t("nav.cart")}
      {count > 0 && <span className="tabular-nums"> ({count})</span>}
    </Link>
  );
}
