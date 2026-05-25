import type { Metadata } from "next";

import localFont from "next/font/local";

import "./globals.css";

const baskervvol = localFont({
  src: [
    {
      path: "../public/fonts/baskervvol/BBBBaskervvol-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-baskervvol",
});

const switzer = localFont({
  src: [
    {
      path: "../public/fonts/switzer/Switzer-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-switzer",
});

export const metadata: Metadata = {
  title: "BIENAVENIDAS - BIEN*VENIDAS",
  description: "BIEN*VENIDAS editorial coming soon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baskervvol.variable} ${switzer.variable} h-full antialiased`}
    >
      <body className="flex flex-col">{children}</body>
    </html>
  );
}
