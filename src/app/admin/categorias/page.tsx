import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { getAdminCatalog } from "@/lib/products-data";
import { CategoryList } from "@/components/admin/CategoryList";

export const metadata: Metadata = {
  title: "Categorías | Panel",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriasPage() {
  await requireSession();
  const { categories } = await getAdminCatalog();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin/productos"
        className="focus-ring rounded text-sm text-muted hover:text-foreground"
      >
        ← Productos
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Categorías</h1>
      <div className="mt-6">
        <CategoryList categories={categories} />
      </div>
    </div>
  );
}
