"use client";

import { useState } from "react";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { CartSheet } from "./CartSheet";
import { useCart } from "./cart";

/** The accent, as in `NavLinks`. */
const ACCENT = "#F5C8E8";

/**
 * Header entry to the cart. Colour is inherited from the header bar.
 *
 * Opens the cart as a panel rather than navigating, so nobody loses the page
 * they were reading to check what they have. It stays a real link to
 * `/carrito` underneath: the href is what makes cmd-click, middle-click and
 * "open in new tab" work, and what the page falls back to before this
 * component has hydrated. Only a plain left click is taken over.
 *
 * On `/carrito` itself the link is left alone — the cart is already the page,
 * and a panel over its own contents would be a copy of what is behind it.
 */
export function CartLink({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  const { count } = useCart();
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Anything but a plain left click is someone asking for the page itself.
    if (
      active ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setOpen(true);
  }

  return (
    <>
    <Link
      href="/carrito"
      onClick={handleClick}
      aria-haspopup={active ? undefined : "dialog"}
      aria-expanded={active ? undefined : open}
      aria-label={t("cart.link", { count })}
      aria-current={active ? "page" : undefined}
      style={active ? { color: ACCENT } : undefined}
      className={`flex items-center gap-1 text-[15px] leading-none lowercase whitespace-nowrap transition-opacity hover:opacity-100 ${
        active || count > 0 ? "opacity-100" : "opacity-55"
      } ${className}`}
    >
      <span>{t("nav.cart")}</span>
      {count > 0 && <span className="tabular-nums">({count})</span>}
    </Link>

    {!active && <CartSheet open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
