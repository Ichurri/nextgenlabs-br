import type { Metadata } from "next";
import { CatalogClient } from "@/components/CatalogClient";
import { ApplyCodeFromUrl } from "@/components/ApplyCodeFromUrl";
import { getCatalog } from "@/lib/products-data";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Catálogo de péptidos, blends y SARMs para uso exclusivo de investigación. Pureza verificada y respaldada por COA.",
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
          Todos los compuestos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Todos los productos son{" "}
          <span className="font-medium text-foreground">
            exclusivamente para uso de investigación
          </span>
          . No aptos para consumo humano. Los pedidos se coordinan por WhatsApp.
        </p>
      </header>

      <CatalogClient products={products} categories={categories} />
    </div>
  );
}
