import { buildWhatsAppUrl, siteConfig } from "@/config/site";
import { cartTotal, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

/**
 * Arma el texto del pedido para WhatsApp a partir de los ítems del carrito.
 * Ejemplo de salida:
 *
 *   Hola Nextgen Labs, quiero hacer un pedido:
 *
 *   • Tesamorelin 10 MG x2 — Bs 700
 *   • NAD+ 500 MG x1 — Bs 450
 *
 *   Total: Bs 1150
 *
 *   Mis datos:
 *   Nombre:
 *   Ciudad:
 */
export function buildOrderMessage(items: CartItem[]): string {
  const lines = items.map((i) => {
    const lineTotal = formatPrice(i.price * i.quantity);
    return `• ${i.name} ${i.dose} x${i.quantity} — ${lineTotal}`;
  });

  const total = formatPrice(cartTotal(items));

  return [
    `Hola ${siteConfig.name}, quiero hacer un pedido:`,
    "",
    ...lines,
    "",
    `Total: ${total}`,
    "",
    "Mis datos:",
    "Nombre:",
    "Ciudad:",
    "",
  ].join("\n");
}

export function buildOrderWhatsAppUrl(items: CartItem[]): string {
  return buildWhatsAppUrl(buildOrderMessage(items));
}
