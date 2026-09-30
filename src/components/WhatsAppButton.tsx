import { buildWhatsAppUrl } from "@/config/site";
import { WhatsAppCtaButton } from "@/components/WhatsAppCtaButton";

const DEFAULT_MESSAGE = "Olá Nextgen Labs, tenho uma dúvida sobre os produtos.";

export function WhatsAppButton() {
  return (
    <WhatsAppCtaButton
      href={buildWhatsAppUrl(DEFAULT_MESSAGE)}
      label="Falar pelo WhatsApp"
      variant="floating"
      analyticsEvent="whatsapp_click_floating"
    />
  );
}
