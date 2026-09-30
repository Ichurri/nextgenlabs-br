import { describe, expect, it } from "vitest";
import { buildCustomerReceiptMessage, buildCustomerWhatsAppUrl, buildOrderMessage, buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { WHATSAPP_NUMBER } from "@/config/site";
import type { CartItem } from "@/lib/cart";

const items: CartItem[] = [
  { slug: "ghk-cu", name: "GHK-Cu", dose: "100 MG", price: 800, image: "", quantity: 1 },
];
const clean = (value: string) => value.replace(/\u00a0/g, " ");

describe("mensagem do pedido no Brasil", () => {
  it("informa reais, frete de R$ 35 e dados do cliente", () => {
    const message = clean(buildOrderMessage(items, { name: "Ana", city: "São Paulo", address: "Rua Exemplo, 10" }));
    expect(message).toContain("Olá Nextgen Labs, quero fazer um pedido:");
    expect(message).toContain("• GHK-Cu 100 MG x1 — R$ 800,00");
    expect(message).toContain("Frete: R$ 35,00");
    expect(message).toContain("Total estimado: R$ 835,00");
    expect(message).toContain("Nome: Ana");
    expect(message).toContain("Cidade: São Paulo");
    expect(message).toContain("Endereço: Rua Exemplo, 10");
  });

  it("inclui o desconto estimado quando há cupom validado", () => {
    const message = clean(buildOrderMessage(items, { discountCode: "MAFE10", discountAmount: 80 }));
    expect(message).toContain("Desconto estimado: −R$ 80,00");
    expect(message).toContain("Total estimado: R$ 755,00");
  });

  it("omite endereço não informado e deixa os outros campos editáveis", () => {
    const message = buildOrderMessage(items);
    expect(message).toContain("Nome:\nCidade:\n");
    expect(message).not.toContain("Endereço:");
  });

  it("inclui o cupom e aponta para o WhatsApp configurado", () => {
    const url = buildOrderWhatsAppUrl(items, { discountCode: "MAFE10" });
    expect(url).toMatch(new RegExp(`^https://wa.me/${WHATSAPP_NUMBER}\\?text=`));
    expect(decodeURIComponent(url.split("?text=")[1])).toContain("Cupom de desconto: MAFE10");
  });

  it("não cobra frete num pedido vazio", () => {
    expect(clean(buildOrderMessage([]))).toContain("Total estimado: R$ 0,00");
  });
});

describe("mensagem do atendente", () => {
  it("usa português no comprovante", () => {
    expect(buildCustomerReceiptMessage()).toContain("comprovante do seu pedido");
    expect(decodeURIComponent(buildCustomerWhatsAppUrl("5511999999999").split("?text=")[1]))
      .toBe(buildCustomerReceiptMessage());
  });
});
