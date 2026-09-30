import { buildWhatsAppUrl, siteConfig } from "@/config/site";
import { SHIPPING } from "@/config/shipping";
import { cartTotal, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export type OrderMessageDetails = {
  discountCode?: string | null;
  discountAmount?: number | null;
  name?: string | null;
  city?: string | null;
  address?: string | null;
};

/** Mensagem editável pelo cliente. O painel recalcula preços a partir do catálogo. */
export function buildOrderMessage(items: CartItem[], details: OrderMessageDetails = {}): string {
  const lines = items.map((item) =>
    `• ${item.name} ${item.dose} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`
  );
  const subtotal = cartTotal(items);
  const shipping = items.length > 0 ? SHIPPING.nationalCost : 0;
  const discount = Math.min(subtotal, Math.max(0, details.discountAmount ?? 0));
  const name = details.name?.trim();
  const city = details.city?.trim();
  const address = details.address?.trim();
  const showAddress = details.address !== undefined && details.address !== null;

  return [
    `Olá ${siteConfig.name}, quero fazer um pedido:`,
    "",
    ...lines,
    "",
    `Subtotal dos produtos: ${formatPrice(subtotal)}`,
    ...(discount > 0 ? [`Desconto estimado: −${formatPrice(discount)}`] : []),
    `Frete: ${formatPrice(shipping)}`,
    `Total estimado: ${formatPrice(subtotal - discount + shipping)}`,
    "",
    ...(details.discountCode ? [`Cupom de desconto: ${details.discountCode}`, ""] : []),
    "Meus dados:",
    name ? `Nome: ${name}` : "Nome:",
    city ? `Cidade: ${city}` : "Cidade:",
    ...(showAddress ? [address ? `Endereço: ${address}` : "Endereço:"] : []),
    "",
  ].join("\n");
}

export function buildOrderWhatsAppUrl(items: CartItem[], details: OrderMessageDetails = {}): string {
  return buildWhatsAppUrl(buildOrderMessage(items, details));
}

/** O comprovante PDF é anexado manualmente pelo atendente no WhatsApp. */
export function buildCustomerReceiptMessage(): string {
  return "Obrigado por confiar em nós. Segue o comprovante do seu pedido.";
}

export function buildCustomerWhatsAppUrl(phoneDigits: string): string {
  return `https://wa.me/${encodeURIComponent(phoneDigits)}?text=${encodeURIComponent(buildCustomerReceiptMessage())}`;
}
