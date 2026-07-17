import { buildWhatsAppUrl } from "@/config/site";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";

const DEFAULT_MESSAGE = "Hola Nextgen Labs, tengo una consulta sobre sus productos.";

export function WhatsAppButton() {
  return (
    <WhatsAppCtaButton
      href={buildWhatsAppUrl(DEFAULT_MESSAGE)}
      label="Contactar por WhatsApp"
      variant="floating"
    />
  );
}
