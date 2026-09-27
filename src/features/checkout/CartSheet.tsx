"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { checkCart, startCheckout } from "@/app/carrito/actions";

import { CartView } from "./CartView";

/**
 * The cart as a panel over the page, entered from the header.
 *
 * `/carrito` stays exactly where it was — this is a second way in, not a
 * replacement. Someone mid-page can check what they have and pay without
 * losing their place, and the two show the same `CartView`, so they cannot
 * drift apart. The page keeps the heading; here the panel itself is the label.
 *
 * A native `<dialog>` rather than a positioned div: the focus trap, Esc, the
 * inert backdrop and the top layer all come free, and all four are fiddly to
 * rebuild. `showModal()` is called from an effect because a dialog opened by
 * an attribute is non-modal, which is none of the above.
 *
 * The server actions are imported rather than passed down as they are on the
 * route. There is no route to hand them over here — the header is in the root
 * layout — and a `"use server"` import costs the client nothing: what ships is
 * a stub that calls back, never the catalogue behind it.
 */
export function CartSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("cart");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Back and forward leave the panel behind too. The header survives
  // navigation, so without this the sheet would still be sitting over the page
  // it sent you to.
  useEffect(() => {
    onClose();
    // Only when the route actually changes — not when the callback identity does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * Any link out of the panel closes it.
   *
   * The route effect above cannot do this on its own: "Ver libros" in the
   * empty cart points at `/libros`, and someone reading `/libros` is already
   * there — the pathname never changes, so nothing would ever fire and the
   * panel would sit open over the page it just "navigated" to.
   *
   * Delegated rather than wired per link, so a link added to `CartView` later
   * is covered without anyone remembering this. Modified clicks are left
   * alone: those open a new tab, and the panel should still be here on return.
   *
   * Deliberately does not skip `defaultPrevented`: `next/link` prevents the
   * default on every click it handles, and this runs on the way up, so that
   * flag is always set by the time it gets here. The modifier checks below are
   * what actually separate "going somewhere" from "opening a tab" — Link
   * leaves modified clicks to the browser and never touches them.
   */
  function closeOnLinkOut(event: React.MouseEvent) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if ((event.target as Element | null)?.closest("a[href]")) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("title")}
      // Esc and the backdrop both close through React rather than letting the
      // element close itself, or `open` would go on claiming it is still up.
      onClose={onClose}
      onClick={(event) => {
        // The dialog's own box is the panel; a click landing on the element
        // itself is a click on the backdrop beside it.
        if (event.target === dialogRef.current) onClose();
      }}
      className="cart-sheet ms-auto me-0 my-0 h-dvh max-h-dvh w-full max-w-none border-s border-foreground/15 bg-background text-foreground backdrop:bg-black/50 md:w-1/3 md:min-w-[22rem]"
    >
      <div className="flex h-full flex-col">
        <div className="flex justify-end p-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="cursor-pointer p-2 text-[20px] leading-none transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            ×
          </button>
        </div>

        {/* Scrolls inside the panel: a long cart must not take the page with
            it, and the close button stays reachable at the top. */}
        <div
          onClick={closeOnLinkOut}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-10"
        >
          <CartView checkout={startCheckout} check={checkCart} />
        </div>
      </div>
    </dialog>
  );
}
