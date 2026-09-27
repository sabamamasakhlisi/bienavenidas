import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";

/**
 * The frame for the legal pages: the contact page's ground, ink and
 * watermark, with a single readable column of text on top.
 *
 * The watermark is fixed rather than absolute, because these pages scroll and
 * the contact page doesn't: it stays put behind the text the way it sits
 * behind the contact details.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <section
      data-ground="light"
      // No `min-h-[100svh]`: the section is one screen tall *and* the footer
      // stacks below it, which leaves every short legal page with a vestigial
      // scroll exactly the footer's height — you drag, the footer slides up,
      // it stops. The body is already `min-h-full flex-col` with `main` as
      // `flex-1`, so the page fills the window without being told to, and any
      // slack under the text is the canvas, which is this same ground.
      className="relative isolate mt-[calc(var(--hdr-h)*-1)] overflow-hidden bg-[#E5E2E2] px-6 pt-[calc(var(--hdr-h)+5rem)] pb-24 text-[#4B3B3B]"
    >
      <Logo
        decorative
        className="pointer-events-none fixed top-1/2 left-1/2 -z-10 w-[150vw] min-w-[1100px] -translate-x-1/2 -translate-y-1/2 text-[#EFEDEC]"
      />

      <article className="mx-auto flex max-w-[62ch] flex-col gap-10 text-[15px] leading-relaxed">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="bask-font text-[21px]">{title}</h1>
          <p className="text-[12px] opacity-70">{updated}</p>
        </header>

        {children}
      </article>
    </section>
  );
}

/** One numbered part of a legal page. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="bask-font text-[18px]">{title}</h2>
      {children}
    </section>
  );
}

/** The contact address, underlined in the accent like on the contact page. */
export function LegalMail({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="underline decoration-[#F5C8E8] decoration-2 underline-offset-[4px] transition-opacity hover:opacity-70"
    >
      {email}
    </a>
  );
}
