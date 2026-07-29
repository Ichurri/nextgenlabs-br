import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateOrderTotals,
  generateOrderNumber,
  generateToken,
  OrderValidationError,
} from "@/lib/orders";

vi.mock("@/data/products", () => {
  const products = [
    {
      slug: "a",
      name: "Producto A",
      dose: "10 MG",
      price: 100,
      purity: "≥99% HPLC",
      form: "Liofilizado",
      category: "Péptidos",
      image: "/a.webp",
      highlights: [],
    },
    {
      slug: "b",
      name: "Producto B",
      dose: "5 MG",
      price: 50,
      purity: "≥99% HPLC",
      form: "Liofilizado",
      category: "Péptidos",
      image: "/b.webp",
      highlights: [],
    },
    {
      slug: "consulta",
      name: "Producto a consultar",
      dose: "1 MG",
      price: 0,
      purity: "≥99% HPLC",
      form: "Liofilizado",
      category: "Otros",
      image: "/c.webp",
      highlights: [],
    },
  ];
  return {
    getProductBySlug: (slug: string) => products.find((p) => p.slug === slug),
  };
});

describe("calculateOrderTotals", () => {
  it("calcula un ítem con cantidad 1", () => {
    const totals = calculateOrderTotals([{ slug: "a", quantity: 1 }]);
    expect(totals.subtotal).toBe(100);
    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0]).toMatchObject({ slug: "a", unitPrice: 100, quantity: 1, lineTotal: 100 });
  });

  it("suma varios ítems distintos", () => {
    const totals = calculateOrderTotals([
      { slug: "a", quantity: 1 },
      { slug: "b", quantity: 1 },
    ]);
    expect(totals.subtotal).toBe(150);
    expect(totals.lines).toHaveLength(2);
  });

  it("multiplica precio x cantidad cuando la cantidad es mayor a 1", () => {
    const totals = calculateOrderTotals([{ slug: "a", quantity: 3 }]);
    expect(totals.lines[0].lineTotal).toBe(300);
    expect(totals.subtotal).toBe(300);
  });

  it("rechaza un slug inexistente", () => {
    expect(() => calculateOrderTotals([{ slug: "no-existe", quantity: 1 }])).toThrow(
      OrderValidationError
    );
  });

  it("rechaza un producto con price === 0", () => {
    expect(() => calculateOrderTotals([{ slug: "consulta", quantity: 1 }])).toThrow(
      OrderValidationError
    );
  });

  it("suma el envío al total", () => {
    const totals = calculateOrderTotals([{ slug: "a", quantity: 1 }]);
    expect(totals.total).toBe(round2(totals.subtotal - totals.discount + totals.shipping));
    expect(totals.shipping).toBeGreaterThan(0);
  });

  it("el descuento nunca supera el subtotal y el total nunca baja del costo de envío", () => {
    const totals = calculateOrderTotals([{ slug: "b", quantity: 1 }], 999999);
    expect(totals.discount).toBe(totals.subtotal);
    expect(totals.total).toBe(totals.shipping);
  });
});

describe("calculateOrderTotals — umbral de envío gratis", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("el envío es 0 cuando el subtotal (post-descuento) alcanza el umbral", async () => {
    vi.doMock("@/config/shipping", () => ({
      SHIPPING: { nationalCost: 30, freeOver: 100, label: "Envío nacional" },
    }));
    const { calculateOrderTotals: calc } = await import("@/lib/orders");
    const totals = calc([{ slug: "a", quantity: 1 }]); // subtotal 100 === freeOver
    expect(totals.shipping).toBe(0);
  });

  it("el envío se cobra cuando el subtotal no alcanza el umbral", async () => {
    vi.doMock("@/config/shipping", () => ({
      SHIPPING: { nationalCost: 30, freeOver: 500, label: "Envío nacional" },
    }));
    const { calculateOrderTotals: calc } = await import("@/lib/orders");
    const totals = calc([{ slug: "a", quantity: 1 }]); // subtotal 100 < freeOver
    expect(totals.shipping).toBe(30);
  });

  it("con un descuento, el umbral se evalúa después de aplicarlo, no sobre el subtotal crudo", async () => {
    vi.doMock("@/config/shipping", () => ({
      SHIPPING: { nationalCost: 30, freeOver: 100, label: "Envío nacional" },
    }));
    const { calculateOrderTotals: calc } = await import("@/lib/orders");
    // subtotal crudo 150 ≥ freeOver, pero 150 - 60 = 90 < freeOver: se cobra envío.
    const totals = calc([{ slug: "a", quantity: 1 }, { slug: "b", quantity: 1 }], 60);
    expect(totals.subtotal).toBe(150);
    expect(totals.shipping).toBe(30);
  });
});

describe("generateOrderNumber", () => {
  it("respeta el formato NGL-YYMMDD-XXXX y el sufijo no usa 0, O, 1 ni I", () => {
    // Constructor local (no ISO-UTC) para no depender de la zona horaria.
    const orderNumber = generateOrderNumber(new Date(2026, 6, 27));
    expect(orderNumber).toMatch(/^NGL-260727-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  });

  it("dos llamadas seguidas difieren", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });
});

describe("generateToken", () => {
  it("genera 32 caracteres hexadecimales y dos llamadas seguidas difieren", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
