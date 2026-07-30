import { describe, expect, it } from "vitest";
import { parseOrderMessage } from "@/lib/whatsapp-parse";
import { buildOrderMessage } from "@/lib/whatsapp";
import type { CartItem } from "@/lib/cart";

const items: CartItem[] = [
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    dose: "10 MG",
    price: 1700,
    image: "/products/tesamorelin.webp",
    quantity: 2,
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

describe("parseOrderMessage", () => {
  it("mensaje intacto: reconoce los ítems y no encuentra datos del comprador", () => {
    const message = buildOrderMessage(items);
    const parsed = parseOrderMessage(message);

    expect(parsed.items).toEqual([
      { slug: "tesamorelin", quantity: 2 },
      { slug: "nad-plus", quantity: 1 },
    ]);
    expect(parsed.unmatched).toEqual([]);
    expect(parsed.code).toBeNull();
    expect(parsed.name).toBeNull();
    expect(parsed.city).toBeNull();
    expect(parsed.address).toBeNull();
  });

  it("mensaje con los datos completados y código: los reconoce todos", () => {
    const message = buildOrderMessage(items, "MAFE10")
      .replace("Nombre:", "Nombre: Carla Comprador")
      .replace("Ciudad:", "Ciudad: Santa Cruz")
      .replace("Dirección:", "Dirección: Av. Siempre Viva 123");

    const parsed = parseOrderMessage(message);

    expect(parsed.items).toEqual([
      { slug: "tesamorelin", quantity: 2 },
      { slug: "nad-plus", quantity: 1 },
    ]);
    expect(parsed.code).toBe("MAFE10");
    expect(parsed.name).toBe("Carla Comprador");
    expect(parsed.city).toBe("Santa Cruz");
    expect(parsed.address).toBe("Av. Siempre Viva 123");
  });

  it("sin código: code queda null", () => {
    const parsed = parseOrderMessage(buildOrderMessage(items));
    expect(parsed.code).toBeNull();
  });

  it("producto reescrito a mano (otra capitalización y espacios): igual matchea", () => {
    const parsed = parseOrderMessage("•   tesamorelin   10  mg  x1 — Bs 1700");
    expect(parsed.items).toEqual([{ slug: "tesamorelin", quantity: 1 }]);
    expect(parsed.unmatched).toEqual([]);
  });

  it("x2 pegado sin espacio: igual reconoce la cantidad", () => {
    const parsed = parseOrderMessage("• Tesamorelin 10 MGx2 — Bs 3400");
    expect(parsed.items).toEqual([{ slug: "tesamorelin", quantity: 2 }]);
  });

  it("dosis omitida: matchea por nombre solo", () => {
    const parsed = parseOrderMessage("• Tesamorelin x1 — Bs 1700");
    expect(parsed.items).toEqual([{ slug: "tesamorelin", quantity: 1 }]);
  });

  it("bullet cambiado de • a -: lo sigue reconociendo como ítem", () => {
    const parsed = parseOrderMessage("- Tesamorelin 10 MG x1 — Bs 1700");
    expect(parsed.items).toEqual([{ slug: "tesamorelin", quantity: 1 }]);
  });

  it("un producto que no existe en el catálogo va a unmatched, no se adivina", () => {
    const parsed = parseOrderMessage("• Colágeno en polvo x1 — Bs 200");
    expect(parsed.items).toEqual([]);
    expect(parsed.unmatched).toEqual(["• Colágeno en polvo x1 — Bs 200"]);
  });

  it("texto que no es un pedido: todo queda vacío, sin tirar error", () => {
    const parsed = parseOrderMessage("Hola, ¿tienen envíos a Sucre?");
    expect(parsed).toEqual({
      items: [],
      unmatched: [],
      code: null,
      name: null,
      city: null,
      address: null,
    });
  });

  it("suma cantidades cuando el mismo producto aparece en dos líneas", () => {
    const parsed = parseOrderMessage(
      "• Tesamorelin 10 MG x1 — Bs 1700\n• Tesamorelin 10 MG x2 — Bs 3400"
    );
    expect(parsed.items).toEqual([{ slug: "tesamorelin", quantity: 3 }]);
  });
});
