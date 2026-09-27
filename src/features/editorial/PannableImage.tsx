"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * A viewport onto an image far larger than the screen.
 *
 * The reader drags, wheels, swipes or arrows around it in any direction. The
 * offset is held in a ref and written straight to `style.transform` — panning
 * runs at pointer/wheel frequency, so routing it through state would re-render
 * on every frame for no benefit.
 *
 * It opens centred, and clamps so the image edge can never pull away from the
 * viewport edge.
 */
export function PannableImage({
  src,
  avifSrc,
  webpSrc,
  alt,
  width,
  height,
  label,
  background,
}: {
  /** Fallback source. Always a format every browser can decode. */
  src: string;
  avifSrc?: string;
  webpSrc?: string;
  alt: string;
  /** Rendered size of the image in px — larger than the viewport by design. */
  width: number;
  height: number;
  label: string;
  /**
   * The image's own ground colour. Painted under the frame so the section
   * never flashes the site's near-black while a very large asset decodes —
   * which shows through the header monogram's open spaces.
   */
  background?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const dragging = useRef<{ id: number; x: number; y: number } | null>(null);

  const apply = useCallback(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    // Never let the image pull away from an edge of the frame.
    const minX = Math.min(0, frame.clientWidth - width);
    const minY = Math.min(0, frame.clientHeight - height);
    offset.current.x = Math.min(0, Math.max(minX, offset.current.x));
    offset.current.y = Math.min(0, Math.max(minY, offset.current.y));

    canvas.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
  }, [width, height]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      offset.current.x += dx;
      offset.current.y += dy;
      apply();
    },
    [apply],
  );

  // Open centred, and keep the clamp honest when the window resizes.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    offset.current = {
      x: (frame.clientWidth - width) / 2,
      y: (frame.clientHeight - height) / 2,
    };
    apply();

    const onResize = () => apply();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply, width, height]);

  // Non-passive so the page behind never scrolls while panning.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      panBy(-event.deltaX, -event.deltaY);
    }

    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [panBy]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragging.current;
    if (!drag || drag.id !== event.pointerId) return;
    panBy(event.clientX - drag.x, event.clientY - drag.y);
    drag.x = event.clientX;
    drag.y = event.clientY;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragging.current?.id !== event.pointerId) return;
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 240 : 80;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    panBy(move[0], move[1]);
  }

  return (
    <div
      ref={frameRef}
      // Tells the canvas what colour to bounce in. See `body:has(...)` in
      // globals.css: the overscroll strip is painted from the body, not from
      // here, so it has to be told.
      data-ground="poster"
      role="application"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      style={background ? { backgroundColor: background } : undefined}
      // Full height, lifted under the header rather than starting below it:
      // the bar's shaped end cuts notches that are supposed to show the poster,
      // and they can only do that if the poster reaches up behind the strip.
      className="relative mt-[calc(var(--hdr-h)*-1)] h-[100svh] w-full cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
    >
      <div
        ref={canvasRef}
        style={{ width, height }}
        className="absolute top-0 left-0 will-change-transform"
      >
        {/* Plain <picture>: this is one oversized asset panned at native size,
            which is exactly the case next/image's responsive resizing works
            against. The browser picks the first source it can decode, so AVIF
            goes to those that support it and everyone else still gets a file. */}
        <picture>
          {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            draggable={false}
            // It is the largest paint on the page; nothing should outrank it.
            fetchPriority="high"
            decoding="async"
            className="h-full w-full max-w-none object-cover"
          />
        </picture>
      </div>
    </div>
  );
}
