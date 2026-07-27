import { describe, expect, it } from "vitest";
import { round2 } from "@/lib/money";

describe("round2", () => {
  it("corrige el error de punto flotante de 0.1 + 0.2", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it("redondea negativos correctamente", () => {
    expect(round2(-0.1)).toBe(-0.1);
    expect(round2(-15.555)).toBe(-15.55);
  });

  it("deja los enteros intactos", () => {
    expect(round2(1700)).toBe(1700);
    expect(round2(0)).toBe(0);
  });

  it("redondea a 2 decimales", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(19.999)).toBe(20);
  });
});
