import Link from "next/link";

import { useTranslations } from "next-intl";

import { Container } from "@/components/ui/Container";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="py-24 md:py-32">
      <h1 className="bask-font text-4xl md:text-5xl">{t("title")}</h1>
      <p className="mt-6 max-w-xl opacity-70">{t("body")}</p>
      <Link
        href="/"
        className="mt-10 inline-block text-xs uppercase tracking-[0.2em] underline underline-offset-4"
      >
        {t("home")}
      </Link>
    </Container>
  );
}
