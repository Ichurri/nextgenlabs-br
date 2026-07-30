import { describe, expect, it } from "vitest";
import {
  buildCustomerStatusMessage,
  buildCustomerWhatsAppUrl,
  buildOrderMessage,
  buildOrderWhatsAppUrl,
} from "@/lib/whatsapp";
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

describe("buildCustomerStatusMessage", () => {
  it("incluye el número de pedido para el estado paid", () => {
    const message = buildCustomerStatusMessage("NGL-260727-K4XQ", "paid");
    expect(message).toContain("NGL-260727-K4XQ");
    expect(message).toMatch(/pago/i);
  });

  it("incluye el número de pedido para el estado shipped", () => {
    const message = buildCustomerStatusMessage("NGL-260727-K4XQ", "shipped");
    expect(message).toContain("NGL-260727-K4XQ");
    expect(message).toMatch(/despachado/i);
  });

  it("el mensaje cambia según el estado", () => {
    const paid = buildCustomerStatusMessage("NGL-1", "paid");
    const shipped = buildCustomerStatusMessage("NGL-1", "shipped");
    const pending = buildCustomerStatusMessage("NGL-1", "pending");
    const cancelled = buildCustomerStatusMessage("NGL-1", "cancelled");

    expect(paid).not.toBe(shipped);
    // cancelled y pending no autogeneran un mensaje específico: usan el
    // mismo genérico, esa conversación la escribe el dueño con sus palabras.
    expect(pending).toBe(cancelled);
  });
});

describe("buildCustomerWhatsAppUrl", () => {
  it("apunta a wa.me con el teléfono del comprador (no el del negocio)", () => {
    const url = buildCustomerWhatsAppUrl("69437674", "NGL-1", "paid");
    expect(url.startsWith("https://wa.me/69437674?text=")).toBe(true);
  });

  it("el teléfono queda correctamente escapado en la URL", () => {
    const url = buildCustomerWhatsAppUrl("+591 69437674", "NGL-1", "paid");
    expect(url).toContain(encodeURIComponent("+591 69437674"));
    expect(url).not.toContain(" ");
  });

  it("codifica el mensaje correspondiente al estado en el parámetro text", () => {
    const url = buildCustomerWhatsAppUrl("69437674", "NGL-1", "shipped");
    const encodedMessage = url.split("?text=")[1];
    expect(decodeURIComponent(encodedMessage)).toBe(
      buildCustomerStatusMessage("NGL-1", "shipped")
    );
  });
});
