"use client";

import { useId, useState } from "react";

import { useTranslations } from "next-intl";

import type { CheckoutAction } from "@/features/checkout/CartView";

import { AddToCart } from "./AddToCart";
import type { MerchView } from "./view";

/**
 * Sizes, then the price plate for whichever is chosen.
 *
 * Real radio inputs behind the plates rather than buttons with `aria-pressed`:
 * a size is a single choice among a set, which is what a radio group *is* —
 * arrow keys move between them, the group is announced as a group, and the
 * chosen one is announced as chosen, none of which comes free otherwise.
 *
 * The plate below shows the chosen size's own price. Sizes are separate rows
 * in `stock` and can be priced apart, so reading the price off the selection
 * is what keeps the plate honest rather than merely usually right.
 */
export function SizePicker({
  merch,
  checkout,
}: {
  merch: MerchView;
  checkout: CheckoutAction;
}) {
  const t = useTranslations("merch");
  const name = useId();

  // Opens on the first size anyone can actually buy, so the plate is live on
  // arrival. Everything sold out leaves this undefined and the plate is
  // replaced below.
  const [slug, setSlug] = useState(
    () => merch.variants.find((variant) => !variant.soldOut)?.slug,
  );

  const chosen = merch.variants.find((variant) => variant.slug === slug);

  return (
    <div className="flex w-full flex-col gap-2">
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">{t("chooseSize")}</legend>

        <div className="flex flex-wrap gap-2">
          {merch.variants.map((variant) => {
            const picked = variant.slug === chosen?.slug;

            return (
              <label
                key={variant.slug}
                className={`flex-1 cursor-pointer px-4 py-2 text-center text-[13px] whitespace-nowrap transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foreground ${
                  variant.soldOut
                    ? "cursor-not-allowed border border-accent/30 text-accent/40 line-through"
                    : picked
                      ? "bg-accent text-[#221e1f]"
                      : "border border-accent text-accent hover:bg-accent/15"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={variant.slug}
                  checked={picked}
                  disabled={variant.soldOut}
                  onChange={() => setSlug(variant.slug)}
                  className="sr-only"
                />
                {variant.label}
                {variant.soldOut && (
                  <span className="sr-only"> — {merch.soldOutLabel}</span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {chosen ? (
        // Remounted per size, so the "added" flash belongs to the size it was
        // shown for rather than lingering across a change of mind.
        <AddToCart
          key={chosen.slug}
          item={{
            slug: chosen.slug,
            price: { amount: chosen.amount, currency: chosen.currency },
          }}
          title={`${merch.title} — ${chosen.label}`}
          price={chosen.price}
          checkout={checkout}
        />
      ) : (
        <p className="bg-brand px-4 py-2 text-center text-[13px] opacity-70">
          {merch.soldOutLabel}
        </p>
      )}
    </div>
  );
}
