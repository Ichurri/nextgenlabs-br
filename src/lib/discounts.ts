import { round2 } from "@/lib/money";
import { formatPrice } from "@/lib/format";
import type { Database } from "@/types/database";

const DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// Mismo motivo que parseOrderStatus() en orders-data.ts: el CHECK constraint
// de Postgres garantiza estos dos valores, pero `gen types` no lo sabe.
export function parseDiscountType(type: string): DiscountType {
  if ((DISCOUNT_TYPES as readonly string[]).includes(type)) {
    return type as DiscountType;
  }
  throw new Error(`Tipo de desconto desconhecido: "${type}".`);
}

/** Espejo camelCase de una fila de discount_codes — desacoplado de Supabase para que esta lógica sea pura y fácil de testear. */
export type DiscountCode = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  ownerLabel: string;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  minOrderTotal: number | null;
  maxDiscount: number | null;
};

export type DiscountError =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "below_minimum";

export type DiscountResult =
  | { valid: true; amount: number; code: string; label: string }
  | { valid: false; reason: DiscountError; message: string };

/** Normaliza lo que escribió el usuario: "  mafe 10 " → "MAFE10". */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "");
}

/** Fim do dia civil em São Paulo, respeitando o fuso IANA da data informada. */
export function endOfDayBrazil(dateOnly: string): string {
  const localAsUtc = Date.parse(`${dateOnly}T23:59:59Z`);
  const approximate = new Date(localAsUtc + 3 * 60 * 60 * 1000);
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    timeZoneName: "shortOffset",
  }).formatToParts(approximate).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  const minutes = match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
  return new Date(localAsUtc - minutes * 60_000).toISOString();
}

type DiscountCodeRow = Database["public"]["Tables"]["discount_codes"]["Row"];

/**
 * De snake_case (fila de Supabase) a DiscountCode. Solo se importa el tipo
 * generado (se borra en runtime), así que esto no le saca pureza al resto
 * del archivo — pero sí centraliza el mapeo para no repetirlo en cada Route
 * Handler que consulta discount_codes.
 */
export function mapDiscountCodeRow(row: DiscountCodeRow): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    type: parseDiscountType(row.type),
    value: Number(row.value),
    ownerLabel: row.owner_label,
    isActive: row.is_active,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    minOrderTotal: row.min_order_total !== null ? Number(row.min_order_total) : null,
    maxDiscount: row.max_discount !== null ? Number(row.max_discount) : null,
  };
}

/**
 * "MAFE10 · 10% de desconto" para mostrar en recibos/comprobantes — el
 * código real usado, no solo la tasa. Cualquiera de los dos puede faltar
 * (código viejo sin discountCode persistido): se muestra lo que haya.
 */
export function formatDiscountDetail(
  code: string | null,
  label: string | null
): string {
  return [code, label].filter((value): value is string => Boolean(value)).join(" · ");
}

function formatBrazilDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/**
 * Pura, sin I/O: `now` se inyecta para poder testear vencimientos sin
 * mockear el reloj. `code` es la fila ya leída de discount_codes (o null si
 * no se encontró); `subtotal` es el de la orden ANTES de aplicar el
 * descuento, ya calculado por calculateOrderTotals(items).
 */
export function evaluateDiscount(
  code: DiscountCode | null,
  subtotal: number,
  now: Date
): DiscountResult {
  if (code === null) {
    return {
      valid: false,
      reason: "not_found",
      message: "Cupom não encontrado. Confira o código informado.",
    };
  }
  if (!code.isActive) {
    return { valid: false, reason: "inactive", message: "Este cupom não está ativo." };
  }
  if (code.startsAt !== null && now < new Date(code.startsAt)) {
    return {
      valid: false,
      reason: "not_started",
      message: "Este cupom ainda não está disponível.",
    };
  }
  if (code.expiresAt !== null && now > new Date(code.expiresAt)) {
    return {
      valid: false,
      reason: "expired",
      message: `Este cupom venceu em ${formatBrazilDate(code.expiresAt)}.`,
    };
  }
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return {
      valid: false,
      reason: "exhausted",
      message: "Este cupom atingiu o limite de usos.",
    };
  }
  if (code.minOrderTotal !== null && subtotal < code.minOrderTotal) {
    return {
      valid: false,
      reason: "below_minimum",
      message: `Este cupom vale para compras a partir de ${formatPrice(code.minOrderTotal)}.`,
    };
  }

  let amount: number;
  let label: string;
  if (code.type === "percent") {
    amount = round2(subtotal * (code.value / 100));
    if (code.maxDiscount !== null) amount = Math.min(amount, code.maxDiscount);
    label = `${code.value}% de desconto`;
  } else {
    amount = Math.min(code.value, subtotal);
    label = `${formatPrice(code.value)} de desconto`;
  }

  // El descuento nunca supera el subtotal — sea cual sea el tipo o el tope.
  // Nunca toca el envío: esta función no lo sabe siquiera, solo devuelve un
  // monto a restar del subtotal.
  amount = round2(Math.min(amount, subtotal));

  return { valid: true, amount, code: code.code, label };
}
