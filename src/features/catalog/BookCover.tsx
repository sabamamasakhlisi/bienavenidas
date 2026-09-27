import Image from "next/image";

import type { Book } from "@/types/book";

/**
 * A book's artwork, or a stand-in for it.
 *
 * Defaults to the cover; pass `image` to draw a different face of the same
 * book, such as its spine on the shelf. A title with no artwork at all renders
 * a tinted plate at the right aspect ratio with its name set on it, so every
 * layout stays honest about the space real art will occupy.
 */
export function BookCover({
  book,
  title,
  image,
  className = "",
  sizes,
  priority = false,
  fetchPriority,
  position,
}: {
  book: Book;
  title: string;
  /** Overrides `book.cover` — e.g. the spine. */
  image?: Book["cover"];
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** "high" for the one image that is the page's largest paint but may be
   * hidden at other widths, where `priority` would download it regardless. */
  fetchPriority?: "high";
  /** CSS `object-position` — which part of the picture survives the crop.
   * Only meaningful when the box is a different shape from the art. */
  position?: string;
}) {
  const art = image ?? book.cover;

  if (art) {
    return (
      <Image
        src={art.src}
        alt={art.alt || title}
        width={art.width}
        height={art.height}
        sizes={sizes}
        priority={priority}
        fetchPriority={fetchPriority}
        style={position ? { objectPosition: position } : undefined}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const tone = book.coverTone ?? "#3b3335";
  const light = isLight(tone);

  return (
    <div
      role="img"
      aria-label={title}
      style={{ backgroundColor: tone, color: light ? "#241f20" : "#efeae4" }}
      className={`flex h-full w-full flex-col justify-end p-[6%] ${className}`}
    >
      <span className="bask-font text-[clamp(0.6rem,1.6cqw,1.5rem)] leading-tight">
        {title}
      </span>
    </div>
  );
}

/** Rough perceived-luminance test, so text on the plate stays readable. */
function isLight(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
