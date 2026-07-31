import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { getAdminCatalog } from "@/lib/products-data";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Nuevo producto | Panel",
  robots: { index: false, follow: false },
};

export default async function NuevoProductoPage() {
  await requireSession();
  const { categories } = await getAdminCatalog();
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/admin/productos" className="focus-ring rounded text-sm text-muted hover:text-foreground">
        ← Productos
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Nuevo producto</h1>
      <div className="mt-6">
        <ProductForm mode="create" categories={activeCategories} />
      </div>
    </div>
  );
}
