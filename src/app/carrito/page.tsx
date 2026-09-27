import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { CartView } from "@/features/checkout/CartView";

import { checkCart, startCheckout } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  // A cart is personal and empty to a crawler: nothing to index.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function CarritoPage() {
  const t = await getTranslations("cart");

  return (
    <Container className="py-24 md:py-32">
      <h1 className="bask-font mb-12 text-4xl md:text-5xl">{t("title")}</h1>
      <CartView checkout={startCheckout} check={checkCart} />
    </Container>
  );
}
