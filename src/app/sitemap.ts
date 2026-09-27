import type { MetadataRoute } from "next";

import { getAllBooks } from "@/features/catalog/catalog";
import { absoluteUrl } from "@/lib/site";

/**
 * Every page worth a search result, at its canonical address. `/libros` is
 * left out because it is the same view as `/`; the cart and thank-you pages
 * are personal and marked noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await getAllBooks();

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...books.map((book) => ({
      url: absoluteUrl(`/libros/${book.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/bienvenidas"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contacto"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/aviso-legal"), changeFrequency: "yearly", priority: 0.1 },
    { url: absoluteUrl("/condiciones"), changeFrequency: "yearly", priority: 0.1 },
  ];
}
