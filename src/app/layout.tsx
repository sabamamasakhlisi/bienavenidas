import type { Metadata } from "next";

import localFont from "next/font/local";

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CartProvider } from "@/features/checkout/cart";
import { dirFor, isLocale, defaultLocale } from "@/i18n/config";
import { SITE_NAME, openGraphFor, siteUrl } from "@/lib/site";

import "./globals.css";

const baskervvol = localFont({
  src: [
    {
      path: "../../public/fonts/baskervvol/BBBBaskervvol-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-baskervvol",
});

const switzer = localFont({
  src: [
    {
      path: "../../public/fonts/switzer/Switzer-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-switzer",
});

/**
 * Every page is rendered once and served from the CDN, then re-rendered in the
 * background at most once a minute, which is how fresh the shelf's stock and
 * prices stay. Checkout never trusts this copy: it re-reads both before
 * taking payment. (Pages that read the request, like the thank-you page, stay
 * rendered on demand regardless.)
 */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    metadataBase: siteUrl(),
    title: { default: t("title"), template: `%s · ${SITE_NAME}` },
    description: t("description"),
    openGraph: openGraphFor({
      title: t("title"),
      description: t("description"),
      locale,
    }),
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const resolved = isLocale(locale) ? locale : defaultLocale;

  return (
    <html
      lang={resolved}
      dir={dirFor(resolved)}
      className={`${baskervvol.variable} ${switzer.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        {/* Locale and messages are inherited from the server render. */}
        <NextIntlClientProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
