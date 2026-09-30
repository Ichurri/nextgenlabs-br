import { randomBytes, randomInt } from "node:crypto";
import { isInStock, type Catalog } from "@/lib/products.types";
import { round2 } from "@/lib/money";
import { SHIPPING } from "@/config/shipping";

export type OrderLine = {
  slug: string;
  name: string;
  dose: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderTotals = {
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

/** Error de negocio (carrito/producto inválido): el caller la traduce a un 400. */
export class OrderValidationError extends Error {}

/**
 * Calcula subtotal, descuento, envío y total a partir de `[{ slug, quantity }]`.
 * Pura y sin acceso a red ni a Supabase: recibe el catálogo ya resuelto por
 * el caller (getCatalog(), Fase 10) en vez de leerlo él mismo. El servidor
 * nunca confía en montos que manda el cliente, así que esta función es la
 * única fuente de verdad para el dinero de un pedido (Fase 5 y 6).
 *
 * A cidade é texto livre; o frete provisório é igual para todos os destinos.
 */
export function calculateOrderTotals(
  items: { slug: string; quantity: number }[],
  catalog: Catalog,
  discount = 0, // la Fase 6 pasa un valor acá; la Fase 5 siempre 0
  _city?: string | null
): OrderTotals {
  if (items.length === 0) {
    throw new OrderValidationError("O carrinho está vazio.");
  }

  const lines: OrderLine[] = items.map((item) => {
    const product = catalog.products.find((p) => p.slug === item.slug);
    if (!product) {
      throw new OrderValidationError(`Produto não encontrado: "${item.slug}".`);
    }
    if (product.price === 0) {
      throw new OrderValidationError(
        `${product.name} está sob consulta e não pode ser pedido pelo carrinho. Fale conosco pelo WhatsApp.`
      );
    }
    if (!isInStock(product)) {
      throw new OrderValidationError(
        `${product.name} está esgotado no momento.`
      );
    }
    return {
      slug: product.slug,
      name: product.name,
      dose: product.dose,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal: round2(product.price * item.quantity),
    };
  });

  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  // El descuento nunca supera el subtotal y nunca se aplica al envío.
  const appliedDiscount = round2(Math.min(Math.max(discount, 0), subtotal));
  const subtotalAfterDiscount = subtotal - appliedDiscount;

  // El umbral de envío gratis se evalúa después del descuento (más
  // conservador para el negocio).
  const freeShipping =
    SHIPPING.freeOver !== null && subtotalAfterDiscount >= SHIPPING.freeOver;
  const shipping = freeShipping ? 0 : SHIPPING.nationalCost;

  const total = round2(subtotalAfterDiscount + shipping);

  return { lines, subtotal, discount: appliedDiscount, shipping, total };
}

const ORDER_NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0, O, 1, I

/** `NGL-YYMMDD-XXXX`: se dicta por teléfono, tiene que ser legible. */
export function generateOrderNumber(date: Date = new Date()): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const suffix = Array.from(
    { length: 4 },
    () => ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)]
  ).join("");
  return `NGL-${yy}${mm}${dd}-${suffix}`;
}

/** Token opaco que protege el comprobante: no es adivinable como el order_number. */
export function generateToken(): string {
  return randomBytes(16).toString("hex");
}
