import { products, type Product } from "@/data/products";
import { normalizeCode } from "@/lib/discounts";

export type ParsedOrderMessage = {
  items: { slug: string; quantity: number }[];
  unmatched: string[]; // líneas "•" que no matchearon ningún producto
  code: string | null;
  name: string | null;
  city: string | null;
  address: string | null;
};

const BULLET_RE = /^[•\-*]\s*/;
const QUANTITY_RE = /x\s*(\d+)/i;

/**
 * minúsculas, sin acentos, sin espacios dobles — nada más. Se exporta porque
 * el buscador de "agregar producto" de ReceiptItemsEditor.tsx la reusa para
 * que escribir con o sin acentos filtre igual.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function buildProductIndex() {
  const byFull = new Map<string, Product>();
  const byName = new Map<string, Product>();
  for (const product of products) {
    byFull.set(normalizeText(`${product.name} ${product.dose}`), product);
    // Fallback para cuando el comprador omite la dosis: solo sirve porque
    // `name` es único en el catálogo, nunca se repite entre productos.
    byName.set(normalizeText(product.name), product);
  }
  return { byFull, byName };
}

function matchProduct(
  text: string,
  byFull: Map<string, Product>,
  byName: Map<string, Product>
): Product | undefined {
  const normalized = normalizeText(text);
  return byFull.get(normalized) ?? byName.get(normalized);
}

function extractField(lines: string[], label: string): string | null {
  const re = new RegExp(`^${label}\\s*:\\s*(.*)$`, "i");
  for (const line of lines) {
    const match = line.trim().match(re);
    if (match) {
      const value = match[1].trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

/**
 * Parser puro del mensaje de WhatsApp pegado por el admin. Nunca adivina un
 * producto: lo que no matchea contra `name + dose` de products.ts va a
 * `unmatched` para que el admin lo resuelva a mano. Los montos del mensaje
 * (precios, total) se ignoran del todo — el servidor los recalcula siempre
 * desde products.ts (ver calculateOrderTotals en C3).
 */
export function parseOrderMessage(text: string): ParsedOrderMessage {
  const { byFull, byName } = buildProductIndex();
  const lines = text.split("\n");

  const itemsBySlug = new Map<string, number>();
  const unmatched: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!BULLET_RE.test(line)) continue;

    const withoutBullet = line.replace(BULLET_RE, "");
    const quantityMatch = withoutBullet.match(QUANTITY_RE);
    const productText = (
      quantityMatch ? withoutBullet.slice(0, quantityMatch.index) : withoutBullet
    ).trim();
    const quantity = quantityMatch ? Math.max(1, Number.parseInt(quantityMatch[1], 10)) : 1;

    const product = matchProduct(productText, byFull, byName);
    if (!product) {
      unmatched.push(line);
      continue;
    }

    itemsBySlug.set(product.slug, (itemsBySlug.get(product.slug) ?? 0) + quantity);
  }

  const rawCode = extractField(lines, "C[oó]digo de descuento");
  const code = rawCode ? normalizeCode(rawCode) : null;

  return {
    items: Array.from(itemsBySlug, ([slug, quantity]) => ({ slug, quantity })),
    unmatched,
    code,
    name: extractField(lines, "Nombre"),
    city: extractField(lines, "Ciudad"),
    address: extractField(lines, "Direcci[oó]n"),
  };
}
