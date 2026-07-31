import { describe, expect, it } from "vitest";
import { productFieldsSchema, archiveProductSchema } from "@/lib/product.schema";

const validProduct = {
  slug: "ghk-cu",
  name: "GHK-Cu",
  dose: "100 MG",
  price: 1200,
  purity: "≥99% HPLC",
  form: "Liofilizado",
  categoryId: "5a8c484b-f177-4b36-9799-12c3aef3148e",
  image: "/products/ghk-cu.webp",
  highlights: ["Beneficio uno"],
  featured: false,
  isNew: false,
  trackStock: true,
};

describe("productFieldsSchema", () => {
  it("acepta un producto completo válido", () => {
    const result = productFieldsSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("normaliza el slug a minúsculas", () => {
    const result = productFieldsSchema.safeParse({ ...validProduct, slug: "GHK-Cu" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.slug).toBe("ghk-cu");
  });

  it.each([
    ["espacios", "ghk cu"],
    ["guion al final", "ghk-"],
    ["guion doble", "ghk--cu"],
    ["guion al principio", "-ghk-cu"],
    ["vacío", ""],
  ])("rechaza un slug con %s", (_label, slug) => {
    const result = productFieldsSchema.safeParse({ ...validProduct, slug });
    expect(result.success).toBe(false);
  });

  it("rechaza un categoryId que no es uuid", () => {
    const result = productFieldsSchema.safeParse({ ...validProduct, categoryId: "no-es-un-uuid" });
    expect(result.success).toBe(false);
  });

  it("acepta price = 0 (precio a consultar)", () => {
    const result = productFieldsSchema.safeParse({ ...validProduct, price: 0 });
    expect(result.success).toBe(true);
  });

  it("rechaza un price negativo", () => {
    const result = productFieldsSchema.safeParse({ ...validProduct, price: -1 });
    expect(result.success).toBe(false);
  });

  it("rechaza highlights vacío", () => {
    const result = productFieldsSchema.safeParse({ ...validProduct, highlights: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza más de 6 highlights", () => {
    const result = productFieldsSchema.safeParse({
      ...validProduct,
      highlights: ["1", "2", "3", "4", "5", "6", "7"],
    });
    expect(result.success).toBe(false);
  });

  it("acepta exactamente 6 highlights", () => {
    const result = productFieldsSchema.safeParse({
      ...validProduct,
      highlights: ["1", "2", "3", "4", "5", "6"],
    });
    expect(result.success).toBe(true);
  });

  it("description y coaUrl vacíos se guardan como undefined, no como string vacío", () => {
    const result = productFieldsSchema.safeParse({ ...validProduct, description: "", coaUrl: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.coaUrl).toBeUndefined();
    }
  });

  it("description y coaUrl con contenido se conservan", () => {
    const result = productFieldsSchema.safeParse({
      ...validProduct,
      description: "Un párrafo.",
      coaUrl: "/coa/ghk_coa.pdf",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Un párrafo.");
      expect(result.data.coaUrl).toBe("/coa/ghk_coa.pdf");
    }
  });

  it("rechaza name, dose, purity o form vacíos", () => {
    for (const field of ["name", "dose", "purity", "form"] as const) {
      const result = productFieldsSchema.safeParse({ ...validProduct, [field]: "" });
      expect(result.success, `${field} vacío debería rechazarse`).toBe(false);
    }
  });
});

describe("archiveProductSchema", () => {
  it("acepta isActive true o false", () => {
    expect(archiveProductSchema.safeParse({ isActive: true }).success).toBe(true);
    expect(archiveProductSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("rechaza un isActive que no es boolean", () => {
    expect(archiveProductSchema.safeParse({ isActive: "true" }).success).toBe(false);
    expect(archiveProductSchema.safeParse({}).success).toBe(false);
  });
});
