/**
 * Catálogo de productos de Nextgen Labs.
 *
 * Datos extraídos de las fichas de marketing del cliente (mismos compuestos que
 * onyxresearch.shop). Las imágenes reales viven en /public/products/*.webp.
 *
 * Cómo editar:
 *  - Agregar/quitar objetos del array `products`.
 *  - `slug` debe ser único y en minúsculas con guiones (se usa en la URL /producto/[slug]).
 *  - `image` apunta a un archivo dentro de /public (ej. "/products/glow.webp").
 *  - `price` en Bs. Usa 0 para mostrar "Precio a consultar" (pedido por WhatsApp).
 *  - `highlights` son las viñetas de beneficios que se muestran en la ficha.
 *  - `coaUrl` es opcional: enlace al PDF del Certificado de Análisis del lote.
 */

export type ProductCategory = "Péptidos" | "Blends" | "SARMs" | "Otros";

export type Product = {
  slug: string;
  name: string;
  dose: string; // ej. "10 MG"
  price: number; // en Bs. 0 = "Precio a consultar"
  purity: string; // ej. "≥99% HPLC"
  form: string; // ej. "Liofilizado"
  category: ProductCategory;
  image: string; // ruta dentro de /public
  highlights: string[]; // viñetas de beneficios (español)
  description?: string; // párrafo opcional
  coaUrl?: string; // PLACEHOLDER: enlace al PDF del COA del lote
  featured?: boolean; // se muestra en el grid destacado del home
  inStock?: boolean; // default true (undefined = en stock)
  isNew?: boolean; // default false: muestra el badge "Nuevo"
};

/** `inStock` es opcional y por defecto true: solo `false` explícito marca "Agotado". */
export function isInStock(product: Product): boolean {
  return product.inStock !== false;
}

export const categories: ProductCategory[] = [
  "Péptidos",
  "Blends",
  "SARMs",
  "Otros",
];

export const products: Product[] = [
  {
    slug: "cjc-1295-no-dac-ipamorelin",
    name: "CJC 1295 No DAC + Ipamorelin",
    dose: "10 MG",
    price: 1700, // TODO: definir precio (la ficha no incluía precio)
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Blends",
    image: "/products/cjc.webp",
    highlights: [
      "Sinergia potente para maximizar la masa muscular limpia.",
      "Aceleración drástica de la recuperación física y del tejido muscular.",
      "Mejora la calidad del sueño profundo y la densidad ósea.",
    ],
    coaUrl: "/coa/cjc_coa.pdf",
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    dose: "100 MG",
    price: 1200,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/ghk-cu.webp",
    highlights: [
      "El péptido de cobre para la regeneración dérmica avanzada.",
      "Elasticidad infinita.",
      "Revierte el envejecimiento celular.",
      "Cicatrización acelerada y reparación de la barrera cutánea.",
      "Remodelación del tejido y potente efecto antioxidante.",
    ],
    coaUrl: "/coa/ghk_coa.pdf",
    featured: true,
  },
  {
    slug: "glow",
    name: "GLOW",
    dose: "70 MG",
    price: 2300,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Blends",
    image: "/products/glow.webp",
    highlights: [
      "Mejora la calidad de la piel proporcionando luminosidad desde el interior.",
      "Mayor hidratación y disminución de líneas de expresión.",
      "Recuperación física: acelera la reparación de músculos y articulaciones tras el ejercicio, disminuyendo el malestar general.",
      "Vitalidad celular: apoya la regeneración y el rejuvenecimiento biológico del organismo.",
    ],
    coaUrl: "/coa/glow_coa.pdf",
    featured: true,
  },
  {
    slug: "glp-3-rt",
    name: "GLP-3 RT (Retatrutide)",
    dose: "30 MG",
    price: 3300,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/glp.webp",
    highlights: [
      "El avance de triple acción en la pérdida de peso.",
      "Poderosa saciedad duradera (regulación del apetito a nivel central).",
      "Control glucémico total y optimización metabólica.",
      "Quema calórica acelerada dirigida a la grasa persistente.",
    ],
    coaUrl: "/coa/glp3_coa.pdf",
    featured: true,
  },
  {
    slug: "klow",
    name: "KLOW",
    dose: "80 MG",
    price: 2500,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Blends",
    image: "/products/klow.webp",
    highlights: [
      "Mayor producción de colágeno.",
      "Recuperación optimizada.",
      "Apoyo para tejidos y tendones.",
      "Favorece una respuesta antiinflamatoria equilibrada.",
    ],
    coaUrl: "/coa/klow_coa.pdf",
    featured: true,
  },
  {
    slug: "nad-plus",
    name: "NAD+",
    dose: "500 MG",
    price: 1900,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Otros",
    image: "/products/nadplus.webp",
    highlights: [
      "Energía celular pura: reactiva tus mitocondrias para eliminar el cansancio desde la raíz.",
      "Reparación de ADN: activa las sirtuinas para frenar el envejecimiento celular.",
      "Claridad mental: protege tus neuronas y elimina la \"niebla mental\", mejorando el enfoque.",
      "Máximo rendimiento: acelera la recuperación física y optimiza el metabolismo.",
    ],
    coaUrl: "/coa/nadq_coa.pdf",
    featured: true,
  },
  {
    slug: "selank",
    name: "Selank",
    dose: "5 MG",
    price: 900,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/selank.webp",
    highlights: [
      "Calma, serenidad y control mental.",
      "Reduce el estrés y la ansiedad sin causar somnolencia.",
      "Mantiene un estado de \"alerta relajado\" ideal para el día a día.",
      "Estabilidad emocional y mejora el estado de ánimo.",
    ],
    coaUrl: "/coa/selank_coa.pdf",
  },
  {
    slug: "semax",
    name: "Semax",
    dose: "5 MG",
    price: 900,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/semax.webp",
    highlights: [
      "Enfoque mental y neuroprotección.",
      "Claridad cognitiva inmediata y memoria mejorada.",
      "Aumento de la productividad bajo condiciones de estrés mental.",
      "Protección y regeneración de las neuronas (soporte nootrópico).",
    ],
    coaUrl: "/coa/semax_coa.pdf",
    featured: true,
  },
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    dose: "10 MG",
    price: 1700,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Péptidos",
    image: "/products/tesamorelin.webp",
    highlights: [
      "Reducción de grasa visceral y armonía hormonal.",
      "Estimula la producción natural de la hormona de crecimiento (GH).",
      "Ataque directo a la grasa abdominal persistente (grasa visceral).",
      "Promueve una composición corporal limpia y mejora la recuperación.",
    ],
    coaUrl: "/coa/tesamorelin_coa.pdf",
    featured: true,
  },
  {
    slug: "wolverine",
    name: "WOLVERINE (BPC-157 + TB-500)",
    dose: "10 MG",
    price: 1750,
    purity: "≥99% HPLC",
    form: "Liofilizado",
    category: "Blends",
    image: "/products/wolverine.webp",
    highlights: [
      "El factor de curación y regeneración total acelerada.",
      "Sanación ultrarrápida de tendones, ligamentos, articulaciones y músculos.",
      "Potente acción antiinflamatoria y reparación del tejido dañado.",
      "El combo definitivo para atletas de alto rendimiento y biohackers.",
    ],
    coaUrl: "/coa/wolverine_coa.pdf",
    featured: true,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

/** Productos de la misma categoría, excluyendo el actual, máximo 4. */
export function getRelatedProducts(product: Product, max = 4): Product[] {
  return products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, max);
}
