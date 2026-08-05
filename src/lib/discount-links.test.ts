import { describe, expect, it } from "vitest";
import { buildCodeShareUrl, buildCodeSalesUrl } from "@/lib/discount-links";
import { siteConfig } from "@/config/site";

describe("buildCodeShareUrl", () => {
  it("es absoluto y apunta al catálogo con el código en el query", () => {
    expect(buildCodeShareUrl("MAFE10")).toBe(`${siteConfig.url}/catalogo?codigo=MAFE10`);
  });

  it("escapa caracteres que romperían el query string", () => {
    expect(buildCodeShareUrl("MAFE&10")).toBe(`${siteConfig.url}/catalogo?codigo=MAFE%2610`);
  });
});

describe("buildCodeSalesUrl", () => {
  it("es absoluto y lleva el token en el path", () => {
    expect(buildCodeSalesUrl("abc123")).toBe(`${siteConfig.url}/mis-ventas/abc123`);
  });

  it("escapa el token para que no se salga del segmento de ruta", () => {
    expect(buildCodeSalesUrl("a/b")).toBe(`${siteConfig.url}/mis-ventas/a%2Fb`);
  });
});
