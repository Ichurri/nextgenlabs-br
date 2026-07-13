import { siteConfig } from "@/config/site";

/**
 * Formatea un monto en bolivianos (Bs). Sin decimales por defecto,
 * usando separador de miles boliviano.
 */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${siteConfig.currency} ${formatted}`;
}
