import type { Metadata } from "next";

import localFont from "next/font/local";

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Header } from "@/components/layout/Header";
import { CartProvider } from "@/features/checkout/cart";
import { dirFor, isLocale, defaultLocale } from "@/i18n/config";

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("title"),
    description: t("description"),
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
      <body className="flex min-h-full flex-col">
        {/* Locale and messages are inherited from the server render. */}
        <NextIntlClientProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
