import type { Metadata } from "next";

import { CatalogPage } from "@/features/catalog/CatalogPage";

// Same view as `/`, which is the canonical copy.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LibrosPage() {
  return <CatalogPage />;
}
