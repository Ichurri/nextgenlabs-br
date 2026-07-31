import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { StockMovementList } from "@/components/admin/StockMovementList";

export const metadata: Metadata = {
  title: "Stock | Panel",
  robots: { index: false, follow: false },
};

export default async function ProductoStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const [{ data: product }, { data: movements }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, slug, stock_qty, track_stock, low_stock_threshold")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("stock_movements")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!product) notFound();

  const stockClass =
    product.stock_qty <= 0
      ? "text-danger"
      : product.stock_qty <= product.low_stock_threshold
        ? "text-warning"
        : "text-foreground";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/admin/productos/${id}/editar`}
        className="focus-ring rounded text-sm text-muted hover:text-foreground"
      >
        ← {product.name}
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Stock — {product.name}</h1>

      {!product.track_stock ? (
        <p className="mt-4 text-sm text-muted">
          Este producto no controla stock. Activá &ldquo;Controlar stock&rdquo; desde
          Editar si querés empezar a registrarlo.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Stock actual: <span className={`font-semibold ${stockClass}`}>{product.stock_qty}</span>
            {product.stock_qty < 0 && " — revisá el inventario"}
          </p>

          <div className="mt-6">
            <StockAdjustForm productId={id} />
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Historial</h2>
        <StockMovementList movements={movements ?? []} />
      </div>
    </div>
  );
}
