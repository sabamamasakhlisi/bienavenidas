import type { Metadata } from "next";

import { CatalogPage } from "@/features/catalog/CatalogPage";

import { startCheckout } from "../carrito/actions";

// Same view as `/`, which is the canonical copy.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LibrosPage() {
  return <CatalogPage checkout={startCheckout} />;
}
