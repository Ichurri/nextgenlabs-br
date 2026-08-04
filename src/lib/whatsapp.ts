import { buildWhatsAppUrl, siteConfig } from "@/config/site";
import { cartTotal, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

// ─── Comprador → negocio ───────────────────────────────────────────────
// wa.me apunta al número DEL NEGOCIO (WHATSAPP_NUMBER en config/site.ts).

export type OrderMessageDetails = {
  discountCode?: string | null;
  /** Del formulario de "Tus datos" en el carrito (Fase 9.1). Vacío u omitido → etiqueta en blanco, como antes. */
  name?: string | null;
  city?: string | null;
  /**
   * Solo Cochabamba ofrece elegir entre envío a domicilio y recojo (ver
   * CustomerFields.tsx); en el resto de las ciudades no existe el concepto
   * de dirección local. Por eso la línea "Dirección:" no es como
   * Nombre/Ciudad (blanco vs. completo): se omite del todo salvo que el
   * caller pase explícitamente un valor — `undefined`/`null` la saca por
   * completo, `""` la deja en blanco para completar a mano.
   */
  address?: string | null;
};

/**
 * Arma el texto del pedido para WhatsApp a partir de los ítems del carrito.
 * El formato es para humanos y el comprador puede editar el texto entero
 * antes de enviarlo — el admin lo pega en el panel y `parseOrderMessage()`
 * solo reconoce las líneas "• nombre dosis xN", la del código y las de
 * datos; los precios y el total son informativos, el parser los ignora.
 * Ejemplo de salida (con nombre, ciudad y envío a domicilio en Cochabamba):
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
 *   Ciudad: Cochabamba
 *   Dirección: Av. América #123
 */
export function buildOrderMessage(items: CartItem[], details: OrderMessageDetails = {}): string {
  const lines = items.map((i) => {
    const lineTotal = formatPrice(i.price * i.quantity);
    return `• ${i.name} ${i.dose} x${i.quantity} — ${lineTotal}`;
  });

  const total = formatPrice(cartTotal(items));
  const name = details.name?.trim();
  const city = details.city?.trim();
  const showAddress = details.address !== undefined && details.address !== null;
  const address = details.address?.trim();

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
    ...(showAddress ? [address ? `Dirección: ${address}` : "Dirección:"] : []),
    "",
  ].join("\n");
}

export function buildOrderWhatsAppUrl(items: CartItem[], details: OrderMessageDetails = {}): string {
  return buildWhatsAppUrl(buildOrderMessage(items, details));
}

// ─── Negocio → comprador ────────────────────────────────────────────────
// wa.me apunta acá al número DEL COMPRADOR (customer_phone, ya normalizado a
// solo dígitos por phoneSchema en orders.schema.ts), no al del negocio.
//
// WhatsApp no deja adjuntar archivos por deep link: este helper solo abre el
// chat con el texto listo. El PDF lo adjunta el dueño a mano, por eso la
// tarjeta del pedido pone el botón de descarga al lado de este enlace.

/** Único mensaje al comprador: el comprobante va adjunto a mano. */
export function buildCustomerReceiptMessage(): string {
  return "Gracias por confiar en nosotros, acá está tu comprobante de recibo.";
}

export function buildCustomerWhatsAppUrl(phoneDigits: string): string {
  const message = buildCustomerReceiptMessage();
  return `https://wa.me/${encodeURIComponent(phoneDigits)}?text=${encodeURIComponent(message)}`;
}
