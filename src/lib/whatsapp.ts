import { buildWhatsAppUrl, siteConfig } from "@/config/site";
import { cartTotal, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders-data";

// ─── Comprador → negocio ───────────────────────────────────────────────
// wa.me apunta al número DEL NEGOCIO (WHATSAPP_NUMBER en config/site.ts).

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

// ─── Negocio → comprador ────────────────────────────────────────────────
// wa.me apunta acá al número DEL COMPRADOR (customer_phone, ya normalizado a
// solo dígitos por phoneSchema en orders.schema.ts), no al del negocio. El
// dueño ve el botón "Avisar al comprador" en el panel después de cambiar el
// estado de un pedido, revisa el texto y aprieta "enviar" a mano — nunca se
// manda nada automáticamente (00-contexto.md §3, no hay API de WhatsApp
// Business).

/**
 * Texto del aviso según el estado del pedido. `pending` y `cancelled` usan
 * el genérico: esa conversación (sobre todo cancelar) la escribe el dueño
 * con sus propias palabras, no se autogenera.
 */
export function buildCustomerStatusMessage(orderNumber: string, status: OrderStatus): string {
  switch (status) {
    case "paid":
      return `Confirmamos tu pago del pedido ${orderNumber}. Ya lo estamos preparando.`;
    case "shipped":
      return `Tu pedido ${orderNumber} ya fue despachado.`;
    default:
      return `Hola, te escribo por tu pedido ${orderNumber}.`;
  }
}

export function buildCustomerWhatsAppUrl(
  phoneDigits: string,
  orderNumber: string,
  status: OrderStatus
): string {
  const message = buildCustomerStatusMessage(orderNumber, status);
  return `https://wa.me/${encodeURIComponent(phoneDigits)}?text=${encodeURIComponent(message)}`;
}
