import Image from "next/image";

import type { MerchView } from "./view";

/**
 * The item photographed, or a stand-in for it.
 *
 * `object-contain`, unlike a cover: a book cover cropped to a box still reads
 * as that cover, where a t-shirt with its sleeves cut off does not. The box is
 * held at the photo's own proportion so nothing shifts when it loads.
 */
export function MerchArt({
  merch,
  sizes,
}: {
  merch: MerchView;
  sizes?: string;
}) {
  if (!merch.image) {
    return (
      <div
        role="img"
        aria-label={merch.title}
        className="flex h-full w-full items-end bg-brand/40 p-[6%]"
      >
        <span className="bask-font text-[clamp(0.7rem,1.8cqw,1.5rem)] leading-tight">
          {merch.title}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={merch.image.src}
      alt={merch.image.alt || merch.title}
      width={merch.image.width}
      height={merch.image.height}
      sizes={sizes}
      className="h-full w-full object-contain"
    />
  );
}
