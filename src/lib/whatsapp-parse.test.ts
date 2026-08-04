import { describe, expect, it } from "vitest";
import { parseOrderMessage } from "@/lib/whatsapp-parse";
import { buildOrderMessage } from "@/lib/whatsapp";
import type { CartItem } from "@/lib/cart";
import { fixtureProducts } from "@/lib/__fixtures__/catalog";

const items: CartItem[] = [
  {
    slug: "normal",
    name: "Producto Normal",
    dose: "10 MG",
    price: 100,
    image: "/products/normal.webp",
    quantity: 2,
  },
  {
    slug: "agotado",
    name: "Producto Agotado",
    dose: "20 MG",
    price: 200,
    image: "/products/agotado.webp",
    quantity: 1,
  },
];

describe("parseOrderMessage", () => {
  it("mensaje intacto: reconoce los ítems y no encuentra datos del comprador", () => {
    const message = buildOrderMessage(items);
    const parsed = parseOrderMessage(message, fixtureProducts);

    expect(parsed.items).toEqual([
      { slug: "normal", quantity: 2 },
      { slug: "agotado", quantity: 1 },
    ]);
    expect(parsed.unmatched).toEqual([]);
    expect(parsed.code).toBeNull();
    expect(parsed.name).toBeNull();
    expect(parsed.city).toBeNull();
    expect(parsed.address).toBeNull();
  });

  it("mensaje con los datos completados y código: los reconoce todos", () => {
    const message = buildOrderMessage(items, {
      discountCode: "MAFE10",
      name: "Carla Comprador",
      city: "Santa Cruz",
      address: "Av. Siempre Viva 123",
    });

    const parsed = parseOrderMessage(message, fixtureProducts);

    expect(parsed.items).toEqual([
      { slug: "normal", quantity: 2 },
      { slug: "agotado", quantity: 1 },
    ]);
    expect(parsed.code).toBe("MAFE10");
    expect(parsed.name).toBe("Carla Comprador");
    expect(parsed.city).toBe("Santa Cruz");
    expect(parsed.address).toBe("Av. Siempre Viva 123");
  });

  it("sin código: code queda null", () => {
    const parsed = parseOrderMessage(buildOrderMessage(items), fixtureProducts);
    expect(parsed.code).toBeNull();
  });

  it("producto reescrito a mano (otra capitalización y espacios): igual matchea", () => {
    const parsed = parseOrderMessage(
      "•   producto normal   10  mg  x1 — Bs 100",
      fixtureProducts
    );
    expect(parsed.items).toEqual([{ slug: "normal", quantity: 1 }]);
    expect(parsed.unmatched).toEqual([]);
  });

  it("x2 pegado sin espacio: igual reconoce la cantidad", () => {
    const parsed = parseOrderMessage("• Producto Normal 10 MGx2 — Bs 200", fixtureProducts);
    expect(parsed.items).toEqual([{ slug: "normal", quantity: 2 }]);
  });

  it("dosis omitida: matchea por nombre solo", () => {
    const parsed = parseOrderMessage("• Producto Normal x1 — Bs 100", fixtureProducts);
    expect(parsed.items).toEqual([{ slug: "normal", quantity: 1 }]);
  });

  it("bullet cambiado de • a -: lo sigue reconociendo como ítem", () => {
    const parsed = parseOrderMessage("- Producto Normal 10 MG x1 — Bs 100", fixtureProducts);
    expect(parsed.items).toEqual([{ slug: "normal", quantity: 1 }]);
  });

  it("un producto que no existe en el catálogo va a unmatched, no se adivina", () => {
    const parsed = parseOrderMessage("• Colágeno en polvo x1 — Bs 200", fixtureProducts);
    expect(parsed.items).toEqual([]);
    expect(parsed.unmatched).toEqual(["• Colágeno en polvo x1 — Bs 200"]);
  });

  it("texto que no es un pedido: todo queda vacío, sin tirar error", () => {
    const parsed = parseOrderMessage("Hola, ¿tienen envíos a Sucre?", fixtureProducts);
    expect(parsed).toEqual({
      items: [],
      unmatched: [],
      code: null,
      name: null,
      city: null,
      address: null,
    });
  });

  it("acentos en forma NFD (típico de teclados iOS) igual matchean Dirección y Código", () => {
    // .normalize("NFD") descompone "ó" (U+00F3) en "o" (U+006F) + acento
    // combinante (U+0301) — lo que mandan algunos teclados. Sin el
    // normalize("NFC") de parseOrderMessage, este mensaje no matcheaba.
    const message = buildOrderMessage(items, {
      discountCode: "MAFE10",
      name: "Carla Comprador",
      city: "Cochabamba",
      address: "Av. Siempre Viva 123",
    }).normalize("NFD");

    const parsed = parseOrderMessage(message, fixtureProducts);

    expect(parsed.code).toBe("MAFE10");
    expect(parsed.city).toBe("Cochabamba");
    expect(parsed.address).toBe("Av. Siempre Viva 123");
  });

  it("suma cantidades cuando el mismo producto aparece en dos líneas", () => {
    const parsed = parseOrderMessage(
      "• Producto Normal 10 MG x1 — Bs 100\n• Producto Normal 10 MG x2 — Bs 200",
      fixtureProducts
    );
    expect(parsed.items).toEqual([{ slug: "normal", quantity: 3 }]);
  });
});
