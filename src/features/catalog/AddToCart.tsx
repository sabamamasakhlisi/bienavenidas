"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import type { CheckoutAction } from "@/features/checkout/CartView";
import { useCart, type CartItem } from "@/features/checkout/cart";

/**
 * The price plate from the design doubles as the add-to-cart control.
 *
 * Confirmation is announced through a live region rather than only shown,
 * since the visual change is a brief label swap.
 *
 * Once the title is in the cart a way to pay appears beneath it, and pays for
 * the whole cart rather than this line alone — it is the cart page's button
 * brought to where the decision was made, not a second kind of checkout. It
 * stays for as long as the title is in the cart, outlasting the "added" flash,
 * because that flash is feedback and this is an offer.
 *
 * Takes a `CartItem` rather than a `Book`: merch uses the same control, and
 * with it the same confirmation, the same live region and the same way to pay.
 */
export function AddToCart({
  item,
  title,
  price,
  checkout,
}: {
  item: CartItem;
  /** Localized, and what the cart line is labelled with. */
  title: string;
  /** Formatted for display — the plate's face. */
  price: string;
  checkout: CheckoutAction;
}) {
  const { add, lines } = useCart();
  const t = useTranslations("book");
  const tCart = useTranslations("cart");
  const [justAdded, setJustAdded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);

  const inCart = lines.some((line) => line.slug === item.slug);

  function handleAdd() {
    add(item, title);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  }

  function handleCheckout() {
    setFailed(null);
    startTransition(async () => {
      const result = await checkout(
        lines.map(({ slug, quantity }) => ({ slug, quantity })),
      );

      if (result.ok) {
        window.location.assign(result.url);
        return;
      }

      // Whatever is wrong needs the cart to fix it — a quantity to lower, a
      // line to remove — so say what happened and leave them a way there.
      setFailed(tCart(`errors.${result.reason}`));
    });
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
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isPending}
          // Outlined rather than a second solid plate: stacking two of those
          // would read as two prices rather than a price and an action.
          className="mt-2 w-full cursor-pointer border border-foreground/30 px-4 py-2 text-center text-[13px] transition-colors hover:border-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-progress disabled:opacity-60"
        >
          {isPending ? tCart("redirecting") : tCart("checkout")}
        </button>
      )}

      <span aria-live="polite" className="sr-only">
        {justAdded ? t("addedTo", { title }) : ""}
      </span>

      {failed && (
        <p role="alert" className="mt-2 text-[12px] text-[#F5C8E8]">
          {failed}
        </p>
      )}
    </>
  );
}
