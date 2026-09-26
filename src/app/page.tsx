import { CatalogPage } from "@/features/catalog/CatalogPage";

/** The shelf is the front page — `/` and `/libros` render the same view. */
export default function Home() {
  return <CatalogPage />;
}
