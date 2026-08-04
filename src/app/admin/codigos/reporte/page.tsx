import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reporte de códigos | Panel",
  robots: { index: false, follow: false },
};

export default async function ReporteCodigosPage() {
  await requireSession();

  const { data, error } = await supabaseAdmin.from("discount_code_attribution").select("*");
  // Igual que /admin/codigos: la vista marca estas columnas nullable por el
  // join, pero en la práctica nunca lo son — vienen siempre de una fila real.
  const codes = (data ?? []).filter(
    (c): c is typeof c & { id: string; code: string; owner_label: string } =>
      c.id !== null && c.code !== null && c.owner_label !== null
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/admin/codigos"
        className="focus-ring rounded text-sm text-muted hover:text-foreground"
      >
        ← Códigos de descuento
      </Link>
      <h1 className="mt-1 text-xl font-semibold">Reporte de códigos</h1>
      <p className="mt-2 max-w-2xl text-xs text-muted">
        Cada pedido de la lista es una venta cobrada: &ldquo;Generados&rdquo; y
        &ldquo;Pagados&rdquo; solo difieren por pedidos históricos que quedaron sin cobrar.
      </p>

      {error ? (
        <p className="mt-8 text-sm text-danger">No pudimos cargar el reporte.</p>
      ) : codes.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Todavía no hay códigos.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">De quién</th>
                <th className="px-4 py-3 text-right font-medium">Generados</th>
                <th className="px-4 py-3 text-right font-medium">Descuento (generado)</th>
                <th className="px-4 py-3 text-right font-medium">Pagados</th>
                <th className="px-4 py-3 text-right font-medium">Facturado (pagado)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3 text-muted">{c.owner_label}</td>
                  <td className="px-4 py-3 text-right">{c.redemption_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(Number(c.discount_total ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-right">{c.paid_redemption_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(Number(c.paid_revenue_total ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
