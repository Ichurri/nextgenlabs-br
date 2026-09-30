"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products.types";

type SortKey = "catalogo" | "nombre" | "precio-asc" | "precio-desc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "catalogo", label: "Ordem do catálogo" },
  { value: "nombre", label: "Nombre (A–Z)" },
  { value: "precio-asc", label: "Preço (menor para maior)" },
  { value: "precio-desc", label: "Preço (maior para menor)" },
];

export function CatalogClient({
  products,
  categories,
}: {
  products: Product[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [sort, setSort] = useState<SortKey>("catalogo");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = products.filter((p) => {
      const matchesCategory =
        activeCategory === "Todos" || p.category === activeCategory;
      const matchesQuery =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.highlights.some((h) => h.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });

    // "catalogo": no reordena — `products` ya viene ordenado por sort_order
    // desde getCatalog() (Fase 10, orden manual del dueño).
    if (sort === "precio-asc") {
      result.sort((a, b) => {
        // Precio 0 = "a consultar": va al final, no es el más barato.
        const priceA = a.price === 0 ? Infinity : a.price;
        const priceB = b.price === 0 ? Infinity : b.price;
        return priceA - priceB;
      });
    } else if (sort === "precio-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === "nombre") {
      result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }

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
            placeholder="Buscar por nome, categoria ou característica…"
            aria-label="Buscar produtos"
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
          Nenhum produto encontrado para sua busca.
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
