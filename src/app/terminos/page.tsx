import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de Nextgen Labs.",
};

// PLACEHOLDER: texto legal de referencia. El cliente debe validarlo con un
// asesor legal antes de publicar.
export default function TerminosPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Términos y condiciones"
      updated="julio de 2026"
      sections={[
        {
          heading: "1. Uso exclusivo de investigación",
          body: [
            "Todos los productos ofrecidos por Nextgen Labs están destinados exclusivamente para uso de investigación de laboratorio. No están aprobados ni destinados para consumo humano ni animal, ni para uso diagnóstico, terapéutico o cosmético.",
            "Al realizar un pedido, el comprador declara ser mayor de 18 años y contar con la competencia y las instalaciones adecuadas para el manejo seguro de estos compuestos.",
          ],
        },
        {
          heading: "2. Pedidos y pagos",
          body: [
            "Los pedidos se coordinan y confirman a través de WhatsApp. El sitio no procesa pagos en línea. El pago y la entrega se acuerdan directamente entre el comprador y Nextgen Labs.",
            "Los precios están expresados en bolivianos (Bs) y pueden actualizarse sin previo aviso.",
          ],
        },
        {
          heading: "3. Responsabilidad",
          body: [
            "El comprador asume toda la responsabilidad por el manejo, almacenamiento y uso de los productos conforme a la normativa aplicable. Nextgen Labs no se responsabiliza por usos indebidos, distintos a los fines de investigación declarados.",
          ],
        },
        {
          heading: "4. Distribución oficial",
          body: [
            `Nextgen Labs es distribuidor oficial autorizado de ${siteConfig.partner.name} en Bolivia.`,
          ],
        },
        {
          heading: "5. Contacto",
          body: [
            `Para cualquier consulta relacionada con estos términos, escríbenos a ${siteConfig.contact.email}.`,
          ],
        },
      ]}
    />
  );
}
