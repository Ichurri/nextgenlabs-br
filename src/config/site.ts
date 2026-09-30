/**
 * Configuración global del sitio.
 * Dados específicos de domínio e contato devem ser configurados antes da publicação.
 */

// WhatsApp em formato internacional, somente dígitos (sem + ou espaços).
// Exemplo: 5511999999999
export const WHATSAPP_NUMBER = "59169437674";

export const siteConfig = {
  name: "Nextgen Labs",
  shortName: "Nextgen Labs",
  description:
    "Nextgen Labs Brasil — compostos destinados exclusivamente à pesquisa laboratorial. Conheça o catálogo Onyx Research e consulte os certificados de análise.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  locale: "pt_BR",
  currency: "R$",

  contact: {
    email: "quiquequiroga@icloud.com",
    city: "São Paulo, Brasil",
    whatsappDisplay: "+591 69437674",
  },

  // Redes sociais: campos vazios ficam ocultos.
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },

  partner: {
    name: "Onyx Research",
    url: "https://onyxresearch.shop",
  },
} as const;

/**
 * Construye la URL de WhatsApp con un mensaje pre-cargado y codificado.
 */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
