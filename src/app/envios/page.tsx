import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";
import { buildWhatsAppUrl } from "@/config/site";

export const metadata: Metadata = {
  title: "Envíos",
  description:
    "Cobertura, tiempos de entrega y empaque discreto de Nextgen Labs. Coordinamos cada envío directamente por WhatsApp.",
};

// PLACEHOLDER: cobertura, tiempos y costos de referencia. El cliente debe
// validar estos datos con su operador logístico real antes de publicar.
export default function EnviosPage() {
  return (
    <>
      <LegalPage
        eyebrow="Envíos"
        title="Cobertura, tiempos y empaque"
        updated="julio de 2026"
        sections={[
          {
            heading: "Cobertura",
            body: [
              "Realizamos envíos a las principales ciudades de Bolivia: Santa Cruz de la Sierra, La Paz, Cochabamba, y otras capitales de departamento bajo coordinación previa.",
              "Para zonas fuera de estas ciudades, escríbenos por WhatsApp y confirmamos disponibilidad y costo antes de cerrar tu pedido.",
            ],
          },
          {
            heading: "Tiempos de entrega",
            body: [
              "Despacho el mismo día para pedidos confirmados antes de las 2:00 pm (días hábiles).",
              "Entrega estimada: 24–48 horas dentro de Santa Cruz de la Sierra; 2–5 días hábiles al resto del país, según courier y destino.",
            ],
          },
          {
            heading: "Empaque discreto",
            body: [
              "Todos los pedidos se despachan en empaque neutro, sin marcas ni referencias visibles al contenido, para proteger tu privacidad.",
              "Los viales viajan protegidos y refrigerados cuando el compuesto lo requiere.",
            ],
          },
          {
            heading: "Coordinación por WhatsApp",
            body: [
              "No hay pago ni checkout en línea: el costo de envío, la dirección y el método de pago se coordinan directamente por WhatsApp al confirmar tu pedido.",
            ],
          },
        ]}
      />
      <div className="mx-auto -mt-6 max-w-3xl px-4 pb-14 sm:px-6">
        <WhatsAppCtaButton
          href={buildWhatsAppUrl("Hola Nextgen Labs, tengo una consulta sobre envíos.")}
          label="Consultar envío por WhatsApp"
          variant="solid"
          fullWidth={false}
          analyticsEvent="whatsapp_click_contact"
        />
      </div>
    </>
  );
}
