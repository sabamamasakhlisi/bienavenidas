import type { Metadata } from "next";

import { getLocale, getTranslations } from "next-intl/server";

import { Logo } from "@/components/layout/Logo";
import { NewsletterModal } from "@/features/newsletter/NewsletterModal";
import { CONTACT_EMAIL, openGraphFor } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacto");
  const tMeta = await getTranslations("metadata.pages");
  const description = tMeta("contacto");

  return {
    title: t("title"),
    description,
    alternates: { canonical: "/contacto" },
    openGraph: openGraphFor({
      title: t("title"),
      description,
      path: "/contacto",
      locale: await getLocale(),
    }),
  };
}

const EMAIL = CONTACT_EMAIL;

/**
 * Social accounts.
 *
 * Handles inferred from the bienavenidas.com domain — confirm these point at
 * the real accounts before this goes live.
 */
const SOCIALS = [
  { key: "instagram", href: "https://instagram.com/bienavenidas" },
  { key: "substack", href: "https://bienavenidas.substack.com" },
  { key: "tiktok", href: "https://tiktok.com/@bienavenidas" },
] as const;

export default async function ContactoPage() {
  const t = await getTranslations("contacto");

  return (
    <section className="relative mt-[calc(var(--hdr-h)*-1)] flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#E5E2E2] px-6 text-[#4B3B3B]">
      {/* The monogram again, blown up past the edges of the page as a
          watermark. Barely lighter than the ground it sits on — it should read
          as texture, not as a second logo. */}
      <Logo
        decorative
        className="pointer-events-none absolute top-1/2 left-1/2 w-[150vw] min-w-[1100px] -translate-x-1/2 -translate-y-1/2 text-[#EFEDEC]"
      />

      <h1 className="sr-only">{t("title")}</h1>

      <div className="relative flex flex-col items-center text-center">
        <p className="max-w-[36ch] text-[15px] leading-relaxed whitespace-pre-line">
          {t("intro")}
        </p>

        <a
          href={`mailto:${EMAIL}`}
          // Underlined in the accent at rest, as the design draws it — the
          // pink is what marks these as the page's live text.
          className="bask-font mt-6 text-[21px] underline decoration-[#F5C8E8] decoration-2 underline-offset-[6px] transition-opacity hover:opacity-70"
        >
          {EMAIL}
        </a>

        <ul className="mt-20 flex flex-wrap items-center justify-center gap-x-16 gap-y-4 md:gap-x-28">
          {SOCIALS.map(({ key, href }) => (
            <li key={key}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] underline decoration-[#F5C8E8] decoration-2 underline-offset-[6px] transition-opacity hover:opacity-70"
              >
                {t(`social.${key}`)}
              </a>
            </li>
          ))}
        </ul>

        <NewsletterModal />
      </div>

    </section>
  );
}
