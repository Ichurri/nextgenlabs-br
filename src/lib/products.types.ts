// Puro, sin I/O: importable desde componentes cliente (CatalogProvider,
// ProductCard, cart.ts, etc.). No importar products-data.ts desde acá ni
// desde ningún archivo que un componente cliente alcance — arrastra
// supabaseAdmin y con él la service key al bundle del navegador.

export type Product = {
  slug: string;
  name: string;
  dose: string;
  price: number; // em BRL; 0 = preço sob consulta
  purity: string;
  form: string;
  category: string; // nombre de la categoría, no id
  image: string;
  highlights: string[];
  description?: string;
  coaUrl?: string;
  featured: boolean;
  isNew: boolean;
  trackStock: boolean;
  stockQty: number;
};

export type Catalog = {
  products: Product[];
  categories: string[];
};

/** Sin seguimiento de stock: siempre disponible. Con seguimiento: disponible si stockQty > 0. */
export function isInStock(p: Product): boolean {
  return !p.trackStock || p.stockQty > 0;
}
