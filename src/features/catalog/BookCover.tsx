import Image from "next/image";

import type { Book } from "@/types/book";

/**
 * A cover, or a stand-in for one.
 *
 * No cover art exists in the repo yet, so a book without `cover` renders a
 * tinted plate at the same aspect ratio with the title set on it. That keeps
 * every layout honest about the space a real cover will occupy — adding the
 * file and setting `cover` is then a pure swap.
 */
export function BookCover({
  book,
  title,
  className = "",
  sizes,
  priority = false,
}: {
  book: Book;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (book.cover) {
    return (
      <Image
        src={book.cover.src}
        alt={book.cover.alt || title}
        width={book.cover.width}
        height={book.cover.height}
        sizes={sizes}
        priority={priority}
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
