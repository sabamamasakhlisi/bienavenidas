"use client";

import { useRef } from "react";

import { useTranslations } from "next-intl";

import {
  NewsletterDialog,
  type NewsletterHandle,
} from "@/features/newsletter/NewsletterDialog";

/**
 * Stands where the price plate stands, for titles that aren't finished yet.
 *
 * Opens the newsletter sign-up rather than a mail client. The address someone
 * leaves here is the address the shop will write to when the book lands, and
 * that is the same list — so it goes to the same place, instead of arriving as
 * a loose mail nobody has a record of.
 */
export function NotifyLink({ title }: { title: string }) {
  const t = useTranslations("book");
  const dialog = useRef<NewsletterHandle>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.open()}
        className="block w-full cursor-pointer bg-brand px-4 py-2 text-center text-[13px] text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {t("notify")}
        <span className="sr-only">
          {" — "}
          {t("notifySubject", { title })}
        </span>
      </button>

      <NewsletterDialog ref={dialog} />
    </>
  );
}
