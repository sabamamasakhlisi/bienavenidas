import type { Book, ISBN } from "@/types/book";
import type { Locale } from "@/i18n/config";

/**
 * The catalogue.
 *
 * Content is transcribed from the INSPO frame. Cover artwork is not in the
 * repository yet — `cover` is left undefined and the shelf/section components
 * fall back to a tinted placeholder that keeps the real aspect ratio, so
 * dropping a file into `public/covers/` and setting `cover` is the only change
 * needed per title.
 */
const books: Book[] = [
  {
    slug: "joven-chica",
    isbn: "9788409906796" as ISBN,
    title: "Primeros materiales para una teoría de la Joven-Chica",
    authors: [{ slug: "tiqqun", name: "TIQQUN", bio: {} }],
    description:
      "Todas somos Jóvenes-Chicas. Todas somos nuestra propia jefa, mandamases, controladoras, estilistas y cirujanas de sí mismas, chulas y putas. Todas somos reinas amputadas frente a las escalerillas de un trono que no hace más que cambiar de rostro y parecerse a todas nuestras madres. En la estetización total, el vaciamiento y agotamiento afectivo que vivimos, somos las hijas predilectas de un dios que no nos dió más arma que un cuerpo fagocitador de capitales varios. ¿Cómo vamos entonces a mirar más allá de nuestros ombligos?",
    price: { amount: 1600, currency: "EUR" },
    stock: "in_stock",
    pageCount: 232,
    publishedAt: "2016-01-01",
    credits: "cc. 2016 TIQQUN\nPrimera edición\nDiseño por Bernardina Studio",
    spine: { color: "#6f5257", width: 26 },
    coverTone: "#4a3a3d",
    coverAspect: 0.633,
    shelfWidth: 300,
    translations: {
      es: {
        quote:
          "La intimidad de la Joven-Chica, se ve equiparada a toda intimidad, convirtiéndose así en algo anónimo, externo y objetal. La Joven-Chica nunca crea nada, se recrea a sí misma. Dotando a los jóvenes y a las mujeres de un valor añadido simbólico absurdo, convirtiéndolos en portadores exclusivos de los dos nuevos conocimientos esotéricos propios de la nueva organización social, aquella del consumo y de la seducción, el Espectáculo ha liberado así a los esclavos del pasado.\nNo obstante, los ha liberado COMO ESCLAVOS.",
      },
      en: {
        title: "Preliminary Materials for a Theory of the Young-Girl",
        description:
          "We are all Young-Girls. We are all our own boss, ringleader, controller, stylist and surgeon, pimp and whore. We are all amputated queens at the foot of a throne that does nothing but change face and resemble all our mothers. In the total aestheticisation, the hollowing out and affective exhaustion we live in, we are the favourite daughters of a god who gave us no weapon but a body that devours capital of every kind. How then are we to look beyond our own navels?",
        quote:
          "The intimacy of the Young-Girl is made equivalent to all intimacy, becoming something anonymous, external, objectal. The Young-Girl never creates anything, she recreates herself. By endowing the young and women with an absurd symbolic added value, making them the exclusive bearers of the two new esoteric forms of knowledge proper to the new social order — that of consumption and of seduction — the Spectacle has liberated the slaves of the past.\nAnd yet it has liberated them AS SLAVES.",
      },
    },
  },
  {
    slug: "witches-used-to-rule-the-web",
    isbn: "9788412000002" as ISBN,
    title:
      "WITCHES (USED TO) RULE THE WEB. Domestic Tasks, (De-)Tangled Machinery and Poisoning The Wish For Absolute Automation",
    authors: [
      { slug: "veronica-obenauer", name: "Veronica Obenauer", bio: {} },
    ],
    description:
      "Dedicated 2 all bittersweet scrollers, always caretaking, 4ever and never notification-on-mute, grass-touching lovers/haters of the internet. <3",
    price: { amount: 2000, currency: "EUR" },
    // Still in the making: the entry announces it and takes notice-me mail
    // instead of offering a price.
    stock: "coming_soon",
    pageCount: 148,
    publishedAt: "2026-01-01",
    credits: "cc. 2026 Veronica Obenauer\nPrimera edición",
    spine: { color: "#e8e6e1", width: 30 },
    coverTone: "#dedbd5",
    coverAspect: 0.666,
    shelfWidth: 225,
    spineAspect: 0.184,
    spineWidth: 62,
    shelfLean: -3,
    translations: {
      en: {
        quote:
          "If we have to imagine a cult full of witches, we catch ourselves getting trapped by a stereotypical image mostly provided by common pop culture and traditional fairy tales. Maybe our witch is an elderly woman, wearing a pointy black hat coated with an iridescent glimmer. Her skin is tinted in a shade of green—the exact shade of green that would display discharged snoot on a clean tissue in a cartoon. Our witch has a big wart on the left side of her nose. Her laugh sounds rather evil, as she pours a muddy juice into a big rusty enamel pot, while being accompanied by a skinny black cat which is crawling up her shoulder. The scraggly cat emits a high-pitched screech, which most could identify as a scratchy type of meowing. Hiding in a wooden cottage in the hollows of a dark forest, it is their witch's goal to poison mankind and bewitch the pretty ones in envy of their own ugliness. And if there was any kind of supernatural happening, it never wore a pointy hat.",
      },
      es: {
        description:
          "Dedicado a todas las scrollers agridulces, siempre cuidando, por siempre y nunca con las notificaciones en silencio, amantes/enemigas de internet que tocan el césped. <3",
        quote:
          "Si tenemos que imaginar un aquelarre lleno de brujas, nos descubrimos atrapadas en una imagen estereotipada servida por la cultura pop y los cuentos de siempre. Quizá nuestra bruja sea una anciana con un sombrero puntiagudo negro cubierto de un brillo iridiscente. Su piel tiene un tono verde: exactamente el verde de un moco descargado sobre un pañuelo limpio en un dibujo animado. Nuestra bruja tiene una verruga grande en el lado izquierdo de la nariz. Su risa suena más bien malvada mientras vierte un jugo turbio en una olla de esmalte oxidada, acompañada por un gato negro y flaco que le trepa por el hombro. Escondida en una cabaña de madera en las hondonadas de un bosque oscuro, la meta de esa bruja es envenenar a la humanidad y hechizar a las bonitas por envidia de su propia fealdad. Y si alguna vez ocurrió algo sobrenatural, nunca llevó sombrero puntiagudo.",
      },
    },
  },
  {
    slug: "open-call-sad-girls",
    isbn: "9788412000003" as ISBN,
    title: "OPEN CALL — Sad Girls",
    authors: [{ slug: "bienavenidas", name: "BIEN*VENIDAS", bio: {} }],
    description:
      "La Sad Girl habita entre nosotras y toma diversas formas. Desde las chicas con bailarinas patizambas a las estrellas del pop que no paran de maltratar sus cuerpos por ese amor cutre. Chicas tristes, os buscamos. Si queréis formar parte de este ensayo envíanos tus textos, imágenes y cosechas propias a través del formulario.",
    price: { amount: 0, currency: "EUR" },
    stock: "preorder",
    pageCount: 32,
    publishedAt: "2026-07-31",
    credits: "Deadline 31 de julio\nhola@bienavenidas.com",
    spine: { color: "#e7c6dc", width: 22 },
    coverTone: "#e3c4d8",
    coverAspect: 0.746,
    shelfWidth: 310,
    translations: {
      en: {
        description:
          "The Sad Girl lives among us and takes many forms. From the girls in knock-kneed ballet flats to the pop stars who never stop mistreating their bodies for that shabby kind of love. Sad girls, we're looking for you. If you want to be part of this essay, send us your texts, images and own harvests through the form.",
        quote: "Sad girls, we're looking for you.",
      },
      es: {
        quote: "Chicas tristes, os buscamos.",
      },
    },
  },
];

/**
 * The shelf, in order, exactly as the titles stand in the design.
 *
 * Spines are unlabelled stock — they give the shelf its density without
 * pretending to be real catalogue entries. Heights are percentages of the
 * shelf's own height so the arrangement keeps its proportions at any size.
 */
export type ShelfItem =
  | { kind: "spine"; color: string; width: number; height: number; lean?: number }
  | { kind: "book"; slug: string };

export const shelfLayout: ShelfItem[] = [
  { kind: "spine", color: "#e7b9d4", width: 24, height: 54, lean: -4 },
  { kind: "spine", color: "#2f5f9e", width: 38, height: 50, lean: -6 },
  { kind: "spine", color: "#d6d4cf", width: 40, height: 59 },
  { kind: "spine", color: "#8fd3ae", width: 52, height: 54 },
  { kind: "book", slug: "joven-chica" },
  { kind: "spine", color: "#5aa8e6", width: 30, height: 57, lean: 4 },
  { kind: "spine", color: "#e8e6e1", width: 44, height: 52 },
  { kind: "spine", color: "#7c2e45", width: 26, height: 49, lean: 3 },
  { kind: "spine", color: "#c89a72", width: 60, height: 50, lean: 5 },
  { kind: "spine", color: "#3f4a6b", width: 42, height: 56, lean: -3 },
  { kind: "book", slug: "witches-used-to-rule-the-web" },
  { kind: "spine", color: "#f0efe9", width: 36, height: 51 },
  { kind: "spine", color: "#6b7a52", width: 48, height: 58, lean: 2 },
  { kind: "spine", color: "#d9c05a", width: 28, height: 50, lean: -2 },
  { kind: "spine", color: "#6f5257", width: 38, height: 53 },
  { kind: "spine", color: "#b8452f", width: 42, height: 47, lean: 4 },
  { kind: "spine", color: "#d6d4cf", width: 34, height: 57 },
  { kind: "spine", color: "#e7b9d4", width: 56, height: 52, lean: -3 },
  { kind: "spine", color: "#2f5f9e", width: 44, height: 55 },
  { kind: "spine", color: "#8fd3ae", width: 40, height: 48, lean: 3 },
  { kind: "spine", color: "#e8e6e1", width: 30, height: 58 },
  { kind: "spine", color: "#5aa8e6", width: 50, height: 51, lean: -4 },
  { kind: "book", slug: "open-call-sad-girls" },
  { kind: "spine", color: "#c89a72", width: 42, height: 53 },
  { kind: "spine", color: "#3f4a6b", width: 38, height: 49, lean: 2 },
  { kind: "spine", color: "#f0efe9", width: 42, height: 56 },
  { kind: "spine", color: "#7c2e45", width: 46, height: 50, lean: -3 },
  { kind: "spine", color: "#6b7a52", width: 32, height: 54 },
  { kind: "spine", color: "#d9c05a", width: 58, height: 52, lean: 4 },
  { kind: "spine", color: "#6f5257", width: 28, height: 47 },
  { kind: "spine", color: "#b8452f", width: 44, height: 55, lean: -2 },
];

/**
 * Intro choreography for the shelf.
 *
 * Each slug opens in turn; the last one is left open as the shelf's resting
 * state. Hovering another title takes over, and releasing returns here.
 */
export const shelfIntro = ["open-call-sad-girls", "joven-chica"] as const;

export async function getAllBooks(): Promise<Book[]> {
  return books;
}

export async function getBookBySlug(slug: string): Promise<Book | undefined> {
  return books.find((book) => book.slug === slug);
}

/** Resolves display copy for a locale, falling back to the book's own fields. */
export function localizeBook(book: Book, locale: Locale) {
  const translation = book.translations?.[locale];

  return {
    title: translation?.title ?? book.title,
    subtitle: translation?.subtitle ?? book.subtitle,
    description: translation?.description ?? book.description,
    quote: translation?.quote ?? "",
  };
}

export function formatPrice(
  price: Book["price"],
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
}
