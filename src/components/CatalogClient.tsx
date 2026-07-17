"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { categories, type Product } from "@/data/products";

type SortKey = "nombre" | "precio-asc" | "precio-desc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "nombre", label: "Nombre (A–Z)" },
  { value: "precio-asc", label: "Precio (menor a mayor)" },
  { value: "precio-desc", label: "Precio (mayor a menor)" },
];

export function CatalogClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [sort, setSort] = useState<SortKey>("nombre");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = products.filter((p) => {
      const matchesCategory =
        activeCategory === "Todos" || p.category === activeCategory;
      const matchesQuery = q === "" || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    result.sort((a, b) => {
      if (sort === "precio-asc") return a.price - b.price;
      if (sort === "precio-desc") return b.price - a.price;
      return a.name.localeCompare(b.name, "es");
    });

    return result;
  }, [products, query, activeCategory, sort]);

  const tabs = ["Todos", ...categories];

  return (
    <div>
      {/* Buscador + orden */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar productos"
            className="focus-ring w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Ordenar"
          className="focus-ring rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categorías */}
      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            className={`focus-ring rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeCategory === tab
                ? "border-accent bg-accent text-white"
                : "border-border text-muted hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted">
          No se encontraron productos para tu búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
