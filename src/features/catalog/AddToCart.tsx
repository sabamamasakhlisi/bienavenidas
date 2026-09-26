"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useCart } from "@/features/checkout/cart";
import type { Book } from "@/types/book";

/**
 * The price plate from the design doubles as the add-to-cart control.
 *
 * Confirmation is announced through a live region rather than only shown,
 * since the visual change is a brief label swap.
 */
export function AddToCart({
  book,
  title,
  price,
}: {
  book: Book;
  title: string;
  price: string;
}) {
  const { add } = useCart();
  const t = useTranslations("book");
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    add(book, title);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full cursor-pointer bg-brand px-4 py-2 text-center text-[13px] text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {justAdded ? t("added") : price}
        <span className="sr-only">
          {" — "}
          {t("addToCart", { title })}
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {justAdded ? t("addedTo", { title }) : ""}
      </span>
    </>
  );
}
