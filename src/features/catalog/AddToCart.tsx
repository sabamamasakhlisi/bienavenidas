"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslations } from "next-intl";

import { useCart, type CartItem } from "@/features/checkout/cart";

/**
 * The price plate from the design doubles as the add-to-cart control.
 *
 * Confirmation is announced through a live region rather than only shown,
 * since the visual change is a brief label swap.
 *
 * Once the title is in the cart a way to pay appears beneath it. It leads to
 * the cart rather than straight to Stripe, because shipping depends on where
 * the parcel goes and the cart is where the buyer says so. It stays for as long as the title is in the cart, outlasting the "added" flash,
 * because that flash is feedback and this is an offer.
 *
 * Takes a `CartItem` rather than a `Book`: merch uses the same control, and
 * with it the same confirmation, the same live region and the same way to pay.
 */
export function AddToCart({
  item,
  title,
  price,
}: {
  item: CartItem;
  /** Localized, and what the cart line is labelled with. */
  title: string;
  /** Formatted for display — the plate's face. */
  price: string;
}) {
  const { add, lines } = useCart();
  const t = useTranslations("book");
  const tCart = useTranslations("cart");
  const [justAdded, setJustAdded] = useState(false);

  const inCart = lines.some((line) => line.slug === item.slug);

  function handleAdd() {
    add(item, title);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        className="w-full cursor-pointer bg-brand px-4 py-2 text-center text-[13px] text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {justAdded ? t("added") : price}
        <span className="sr-only">
          {" — "}
          {t("addToCart", { title })}
        </span>
      </button>

      {inCart && (
        <Link
          href="/carrito"
          // Outlined rather than a second solid plate: stacking two of those
          // would read as two prices rather than a price and an action.
          className="mt-2 block w-full border border-foreground/30 px-4 py-2 text-center text-[13px] transition-colors hover:border-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {tCart("checkout")}
        </Link>
      )}

      <span aria-live="polite" className="sr-only">
        {justAdded ? t("addedTo", { title }) : ""}
      </span>
    </>
  );
}
