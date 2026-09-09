import type { Catalog, Product } from "@/lib/products.types";

// Fixture compartido por cart.test.ts, whatsapp-parse.test.ts y
// orders.test.ts (Fase 10): tres productos alcanzan para cubrir los tres
// estados que la lógica de negocio distingue. Los tests dejan de romperse
// cuando el dueño cambia un precio real del catálogo.
export const normalProduct: Product = {
  slug: "normal",
  name: "Producto Normal",
  dose: "10 MG",
  price: 100,
  purity: "≥99% HPLC",
  form: "Liofilizado",
  category: "Péptidos",
  image: "/products/normal.webp",
  highlights: ["Highlight uno"],
  featured: false,
  isNew: false,
  trackStock: true,
  stockQty: 10,
};

export const agotadoProduct: Product = {
  slug: "agotado",
  name: "Producto Agotado",
  dose: "20 MG",
  price: 200,
  purity: "≥99% HPLC",
  form: "Liofilizado",
  category: "Otros",
  image: "/products/agotado.webp",
  highlights: ["Highlight agotado"],
  featured: false,
  isNew: false,
  trackStock: true,
  stockQty: 0,
};

export const consultaProduct: Product = {
  slug: "consulta",
  name: "Producto A Consultar",
  dose: "1 MG",
  price: 0,
  purity: "≥99% HPLC",
  form: "Liofilizado",
  category: "Blends",
  image: "/products/consulta.webp",
  highlights: ["Highlight consulta"],
  featured: false,
  isNew: false,
  trackStock: false,
  stockQty: 0,
};

export const fixtureProducts: Product[] = [normalProduct, agotadoProduct, consultaProduct];

export const fixtureCatalog: Catalog = {
  products: fixtureProducts,
  categories: ["Péptidos", "Blends", "Otros"],
};
