import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad de Nextgen Labs.",
};

// PLACEHOLDER: texto legal de referencia. El cliente debe validarlo con un
// asesor legal antes de publicar.
export default function PrivacidadPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Política de privacidad"
      updated="julio de 2026"
      sections={[
        {
          heading: "1. Datos que recopilamos",
          body: [
            "Este sitio no cuenta con registro de usuarios ni procesa pagos en línea: el pago se coordina por transferencia o QR y se confirma por WhatsApp. La información del carrito se guarda únicamente en tu propio navegador (localStorage) y no se envía a ningún servidor.",
            "Cuando completas un pedido en el checkout, guardamos tu nombre, WhatsApp, ciudad, dirección (si la compartes), nota opcional y el detalle de los productos pedidos, con el único fin de procesar, entregar y darte seguimiento a ese pedido. Solo el equipo de Nextgen Labs accede a esos datos, desde un panel protegido con contraseña.",
            "Guardamos estos datos mientras sean necesarios para gestionar tu pedido y cumplir obligaciones administrativas. No tenemos un borrado automático programado; si querés que eliminemos tu información, escribinos a la dirección de contacto de abajo.",
            "Cuando nos escribes por WhatsApp o correo fuera de un pedido, recibimos los datos que decidas compartir con el único fin de responderte.",
          ],
        },
        {
          heading: "2. Uso de la información",
          body: [
            "Utilizamos los datos que compartes exclusivamente para procesar y coordinar tus pedidos, así como para brindarte soporte. No vendemos ni compartimos tu información con terceros con fines comerciales.",
          ],
        },
        {
          heading: "3. Cookies y almacenamiento local",
          body: [
            "Usamos almacenamiento local del navegador para recordar tu verificación de edad y el contenido de tu carrito. Puedes borrar estos datos limpiando el almacenamiento de tu navegador en cualquier momento.",
          ],
        },
        {
          heading: "4. Contacto",
          body: [
            `Si tienes preguntas sobre esta política, escríbenos a ${siteConfig.contact.email}.`,
          ],
        },
      ]}
    />
  );
}
