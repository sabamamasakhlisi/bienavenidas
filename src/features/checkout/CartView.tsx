"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useLocale, useTranslations } from "next-intl";

import { useCart } from "./cart";
import { MAX_QUANTITY } from "./limits";
import { formatMoney } from "./money";

type CheckoutFailure =
  | "notConfigured"
  | "empty"
  | "unavailable"
  | "failed";

export type CheckoutAction = (
  request: { slug: string; quantity: number }[],
) => Promise<
  | { ok: true; url: string }
  | { ok: false; reason: CheckoutFailure; slugs?: string[] }
>;

/**
 * The cart page body.
 *
 * `checkout` is passed in by the route rather than imported, so this feature
 * never reaches into the catalogue that the server action has to consult.
 */
export function CartView({ checkout }: { checkout: CheckoutAction }) {
  const { lines, total, setQuantity, remove } = useCart();
  const t = useTranslations("cart");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<CheckoutFailure | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await checkout(
        lines.map(({ slug, quantity }) => ({ slug, quantity })),
      );

      if (result.ok) {
        window.location.assign(result.url);
        return;
      }

      setError(result.reason);
      setUnavailable(result.slugs ?? []);
    });
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-8">
        <p className="text-muted">{t("empty")}</p>
        <Link
          href="/libros"
          className="text-xs tracking-[0.2em] uppercase underline underline-offset-4"
        >
          {t("browse")}
        </Link>
      </div>
    );
  }

  const currency = lines[0].currency;

  return (
    <div className="flex flex-col gap-10">
      <ul className="divide-y divide-foreground/15 border-y border-foreground/15">
        {lines.map((line) => (
          <li
            key={line.slug}
            className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 py-5 sm:grid-cols-[1fr_auto_6rem]"
          >
            <div className="min-w-0">
              <Link
                href={`/libros/${line.slug}`}
                className="bask-font text-[17px] italic underline-offset-4 hover:underline"
              >
                {line.title}
              </Link>
              <p className="mt-1 text-[12px] text-muted">
                {formatMoney(
                  { amount: line.amount, currency: line.currency },
                  locale,
                )}
                {unavailable.includes(line.slug) && (
                  <span className="ms-3 text-[#F5C8E8]">
                    {t("unavailableLine")}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4 text-[13px]">
              <div
                role="group"
                aria-label={t("quantity", { title: line.title })}
                className="flex items-center bg-brand"
              >
                <button
                  type="button"
                  onClick={() =>
                    line.quantity > 1
                      ? setQuantity(line.slug, line.quantity - 1)
                      : remove(line.slug)
                  }
                  aria-label={t("decrease", { title: line.title })}
                  className="h-8 w-8 cursor-pointer hover:opacity-80"
                >
                  −
                </button>
                <span aria-live="polite" className="w-6 text-center tabular-nums">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.slug, line.quantity + 1)}
                  disabled={line.quantity >= MAX_QUANTITY}
                  aria-label={t("increase", { title: line.title })}
                  className="h-8 w-8 cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => remove(line.slug)}
                aria-label={t("removeLabel", { title: line.title })}
                className="cursor-pointer text-[12px] text-muted underline-offset-4 hover:underline"
              >
                {t("remove")}
              </button>
            </div>

            <p className="col-span-2 text-end tabular-nums sm:col-span-1">
              {formatMoney(
                { amount: line.amount * line.quantity, currency: line.currency },
                locale,
              )}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-end gap-4 text-end">
        <p className="flex items-baseline gap-6">
          <span className="text-[13px] text-muted">{t("subtotal")}</span>
          <span className="bask-font text-2xl tabular-nums">
            {formatMoney({ amount: total, currency }, locale)}
          </span>
        </p>
        <p className="max-w-[40ch] text-[12px] text-muted">
          {t("shippingNote")}
        </p>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={isPending}
          className="mt-2 w-full cursor-pointer bg-brand px-8 py-3 text-[14px] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-progress disabled:opacity-60 sm:w-auto"
        >
          {isPending ? t("redirecting") : t("checkout")}
        </button>

        <p role="alert" className="max-w-[48ch] text-[13px] text-[#F5C8E8]">
          {error ? t(`errors.${error}`) : ""}
        </p>
      </div>
    </div>
  );
}
