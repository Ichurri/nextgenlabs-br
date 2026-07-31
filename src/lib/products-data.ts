// Solo servidor: importa supabaseAdmin (service key). Nunca se importa desde
// un componente cliente ni desde products.types.ts — ver la trampa #1 del
// plan de Fase 10. Un error de "service role key is not defined" en la
// consola del navegador significa que algo rompió esta regla.
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Product, Catalog } from "@/lib/products.types";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["product_categories"]["Row"];

function mapProductRow(row: ProductRow, categoryName: string): Product {
  return {
    slug: row.slug,
    name: row.name,
    dose: row.dose,
    price: Number(row.price),
    purity: row.purity,
    form: row.form,
    category: categoryName,
    image: row.image,
    highlights: row.highlights,
    description: row.description ?? undefined,
    coaUrl: row.coa_url ?? undefined,
    featured: row.featured,
    isNew: row.is_new,
    trackStock: row.track_stock,
    stockQty: row.stock_qty,
  };
}

async function fetchCatalog(): Promise<Catalog> {
  const [{ data: categoryRows, error: categoriesError }, { data: productRows, error: productsError }] =
    await Promise.all([
      supabaseAdmin.from("product_categories").select("*").eq("is_active", true).order("sort_order"),
      supabaseAdmin.from("products").select("*").eq("is_active", true).order("sort_order"),
    ]);

  if (categoriesError) throw categoriesError;
  if (productsError) throw productsError;

  const categoryNameById = new Map((categoryRows ?? []).map((c) => [c.id, c.name]));

  return {
    products: (productRows ?? []).map((row) =>
      mapProductRow(row, categoryNameById.get(row.category_id) ?? "Otros")
    ),
    categories: (categoryRows ?? []).map((c) => c.name),
  };
}

/**
 * Catálogo público: solo productos y categorías activos, ordenados por
 * sort_order. Cacheado 1h y revalidado on-demand con revalidateTag('catalog')
 * — ese tag es el contrato de la Fase 10: todo route handler que muta
 * productos o categorías tiene que llamarlo (ver trampa #3 del plan).
 */
export const getCatalog = unstable_cache(fetchCatalog, ["catalog"], {
  tags: ["catalog"],
  revalidate: 3600,
});

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const { products } = await getCatalog();
  return products.filter((p) => p.featured);
}

/** Productos de la misma categoría, excluyendo el actual, máximo 4. */
export async function getRelatedProducts(product: Product, max = 4): Promise<Product[]> {
  const { products } = await getCatalog();
  return products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, max);
}

export type AdminProduct = Product & {
  id: string;
  categoryId: string;
  isActive: boolean;
  sortOrder: number;
  lowStockThreshold: number;
};

export type AdminCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

function mapCategoryRow(row: CategoryRow): AdminCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, isActive: row.is_active };
}

/**
 * Sin cache, incluye productos y categorías archivados — solo para el panel
 * (Bloques C, D y E). Nunca se usa para el sitio público.
 */
export async function getAdminCatalog(): Promise<{
  products: AdminProduct[];
  categories: AdminCategory[];
}> {
  const [{ data: categoryRows, error: categoriesError }, { data: productRows, error: productsError }] =
    await Promise.all([
      supabaseAdmin.from("product_categories").select("*").order("sort_order"),
      supabaseAdmin.from("products").select("*").order("sort_order"),
    ]);

  if (categoriesError) throw categoriesError;
  if (productsError) throw productsError;

  const categoryNameById = new Map((categoryRows ?? []).map((c) => [c.id, c.name]));

  return {
    products: (productRows ?? []).map((row) => ({
      ...mapProductRow(row, categoryNameById.get(row.category_id) ?? "Otros"),
      id: row.id,
      categoryId: row.category_id,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      lowStockThreshold: row.low_stock_threshold,
    })),
    categories: (categoryRows ?? []).map(mapCategoryRow),
  };
}
