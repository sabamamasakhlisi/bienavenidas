"use client";

import { useCallback, useRef, useState } from "react";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { SubscribeForm } from "./SubscribeForm";

/**
 * The newsletter sign-up, as a dialog over the contact page.
 *
 * A native `<dialog>` opened with `showModal()` rather than a div: the browser
 * gives the focus trap, Esc, the inert backdrop and the top layer, all of
 * which are fiddly to rebuild and easy to get subtly wrong.
 */
export function NewsletterModal() {
  const t = useTranslations("newsletter");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * Bumped on every open, and used as the form's key.
   *
   * `useActionState` has no reset, so without this the modal would still be
   * showing the last confirmation when the next person opens it — no field,
   * no way to sign up a second address.
   */
  const [session, setSession] = useState(0);

  function open() {
    setSession((n) => n + 1);
    dialogRef.current?.showModal();
    // The caret is placed by `SubscribeForm` as it mounts, not from here: the
    // line above remounts it, so at this point the field it would focus is the
    // one on its way out.
  }

  // Stable, so the form's effect doesn't re-run on every render of this one.
  const focusClose = useCallback(() => closeRef.current?.focus(), []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="mt-20 cursor-pointer text-[15px] underline decoration-[#F5C8E8] decoration-2 underline-offset-[6px] transition-opacity hover:opacity-70"
      >
        {t("open")}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="newsletter-heading"
        // `backdrop:` reaches the ::backdrop pseudo-element, which is what
        // dims the page behind a top-layer dialog.
        className="m-auto w-[min(92vw,44rem)] rounded-2xl border-2 border-[#221e1f] bg-[#E5E2E2] p-8 text-center text-[#4B3B3B] backdrop:bg-black/50 md:p-12"
      >
        <div className="flex flex-col items-center">
          <h2
            id="newsletter-heading"
            className="max-w-[34ch] text-[19px] leading-snug whitespace-pre-line md:text-[22px]"
          >
            {t("heading")}
          </h2>

          <SubscribeForm
            key={session}
            takeFocus={session > 0}
            onSuccess={focusClose}
          />

          <p className="mt-10 max-w-[60ch] text-[12px] leading-relaxed whitespace-pre-line opacity-80">
            {t.rich("smallPrint", {
              privacy: (chunks) => (
                <Link
                  href="/aviso-legal"
                  className="underline decoration-[#F5C8E8] decoration-2 underline-offset-2 transition-opacity hover:opacity-70"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>

          <button
            ref={closeRef}
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="mt-6 cursor-pointer text-[13px] underline decoration-[#F5C8E8] decoration-2 underline-offset-4 transition-opacity hover:opacity-70"
          >
            {t("close")}
          </button>
        </div>
      </dialog>
    </>
  );
}
