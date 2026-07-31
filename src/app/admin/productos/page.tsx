import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { getAdminCatalog, type AdminProduct } from "@/lib/products-data";
import { formatPrice } from "@/lib/format";
import { ProductArchiveToggle } from "@/components/admin/ProductArchiveToggle";
import { SortControls } from "@/components/admin/SortControls";

export const metadata: Metadata = {
  title: "Productos | Panel",
  robots: { index: false, follow: false },
};

export default async function AdminProductosPage() {
  await requireSession();
  const { products } = await getAdminCatalog();

  const active = products.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const archived = products.filter((p) => !p.isActive);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="focus-ring rounded text-sm text-muted hover:text-foreground">
            ← Pedidos
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Productos</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/categorias"
            className="focus-ring rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            Categorías
          </Link>
          <Link
            href="/admin/productos/nuevo"
            className="focus-ring rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      {active.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Todavía no creaste ningún producto.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
          {active.map((p, i) => (
            <ProductRow
              key={p.id}
              product={p}
              isFirst={i === 0}
              isLast={i === active.length - 1}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="focus-ring cursor-pointer rounded text-sm font-medium text-muted hover:text-foreground">
            Archivados ({archived.length})
          </summary>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
            {archived.map((p) => (
              // isFirst/isLast no importan acá: SortControls no se muestra
              // para productos archivados.
              <ProductRow key={p.id} product={p} isFirst isLast />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ProductRow({
  product,
  isFirst,
  isLast,
}: {
  product: AdminProduct;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="text-xs text-muted">
          {product.dose} · {product.category} ·{" "}
          {product.price > 0 ? formatPrice(product.price) : "A consultar"}
        </p>
      </div>
      {product.isActive && (
        <SortControls
          moveUpUrl={
            isFirst ? null : `/api/admin/productos/${product.id}?accion=mover&direction=up`
          }
          moveDownUrl={
            isLast ? null : `/api/admin/productos/${product.id}?accion=mover&direction=down`
          }
        />
      )}
      <Link
        href={`/admin/productos/${product.id}/editar`}
        className="focus-ring shrink-0 rounded text-sm text-accent-light hover:underline"
      >
        Editar
      </Link>
      <ProductArchiveToggle id={product.id} isActive={product.isActive} />
    </li>
  );
}
