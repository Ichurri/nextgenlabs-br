/** Formata preços do catálogo brasileiro em reais. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

/** Dias completos transcorridos desde uma data ISO até `now`. */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/** "hoje", "ontem" ou "há N dias" desde uma data ISO. */
export function formatRelativeDays(iso: string, now: Date = new Date()): string {
  const diffDays = daysSince(iso, now);
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "ontem";
  return `há ${diffDays} dias`;
}

/** Data civil de São Paulo, inclusive perto da meia-noite UTC. */
export function formatBrazilDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

// Compatibilidade temporária com importações existentes durante a tradução.
export const formatBoliviaDate = formatBrazilDate;
