import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/** Crawl everything public; skip the cart and the API, which have nothing to index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/carrito", "/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
