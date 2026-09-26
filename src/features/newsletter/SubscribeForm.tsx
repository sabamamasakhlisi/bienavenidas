"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { subscribe } from "./actions";
import { initialSubscribeState, type SubscribeState } from "./state";

/**
 * The sign-up itself: address in, confirmation out.
 *
 * Separate from the dialog so the dialog can remount it. `useActionState` has
 * no reset, and a form that keeps its success state would greet the next
 * person who opens the modal with someone else's confirmation and no way to
 * type their own address.
 */
export function SubscribeForm({
  takeFocus,
  onSuccess,
}: {
  /**
   * Whether to put the caret in the field as this mounts.
   *
   * The dialog remounts this on every open, so mounting is the moment the
   * field appears — and it happens after `showModal()`, which moves focus
   * itself. Asking here therefore wins, where asking from the dialog would
   * have run against an input that did not exist yet.
   *
   * False for the copy that exists before the modal has ever been opened, or
   * merely loading the contact page would steal the caret.
   */
  takeFocus: boolean;
  onSuccess: () => void;
}) {
  const t = useTranslations("newsletter");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (takeFocus) emailRef.current?.focus();
  }, [takeFocus]);

  const [state, formAction, isPending] = useActionState<
    SubscribeState,
    FormData
  >(subscribe, initialSubscribeState);

  // React 19 resets a form once its action resolves, which would wipe the
  // address the moment we told someone it was malformed. Holding the value
  // here keeps it there to be corrected.
  const [email, setEmail] = useState("");

  const succeeded = state.status === "success";

  // The submit button unmounts on success, and focus would fall to <body> —
  // outside the dialog, where Esc and the focus trap no longer apply.
  useEffect(() => {
    if (succeeded) onSuccess();
  }, [succeeded, onSuccess]);

  if (succeeded) {
    return (
      <p role="status" className="mt-10 text-[17px]">
        {t("success")}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-10 flex w-full flex-col items-center">
      {/* Off-screen rather than `hidden`: a bot reading the markup fills what
          it finds there, and a real person never reaches this because it is
          out of the tab order. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="flex w-full max-w-[34rem] flex-col gap-3 sm:flex-row">
        <input
          ref={emailRef}
          type="email"
          name="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          aria-invalid={state.status === "error"}
          className="min-w-0 flex-1 rounded-xl bg-[#F5C8E8] px-5 py-4 text-[17px] text-[#4B3B3B] placeholder:text-[#4B3B3B]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221e1f]"
        />

        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-xl border-2 border-[#F5C8E8] bg-[#4B3B3B] px-7 py-4 text-[17px] whitespace-nowrap text-[#F5C8E8] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221e1f] disabled:cursor-progress disabled:opacity-60"
        >
          {isPending ? t("sending") : t("submit")}
        </button>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-4 text-[14px]">
          {t(`errors.${state.reason}`)}
        </p>
      )}
    </form>
  );
}
