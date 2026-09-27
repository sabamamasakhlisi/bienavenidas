import type { Metadata } from "next";

import { getLocale } from "next-intl/server";

import { LegalMail, LegalPage, LegalSection } from "@/features/legal/LegalPage";
import { CONTACT_EMAIL, OWNER_NIF, openGraphFor } from "@/lib/site";

const TITLE = "Aviso legal y política de privacidad";
const DESCRIPTION =
  "Quién está detrás de BIEN*VENIDAS, qué datos personales tratamos, para qué y cómo ejercer tus derechos.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/aviso-legal" },
    openGraph: openGraphFor({
      title: TITLE,
      description: DESCRIPTION,
      path: "/aviso-legal",
      locale: await getLocale(),
    }),
  };
}

/**
 * Aviso legal (LSSI-CE, art. 10) and privacy policy (RGPD, arts. 13–14).
 *
 * Kept in Spanish only: the shop sells under Spanish law, and this is the
 * text that binds. Written to match what the site actually does — change it
 * whenever a new service starts handling personal data.
 */
export default function AvisoLegalPage() {
  return (
    <LegalPage title={TITLE} updated="Última actualización: septiembre de 2026">
      <LegalSection title="1. Titular">
        <p>
          Este sitio web y su tienda en línea pertenecen a BIEN*VENIDAS,
          proyecto editorial gestionado por personas físicas.
        </p>
        <p>
          NIF: {OWNER_NIF}
          <br />
          Correo electrónico: <LegalMail email={CONTACT_EMAIL} />
        </p>
      </LegalSection>

      <LegalSection title="2. Uso del sitio">
        <p>
          Los textos, imágenes, cubiertas y diseño de este sitio pertenecen a
          BIEN*VENIDAS o a sus autoras y autores. Puedes consultarlos y
          compartir enlaces, pero no reproducirlos ni usarlos con fines
          comerciales sin nuestro permiso por escrito.
        </p>
        <p>
          No nos hacemos responsables del contenido de los sitios externos a
          los que enlazamos.
        </p>
      </LegalSection>

      <LegalSection title="3. Qué datos tratamos y para qué">
        <p>
          <strong>Pedidos.</strong> Cuando compras, recogemos tu nombre,
          dirección de envío, correo electrónico y teléfono para preparar y
          enviar el pedido y atender cualquier incidencia. La base legal es el
          contrato de compraventa y el cumplimiento de nuestras obligaciones
          fiscales.
        </p>
        <p>
          <strong>Pago.</strong> Los pagos se hacen en la página segura de
          Stripe. Nunca vemos ni guardamos los datos de tu tarjeta.
        </p>
        <p>
          <strong>Newsletter.</strong> Si te suscribes, guardamos tu correo
          electrónico y tu idioma para enviarte la newsletter. La base legal es
          tu consentimiento, que puedes retirar en cualquier momento
          respondiendo «baja» a cualquiera de nuestros correos.
        </p>
        <p>
          <strong>Correos que nos envías.</strong> Usamos tus datos solo para
          responderte.
        </p>
      </LegalSection>

      <LegalSection title="4. Con quién los compartimos">
        <p>
          No vendemos ni cedemos tus datos. Solo los comparten con nosotras los
          servicios que necesitamos para funcionar: Stripe (pagos), Supabase
          (base de datos de pedidos y suscripciones, alojada en la Unión
          Europea), Vercel (alojamiento del sitio) y la empresa de transporte
          que entrega tu pedido.
        </p>
      </LegalSection>

      <LegalSection title="5. Cuánto tiempo los guardamos">
        <p>
          Los datos de los pedidos, durante el tiempo que exige la ley fiscal y
          mercantil (hasta seis años). Los de la newsletter, hasta que te des
          de baja.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Puedes pedirnos acceso a tus datos, corregirlos, borrarlos, oponerte
          a su uso, limitarlo o recibirlos en un formato portable escribiendo a{" "}
          <LegalMail email={CONTACT_EMAIL} />. Si crees que no los tratamos
          correctamente, puedes reclamar ante la Agencia Española de
          Protección de Datos (aepd.es).
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          Solo usamos una cookie técnica que recuerda tu idioma, y tu navegador
          guarda la cesta en su propio almacenamiento local. No usamos cookies
          de análisis ni de publicidad.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
