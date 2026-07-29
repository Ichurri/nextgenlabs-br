import { describe, expect, it } from "vitest";
import { normalizeCode, evaluateDiscount, type DiscountCode } from "@/lib/discounts";

const NOW = new Date("2026-07-29T12:00:00Z");

function makeCode(overrides: Partial<DiscountCode> = {}): DiscountCode {
  return {
    id: "code-1",
    code: "MAFE10",
    type: "percent",
    value: 10,
    ownerLabel: "María Fernanda — IG @mafe",
    isActive: true,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    minOrderTotal: null,
    maxDiscount: null,
    ...overrides,
  };
}

describe("normalizeCode", () => {
  it('"  mafe10 " → "MAFE10"', () => {
    expect(normalizeCode("  mafe10 ")).toBe("MAFE10");
  });

  it('"Mafe 10" → "MAFE10" (espacios internos fuera)', () => {
    expect(normalizeCode("Mafe 10")).toBe("MAFE10");
  });
});

describe("evaluateDiscount", () => {
  it("code null → not_found", () => {
    const result = evaluateDiscount(null, 3600, NOW);
    expect(result).toMatchObject({ valid: false, reason: "not_found" });
  });

  it("is_active false → inactive", () => {
    const result = evaluateDiscount(makeCode({ isActive: false }), 3600, NOW);
    expect(result).toMatchObject({ valid: false, reason: "inactive" });
  });

  it("starts_at en el futuro → not_started", () => {
    const result = evaluateDiscount(
      makeCode({ startsAt: "2026-08-01T00:00:00Z" }),
      3600,
      NOW
    );
    expect(result).toMatchObject({ valid: false, reason: "not_started" });
  });

  it("expires_at en el pasado → expired", () => {
    const result = evaluateDiscount(
      makeCode({ expiresAt: "2026-06-30T00:00:00Z" }),
      3600,
      NOW
    );
    expect(result).toMatchObject({ valid: false, reason: "expired" });
  });

  it("used_count === max_uses → exhausted", () => {
    const result = evaluateDiscount(
      makeCode({ maxUses: 100, usedCount: 100 }),
      3600,
      NOW
    );
    expect(result).toMatchObject({ valid: false, reason: "exhausted" });
  });

  it("max_uses null con used_count 9999 → válido", () => {
    const result = evaluateDiscount(
      makeCode({ maxUses: null, usedCount: 9999 }),
      3600,
      NOW
    );
    expect(result.valid).toBe(true);
  });

  it("subtotal < min_order_total → below_minimum", () => {
    const result = evaluateDiscount(makeCode({ minOrderTotal: 500 }), 300, NOW);
    expect(result).toMatchObject({ valid: false, reason: "below_minimum" });
  });

  it("percent 10% sobre 3600 → 360", () => {
    const result = evaluateDiscount(makeCode({ type: "percent", value: 10 }), 3600, NOW);
    expect(result).toMatchObject({ valid: true, amount: 360 });
  });

  it("percent con max_discount: 200 sobre 3600 → 200 (aplica el tope)", () => {
    const result = evaluateDiscount(
      makeCode({ type: "percent", value: 10, maxDiscount: 200 }),
      3600,
      NOW
    );
    expect(result).toMatchObject({ valid: true, amount: 200 });
  });

  it("fixed 150 sobre 3600 → 150", () => {
    const result = evaluateDiscount(makeCode({ type: "fixed", value: 150 }), 3600, NOW);
    expect(result).toMatchObject({ valid: true, amount: 150 });
  });

  it("fixed 5000 sobre un subtotal de 3600 → 3600, nunca 5000", () => {
    const result = evaluateDiscount(makeCode({ type: "fixed", value: 5000 }), 3600, NOW);
    expect(result).toMatchObject({ valid: true, amount: 3600 });
  });

  it("el descuento no cambia el costo de envío (la función ni lo conoce)", () => {
    const result = evaluateDiscount(makeCode({ type: "fixed", value: 150 }), 3600, NOW);
    expect(result).not.toHaveProperty("shipping");
  });

  it("redondeo: percent 7% sobre 1725 sale limpio, sin colas de float", () => {
    const result = evaluateDiscount(makeCode({ type: "percent", value: 7 }), 1725, NOW);
    expect(result).toMatchObject({ valid: true, amount: 120.75 });
  });

  it("guardarraíl: un percent con value fuera de rango igual topa al subtotal", () => {
    // El constraint de la base bloquea value > 50 en la práctica, pero si
    // alguien lo mete saltándose el constraint, evaluateDiscount igual no
    // puede devolver más que el subtotal.
    const result = evaluateDiscount(makeCode({ type: "percent", value: 100 }), 3600, NOW);
    expect(result).toMatchObject({ valid: true, amount: 3600 });
  });
});
