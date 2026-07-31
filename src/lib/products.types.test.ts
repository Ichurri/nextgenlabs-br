import { describe, expect, it } from "vitest";
import { isInStock, type Product } from "@/lib/products.types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    slug: "test-product",
    name: "Test Product",
    dose: "10 MG",
    price: 100,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/test.webp",
    highlights: ["Highlight uno"],
    featured: false,
    isNew: false,
    trackStock: true,
    stockQty: 10,
    ...overrides,
  };
}

describe("isInStock", () => {
  it("con trackStock=false siempre está disponible, sin importar stockQty", () => {
    expect(isInStock(makeProduct({ trackStock: false, stockQty: 0 }))).toBe(true);
    expect(isInStock(makeProduct({ trackStock: false, stockQty: -5 }))).toBe(true);
  });

  it("con trackStock=true y stockQty > 0 está disponible", () => {
    expect(isInStock(makeProduct({ trackStock: true, stockQty: 1 }))).toBe(true);
  });

  it("con trackStock=true y stockQty = 0 no está disponible", () => {
    expect(isInStock(makeProduct({ trackStock: true, stockQty: 0 }))).toBe(false);
  });

  it("con trackStock=true y stockQty negativo no está disponible", () => {
    expect(isInStock(makeProduct({ trackStock: true, stockQty: -3 }))).toBe(false);
  });
});
