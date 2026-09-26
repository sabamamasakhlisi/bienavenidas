import type { Metadata } from "next";
import Link from "next/link";

import { getLocale, getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/Container";
import { ClearCart } from "@/features/checkout/ClearCart";
import { formatMoney } from "@/features/checkout/money";
import { getOrderSummary } from "@/features/checkout/stripe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("thanksTitle") };
}

/** Where Stripe sends the customer back after paying. */
export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { session_id } = await searchParams;
  const order =
    typeof session_id === "string" ? await getOrderSummary(session_id) : null;
  const t = await getTranslations("cart");
  const locale = await getLocale();

  return (
    <Container className="py-24 md:py-32">
      <h1 className="bask-font text-4xl md:text-5xl">{t("thanksTitle")}</h1>

      <div className="mt-6 flex max-w-xl flex-col gap-3 opacity-80">
        {order?.paid ? (
          <>
            <ClearCart />
            <p>{t("thanksBody", { email: order.email ?? "none" })}</p>
            {order.total !== null && order.currency && (
              <p>
                {t("thanksTotal", {
                  total: formatMoney(
                    { amount: order.total, currency: order.currency },
                    locale,
                  ),
                })}
              </p>
            )}
          </>
        ) : (
          <p>{order ? t("pendingBody") : t("unknownBody")}</p>
        )}
      </div>

      <Link
        href="/libros"
        className="mt-10 inline-block text-xs tracking-[0.2em] uppercase underline underline-offset-4"
      >
        {t("backToBooks")}
      </Link>
    </Container>
  );
}
