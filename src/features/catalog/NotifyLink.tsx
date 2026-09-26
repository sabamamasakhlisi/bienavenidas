import { useTranslations } from "next-intl";

/**
 * Stands where the price plate stands, for titles that aren't finished yet.
 *
 * There is no subscription list to join, so this is plain mail: the reader's
 * own client opens with the title already in the subject, and the address is
 * the one on the contact page. Nothing to store, nothing to leak, and it works
 * the moment the flag is set.
 */
const EMAIL = "hola@bienavenidas.com";

export function NotifyLink({ title }: { title: string }) {
  const t = useTranslations("book");
  const subject = t("notifySubject", { title });

  return (
    <a
      href={`mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`}
      className="block w-full cursor-pointer bg-brand px-4 py-2 text-center text-[13px] text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {t("notify")}
      <span className="sr-only">
        {" — "}
        {subject}
      </span>
    </a>
  );
}
