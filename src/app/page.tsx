import type { Metadata } from "next";

import { CatalogPage } from "@/features/catalog/CatalogPage";
import { CONTACT_EMAIL, SITE_NAME, absoluteUrl, jsonLd } from "@/lib/site";

// `/libros` renders this same view and points its canonical here, so search
// engines index one page instead of two duplicates.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** The shelf is the front page — `/` and `/libros` render the same view. */
export default function Home() {
  return (
    <>
      {/* Who publishes this site, for search engines' knowledge panels. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            logo: absoluteUrl("/apple-icon.png"),
            email: CONTACT_EMAIL,
          }),
        }}
      />
      <CatalogPage />
    </>
  );
}
