import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminCatalog } from "@/lib/products-data";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ProductFields } from "@/lib/product.schema";

export const metadata: Metadata = {
  title: "Editar producto | Panel",
  robots: { index: false, follow: false },
};

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const [{ data: row }, { categories }] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("id", id).maybeSingle(),
    getAdminCatalog(),
  ]);

  if (!row) notFound();

  const initialValues: ProductFields = {
    slug: row.slug,
    name: row.name,
    dose: row.dose,
    price: Number(row.price),
    purity: row.purity,
    form: row.form,
    categoryId: row.category_id,
    image: row.image,
    highlights: row.highlights,
    description: row.description ?? undefined,
    coaUrl: row.coa_url ?? undefined,
    featured: row.featured,
    isNew: row.is_new,
    trackStock: row.track_stock,
  };

  // Incluye la categoría actual aunque esté archivada: si el producto quedó
  // apuntando a una categoría que después se archivó, el select no puede
  // quedar sin la opción seleccionada.
  const availableCategories = categories.filter(
    (c) => c.isActive || c.id === row.category_id
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/admin/productos" className="focus-ring rounded text-sm text-muted hover:text-foreground">
        ← Productos
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Editar {row.name}</h1>
      <div className="mt-6">
        <ProductForm
          mode="edit"
          productId={id}
          categories={availableCategories}
          initialValues={initialValues}
        />
      </div>
    </div>
  );
}
