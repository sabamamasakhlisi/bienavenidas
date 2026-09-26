import type { Metadata } from "next";

import { CatalogPage } from "@/features/catalog/CatalogPage";

// `/libros` renders this same view and points its canonical here, so search
// engines index one page instead of two duplicates.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** The shelf is the front page — `/` and `/libros` render the same view. */
export default function Home() {
  return <CatalogPage />;
}
