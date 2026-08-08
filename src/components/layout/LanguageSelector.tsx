"use client";

import { useRouter } from "next/navigation";
import { Fragment, useTransition } from "react";

import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

/**
 * In-place language switch, set as `es/en` per the design.
 *
 * Writes the `NEXT_LOCALE` cookie through a Server Action, then calls
 * `router.refresh()` — which re-renders Server Components against the new
 * cookie *without navigating*, so the path in the address bar is untouched.
 */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === active) return;

    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      // Colour is inherited from the header, which inverts on bienvenidas.
      className={`flex items-center text-[15px] leading-none ${className}`}
      role="group"
      aria-label={t("languageLabel")}
    >
      {locales.map((locale, index) => (
        <Fragment key={locale}>
          {index > 0 && (
            <span aria-hidden className="opacity-70">
              /
            </span>
          )}
          <button
            type="button"
            lang={locale}
            onClick={() => select(locale)}
            aria-pressed={locale === active}
            disabled={isPending}
            className={`transition-opacity hover:opacity-100 disabled:cursor-progress ${
              locale === active ? "opacity-100" : "opacity-55"
            }`}
          >
            {locale}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
