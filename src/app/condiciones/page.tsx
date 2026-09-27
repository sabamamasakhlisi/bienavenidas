import type { Metadata } from "next";

import { getLocale } from "next-intl/server";

import { LegalMail, LegalPage, LegalSection } from "@/features/legal/LegalPage";
import { CONTACT_EMAIL, OWNER_NIF, openGraphFor } from "@/lib/site";

const TITLE = "Condiciones y términos";
const DESCRIPTION =
  "Cómo comprar en BIEN*VENIDAS: precios, pago, envíos, cambios y devoluciones.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/condiciones" },
    openGraph: openGraphFor({
      title: TITLE,
      description: DESCRIPTION,
      path: "/condiciones",
      locale: await getLocale(),
    }),
  };
}

/**
 * Terms of sale for consumers (TRLGDCU). Spanish only, like the aviso legal.
 * Shipping zone matches `SHIPPING_COUNTRIES` in `features/checkout/stripe.ts`.
 */
export default function CondicionesPage() {
  return (
    <LegalPage title={TITLE} updated="Última actualización: septiembre de 2026">
      <LegalSection title="1. Quién vende">
        <p>
          BIEN*VENIDAS. NIF: {OWNER_NIF}. Para cualquier consulta sobre un
          pedido, escríbenos a <LegalMail email={CONTACT_EMAIL} />.
        </p>
      </LegalSection>

      <LegalSection title="2. Productos y precios">
        <p>
          Vendemos los libros y productos que aparecen en esta web mientras
          haya existencias. Los precios están en euros e incluyen los impuestos
          aplicables. Los títulos marcados como «próximamente» todavía no están
          a la venta.
        </p>
      </LegalSection>

      <LegalSection title="3. Pedido y pago">
        <p>
          Añade lo que quieras a la cesta y paga en la página segura de
          Stripe. El pedido queda confirmado cuando se completa el pago, y
          Stripe te envía el recibo por correo electrónico.
        </p>
      </LegalSection>

      <LegalSection title="4. Envíos">
        <p>
          Enviamos a España y al resto de la Unión Europea. Los gastos de
          envío, si los hay, se muestran antes de pagar. Preparamos los
          pedidos en pocos días laborables y te escribimos cuando salen.
        </p>
      </LegalSection>

      <LegalSection title="5. Cambios y devoluciones">
        <p>
          Elige tu pedido con cuidado. No hacemos reembolsos si simplemente
          cambias de opinión o eliges un producto equivocado.
        </p>
        <p>
          Puedes cambiar tu producto o recibir un reembolso en los 14 días
          siguientes a la confirmación de tu pedido. Los libros que nos
          devuelvas deben estar como nuevos. Los gastos de envío solo se
          reembolsan si los productos que devuelves no son los que pediste y,
          por tanto, el error es nuestro.
        </p>
        <p>
          Devuélvenos los productos en un embalaje seguro y resistente, junto
          con tu número de pedido y la factura o el recibo. Escríbenos a{" "}
          <LegalMail email={CONTACT_EMAIL} /> y te indicaremos la dirección
          de devolución.
        </p>
      </LegalSection>

      <LegalSection title="6. Productos defectuosos">
        <p>
          Si algo llega dañado o con un defecto, escríbenos con una foto y te
          lo cambiamos o te devolvemos el dinero, sin coste para ti. Los
          productos tienen la garantía legal de tres años.
        </p>
      </LegalSection>

      <LegalSection title="7. Ley aplicable">
        <p>
          Estas condiciones se rigen por la legislación española. Si eres
          consumidora o consumidor, puedes acudir a los tribunales de tu
          domicilio.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
