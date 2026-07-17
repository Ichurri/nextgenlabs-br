import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { WHATSAPP_NUMBER, siteConfig } from "@/config/site";
import type { CartItem } from "@/lib/cart";

const items: CartItem[] = [
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    dose: "10 MG",
    price: 1700,
    image: "/products/tesamorelin.webp",
    quantity: 1,
  },
  {
    slug: "nad-plus",
    name: "NAD+",
    dose: "500 MG",
    price: 1900,
    image: "/products/nadplus.webp",
    quantity: 1,
  },
];

describe("buildOrderMessage", () => {
  it("arma el mensaje con el formato exacto esperado", () => {
    const expected = [
      `Hola ${siteConfig.name}, quiero hacer un pedido:`,
      "",
      "• Tesamorelin 10 MG x1 — Bs 1.700",
      "• NAD+ 500 MG x1 — Bs 1.900",
      "",
      "Total: Bs 3.600",
      "",
      "Mis datos:",
      "Nombre:",
      "Ciudad:",
      "",
    ].join("\n");

    expect(buildOrderMessage(items)).toBe(expected);
  });

  it("multiplica precio x cantidad en cada línea", () => {
    const message = buildOrderMessage([
      { slug: "a", name: "A", dose: "5 MG", price: 100, image: "", quantity: 3 },
    ]);

    expect(message).toContain("• A 5 MG x3 — Bs 300");
    expect(message).toContain("Total: Bs 300");
  });

  it("produce un pedido vacío coherente cuando no hay ítems", () => {
    const message = buildOrderMessage([]);

    expect(message).toContain(`Hola ${siteConfig.name}, quiero hacer un pedido:`);
    expect(message).toContain("Total: Bs 0");
  });
});

describe("buildOrderWhatsAppUrl", () => {
  it("apunta a wa.me con el número configurado", () => {
    const url = buildOrderWhatsAppUrl(items);
    expect(url.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
  });

  it("codifica el mensaje completo del pedido en el parámetro text", () => {
    const url = buildOrderWhatsAppUrl(items);
    const encodedMessage = url.split("?text=")[1];

    expect(decodeURIComponent(encodedMessage)).toBe(buildOrderMessage(items));
  });
});
