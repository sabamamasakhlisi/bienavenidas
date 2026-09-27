"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import { NAV_ROUTES, isActiveRoute } from "./routes";

/** Overlay drawer for viewports below `md`. */
export function MobileNav({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // A tap on a link navigates but does not unmount this component, so the
  // drawer has to close itself when the route changes. Adjusted during render
  // rather than in an effect — that avoids a cascading re-render, and unlike an
  // onClick handler it also covers back/forward navigation.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      // Keep focus inside the drawer while it covers the page.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex flex-col justify-center gap-[5px] p-2"
      >
        <span className="sr-only">
          {open ? t("common.closeMenu") : t("common.openMenu")}
        </span>
        <span aria-hidden className="block h-px w-6 bg-current" />
        <span aria-hidden className="block h-px w-6 bg-current" />
      </button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("common.brand")}
          // Sets its own colours rather than inheriting the header's — the
          // drawer is always the dark overlay, even where the bar is light.
          className="fixed inset-0 z-50 bg-background/95 text-foreground backdrop-blur-md"
        >
          <div className="flex items-center justify-end p-6">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="p-2 text-2xl leading-none"
            >
              <span className="sr-only">{t("common.closeMenu")}</span>
              <span aria-hidden>&times;</span>
            </button>
          </div>

          <nav className="flex flex-col items-start gap-8 px-8 pt-8">
            {NAV_ROUTES.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
                className={`bask-font text-4xl ${
                  isActiveRoute(pathname, href) ? "opacity-100" : "opacity-60"
                }`}
              >
                {t(`nav.${key}`)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
