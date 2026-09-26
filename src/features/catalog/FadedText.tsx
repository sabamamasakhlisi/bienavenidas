"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Text given a fixed height, faded out where it is cut.
 *
 * The block scrolls on its own, so a long quote doesn't push the rest of the
 * entry down a phone screen. The fade is what tells you it scrolls: it sits
 * over the last lines while there is more below and clears once you reach the
 * end, so the gradient is a state, not decoration.
 *
 * It is an overlay rather than a `mask-image` because opacity is the thing that
 * has to animate, and mask images don't transition.
 */
export function FadedText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const sync = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    // A pixel of slack: fractional layout means `scrollTop` never quite
    // reaches the arithmetic bottom, which would leave the fade up for good.
    const remaining = node.scrollHeight - node.clientHeight - node.scrollTop;
    setMore(remaining > 1);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    sync();

    // The first measurement is taken in the fallback face. The display serif
    // sets much longer than it, so a quote that fitted at mount may not fit
    // once the real font arrives — and swapping a font resizes neither the box
    // nor the paragraph's own border box, so nothing below would catch it.
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) sync();
    });

    // Text reflowing to a new number of lines changes `scrollHeight` without
    // ever resizing the box, so watch the content as well as the container.
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);

    return () => {
      live = false;
      observer.disconnect();
    };
  }, [sync]);

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={sync}
        className={`max-h-52 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>

      <div
        aria-hidden
        style={{ opacity: more ? 1 : 0 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent to-background transition-opacity duration-300"
      />
    </div>
  );
}
