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

/** Días completos transcurridos desde una fecha ISO hasta `now`. */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/** "hoy", "ayer" o "hace N días" a partir de una fecha ISO. */
export function formatRelativeDays(iso: string, now: Date = new Date()): string {
  const diffDays = daysSince(iso, now);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

/** Fecha en horario boliviano (UTC−4 fijo). Ver la trampa de timestamptz en fase-6 §11. */
export function formatBoliviaDate(iso: string): string {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(new Date(iso));
}
