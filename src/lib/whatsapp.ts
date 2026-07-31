import { buildWhatsAppUrl, siteConfig } from "@/config/site";
import { cartTotal, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders-data";

// ─── Comprador → negocio ───────────────────────────────────────────────
// wa.me apunta al número DEL NEGOCIO (WHATSAPP_NUMBER en config/site.ts).

export type OrderMessageDetails = {
  discountCode?: string | null;
  /** Del formulario de "Tus datos" en el carrito (Fase 9.1). Vacío u omitido → etiqueta en blanco, como antes. */
  name?: string | null;
  city?: string | null;
};

/**
 * Arma el texto del pedido para WhatsApp a partir de los ítems del carrito.
 * El formato es para humanos y el comprador puede editar el texto entero
 * antes de enviarlo — el admin lo pega en el panel y `parseOrderMessage()`
 * solo reconoce las líneas "• nombre dosis xN", la del código y las de
 * datos; los precios y el total son informativos, el parser los ignora.
 * Ejemplo de salida (con nombre y ciudad ya completados en el carrito):
 *
 *   Hola Nextgen Labs, quiero hacer un pedido:
 *
 *   • Tesamorelin 10 MG x2 — Bs 700
 *   • NAD+ 500 MG x1 — Bs 450
 *
 *   Total: Bs 1150
 *
 *   Código de descuento: MAFE10
 *
 *   Mis datos:
 *   Nombre: Juan Pérez
 *   Ciudad: La Paz
 *   Dirección:
 */
export function buildOrderMessage(items: CartItem[], details: OrderMessageDetails = {}): string {
  const lines = items.map((i) => {
    const lineTotal = formatPrice(i.price * i.quantity);
    return `• ${i.name} ${i.dose} x${i.quantity} — ${lineTotal}`;
  });

  const total = formatPrice(cartTotal(items));
  const name = details.name?.trim();
  const city = details.city?.trim();

  return [
    `Hola ${siteConfig.name}, quiero hacer un pedido:`,
    "",
    ...lines,
    "",
    `Total: ${total}`,
    "",
    ...(details.discountCode ? [`Código de descuento: ${details.discountCode}`, ""] : []),
    "Mis datos:",
    name ? `Nombre: ${name}` : "Nombre:",
    city ? `Ciudad: ${city}` : "Ciudad:",
    "Dirección:",
    "",
  ].join("\n");
}

export function buildOrderWhatsAppUrl(items: CartItem[], details: OrderMessageDetails = {}): string {
  return buildWhatsAppUrl(buildOrderMessage(items, details));
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
