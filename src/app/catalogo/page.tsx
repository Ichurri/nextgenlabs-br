import type { Metadata } from "next";
import { CatalogClient } from "@/components/CatalogClient";
import { ApplyCodeFromUrl } from "@/components/ApplyCodeFromUrl";
import { getCatalog } from "@/lib/products-data";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Catálogo de peptídeos e combinações para pesquisa laboratorial. Preços em reais e pedidos pelo WhatsApp.",
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const { products, categories } = await getCatalog();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      {codigo && <ApplyCodeFromUrl code={codigo} />}
      <header className="mb-10">
        <p className="eyebrow mb-2">Catálogo</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Todos os compostos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Todos os produtos são{" "}
          <span className="font-medium text-foreground">
            destinados exclusivamente à pesquisa laboratorial
          </span>
          . Não destinados ao consumo humano. Os pedidos são combinados pelo WhatsApp.
        </p>
      </header>

      <CatalogClient products={products} categories={categories} />
    </div>
  );
}
