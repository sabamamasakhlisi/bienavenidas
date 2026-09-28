"use client";

import { useRef } from "react";

import { useTranslations } from "next-intl";

import { NewsletterDialog, type NewsletterHandle } from "./NewsletterDialog";

/** The newsletter invitation on the contact page, and the dialog it raises. */
export function NewsletterModal() {
  const t = useTranslations("newsletter");
  const dialog = useRef<NewsletterHandle>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.open()}
        className="mt-20 cursor-pointer text-[15px] underline decoration-[#F5C8E8] decoration-2 underline-offset-[6px] transition-opacity hover:opacity-70"
      >
        {t("open")}
      </button>

      <NewsletterDialog ref={dialog} />
    </>
  );
}
