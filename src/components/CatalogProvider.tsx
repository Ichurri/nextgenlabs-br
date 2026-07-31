"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Catalog } from "@/lib/products.types";

const CatalogContext = createContext<Catalog | null>(null);

// Montado una sola vez en el layout raíz con el catálogo ya resuelto en el
// servidor (getCatalog(), cacheado). resolveCartItems() corre en el
// navegador y necesita esto para re-precificar el carrito sin volver a
// pegarle a la base.
export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: Catalog;
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) {
    throw new Error("useCatalog() se usó fuera de <CatalogProvider>.");
  }
  return catalog;
}
