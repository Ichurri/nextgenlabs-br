/**
 * Configuración global del sitio.
 * PLACEHOLDER: el cliente debe reemplazar estos valores antes de publicar.
 */

// Número de WhatsApp en formato internacional
// (código de país + número, solo dígitos, sin "+", espacios ni guiones).
// Ejemplo Bolivia: 59171234567
// export const WHATSAPP_NUMBER = "59169437674";
export const WHATSAPP_NUMBER = "59178184211";

export const siteConfig = {
  name: "Nextgen Labs",
  shortName: "Nextgen Labs",
  description:
    "Nextgen Labs — péptidos exclusivamente para uso de investigación en Bolivia. Distribuidor oficial de Onyx Research. Calidad verificada, pureza garantizada y transparencia total.",
  url: "https://nextgenlabsbo.vercel.app",
  locale: "es_BO",
  currency: "Bs",

  contact: {
    email: "quiquequiroga@icloud.com",
    city: "Cochabamba, Bolivia",
    whatsappDisplay: "+591 69437674", // número visible
  },

  // Redes sociales: vacío = oculto. Agregar la URL real cuando exista.
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
